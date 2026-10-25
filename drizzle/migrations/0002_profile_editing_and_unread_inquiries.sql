ALTER TABLE public.inquiries ADD COLUMN read_at timestamptz NULL;

REVOKE UPDATE ON public.inquiries FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.mark_inquiry_read(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.inquiries
  SET read_at = now()
  WHERE id = _id AND recipient_id = auth.uid() AND read_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.mark_inquiry_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_inquiry_read(uuid) TO authenticated;

REVOKE UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (full_name, phone, location) ON public.profiles TO authenticated;