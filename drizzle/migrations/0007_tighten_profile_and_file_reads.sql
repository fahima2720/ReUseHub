DROP POLICY IF EXISTS "Profiles are publicly readable (limited columns)" ON public.profiles;
REVOKE SELECT ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE SELECT (phone) ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, full_name, location, created_at) ON TABLE public.profiles TO anon, authenticated;
CREATE POLICY "Profiles visible to relevant users" ON public.profiles FOR SELECT TO anon, authenticated USING (
  id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.listings AS l WHERE l.owner_id = public.profiles.id)
  OR EXISTS (
    SELECT 1 FROM public.inquiries AS i
    WHERE (i.sender_id = public.profiles.id OR i.recipient_id = public.profiles.id)
      AND (i.sender_id = (SELECT auth.uid()) OR i.recipient_id = (SELECT auth.uid()))
  )
);
DROP POLICY IF EXISTS "Listing images public read" ON storage.objects;
CREATE POLICY "Owners read own listing images" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'listing-images'::text
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
DROP POLICY IF EXISTS "Signed in users read linked PDFs" ON storage.objects;
CREATE POLICY "Owners read own listing documents" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'listing-documents'::text
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);