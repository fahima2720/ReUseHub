CREATE TYPE public.support_category AS ENUM ('account','listing','report_user','bug','other');
CREATE TYPE public.support_status AS ENUM ('open','in_progress','resolved','closed');

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category public.support_category NOT NULL,
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 5 AND 100),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 2000),
  related_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  status public.support_status NOT NULL DEFAULT 'open',
  assigned_admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_has_unread boolean NOT NULL DEFAULT false,
  admin_has_unread boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX support_tickets_user_idx ON public.support_tickets(user_id, updated_at DESC);
CREATE INDEX support_tickets_status_idx ON public.support_tickets(status, updated_at DESC);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 2 AND 2000),
  is_internal_note boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_ticket_idx ON public.support_messages(ticket_id, created_at);

GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin reads tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users open own tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'open' AND assigned_admin_id IS NULL);

CREATE POLICY "Owner reads public messages, admin reads all" ON public.support_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (NOT is_internal_note AND EXISTS (
    SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())));
CREATE POLICY "Users reply on own open tickets" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND NOT is_internal_note AND EXISTS (
    SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid() AND t.status <> 'closed'));
CREATE POLICY "Admins post messages" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.support_tickets_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.support_tickets WHERE user_id = NEW.user_id AND created_at > now() - interval '24 hours') >= 5 THEN
    RAISE EXCEPTION 'You can open up to 5 support tickets per 24 hours.' USING ERRCODE = 'P0001';
  END IF;
  NEW.subject := btrim(NEW.subject);
  NEW.description := btrim(NEW.description);
  NEW.user_has_unread := false;
  NEW.admin_has_unread := true;
  NEW.resolved_at := NULL;
  NEW.created_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER support_tickets_before_insert BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.support_tickets_before_insert();

CREATE OR REPLACE FUNCTION public.support_messages_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF NEW.sender_id = _owner THEN
    UPDATE public.support_tickets SET updated_at = now(), admin_has_unread = true,
      status = CASE WHEN status = 'resolved' THEN 'open'::support_status ELSE status END,
      resolved_at = CASE WHEN status = 'resolved' THEN NULL ELSE resolved_at END
    WHERE id = NEW.ticket_id;
  ELSIF NOT NEW.is_internal_note THEN
    UPDATE public.support_tickets SET updated_at = now(), user_has_unread = true,
      status = CASE WHEN status = 'open' THEN 'in_progress'::support_status ELSE status END
    WHERE id = NEW.ticket_id;
  ELSE
    UPDATE public.support_tickets SET updated_at = now() WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER support_messages_after_insert AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.support_messages_after_insert();

CREATE OR REPLACE FUNCTION public.admin_update_ticket(_ticket_id uuid, _status public.support_status, _assign_to_me boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.support_tickets SET
    status = COALESCE(_status, status),
    assigned_admin_id = CASE WHEN _assign_to_me THEN auth.uid() ELSE assigned_admin_id END,
    resolved_at = CASE WHEN COALESCE(_status, status) IN ('resolved','closed') THEN COALESCE(resolved_at, now()) ELSE NULL END,
    updated_at = now()
  WHERE id = _ticket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.mark_ticket_read(_ticket_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.support_tickets SET user_has_unread = false WHERE id = _ticket_id AND user_id = auth.uid();
  IF public.has_role(auth.uid(),'admin') THEN
    UPDATE public.support_tickets SET admin_has_unread = false WHERE id = _ticket_id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.admin_update_ticket(uuid, public.support_status, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_ticket_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_ticket(uuid, public.support_status, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_ticket_read(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.support_tickets_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.support_messages_after_insert() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_stats()
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorized'; end if;
  return json_build_object(
    'users', (select count(*) from public.profiles),
    'listings', (select count(*) from public.listings),
    'sale', (select count(*) from public.listings where listing_type = 'sale'),
    'donation', (select count(*) from public.listings where listing_type = 'donation'),
    'inquiries', (select count(*) from public.inquiries),
    'pending_reports', (select count(*) from public.reports where status = 'pending'),
    'open_tickets', (select count(*) from public.support_tickets where status in ('open','in_progress'))
  );
end $function$;