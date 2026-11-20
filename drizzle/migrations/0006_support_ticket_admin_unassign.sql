CREATE OR REPLACE FUNCTION public.admin_update_ticket(_ticket_id uuid, _status public.support_status, _assign_to_me boolean, _unassign boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _assign_to_me AND _unassign THEN RAISE EXCEPTION 'Choose either assign or unassign'; END IF;
  UPDATE public.support_tickets SET
    status = COALESCE(_status, status),
    assigned_admin_id = CASE WHEN _assign_to_me THEN auth.uid() WHEN _unassign THEN NULL ELSE assigned_admin_id END,
    resolved_at = CASE WHEN COALESCE(_status, status) IN ('resolved','closed') THEN COALESCE(resolved_at, now()) ELSE NULL END,
    updated_at = now()
  WHERE id = _ticket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_update_ticket(uuid, public.support_status, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_ticket(uuid, public.support_status, boolean, boolean) TO authenticated;