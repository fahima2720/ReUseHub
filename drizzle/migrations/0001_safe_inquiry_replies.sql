ALTER TABLE public.inquiries ADD COLUMN reply_to_id uuid REFERENCES public.inquiries(id) ON DELETE CASCADE;
CREATE INDEX inquiries_reply_to_idx ON public.inquiries(reply_to_id);
CREATE OR REPLACE FUNCTION public.inquiries_prepare()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; parent record;
BEGIN
  IF auth.uid() IS NULL OR new.sender_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Sender must be the signed-in user'; END IF;
  SELECT owner_id, status INTO l FROM public.listings WHERE id = new.listing_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF l.owner_id IS NULL THEN RAISE EXCEPTION 'This is a sample listing and cannot be contacted'; END IF;
  IF l.status <> 'available' THEN RAISE EXCEPTION 'This listing is no longer available'; END IF;
  IF new.reply_to_id IS NOT NULL THEN
    SELECT listing_id, sender_id, recipient_id INTO parent FROM public.inquiries WHERE id = new.reply_to_id;
    IF NOT FOUND OR parent.recipient_id IS DISTINCT FROM auth.uid() OR parent.listing_id IS DISTINCT FROM new.listing_id THEN RAISE EXCEPTION 'You may only reply to a message received for this listing'; END IF;
    new.recipient_id := parent.sender_id;
  ELSE
    IF l.owner_id = new.sender_id THEN RAISE EXCEPTION 'You cannot send an inquiry about your own listing'; END IF;
    new.recipient_id := l.owner_id;
  END IF;
  IF new.sender_id = new.recipient_id THEN RAISE EXCEPTION 'You cannot message yourself'; END IF;
  new.message := trim(new.message);
  RETURN new;
END $$;
COMMENT ON COLUMN public.inquiries.reply_to_id IS 'Optional received message being replied to; trigger derives recipient and verifies participants and available listing.';