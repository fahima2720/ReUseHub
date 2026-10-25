CREATE TABLE public.listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, sort_order),
  CONSTRAINT listing_images_order_range CHECK (sort_order BETWEEN 0 AND 4)
);
GRANT SELECT ON public.listing_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_images TO authenticated;
GRANT ALL ON public.listing_images TO service_role;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listing images public read" ON public.listing_images FOR SELECT USING (true);
CREATE POLICY "Owners or admins insert listing images" ON public.listing_images FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (l.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Owners or admins update listing images" ON public.listing_images FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (l.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))) WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (l.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Owners or admins delete listing images" ON public.listing_images FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (l.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE INDEX listing_images_listing_idx ON public.listing_images(listing_id);
INSERT INTO public.listing_images (listing_id, image_url, sort_order) SELECT id, image_url, 0 FROM public.listings WHERE image_url IS NOT NULL;

CREATE FUNCTION public.save_listing_images(_listing_id uuid, _image_urls text[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  PERFORM 1 FROM public.listings WHERE id = _listing_id AND (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _image_urls IS NULL OR cardinality(_image_urls) > 5 OR EXISTS (SELECT 1 FROM unnest(_image_urls) u WHERE u IS NULL OR char_length(u) = 0 OR char_length(u) > 8192 OR NOT (u LIKE 'https://%' OR u LIKE '/images/%')) THEN RAISE EXCEPTION 'Choose up to 5 valid photos'; END IF;
  DELETE FROM public.listing_images WHERE listing_id = _listing_id;
  INSERT INTO public.listing_images (listing_id, image_url, sort_order) SELECT _listing_id, u, (ord - 1)::smallint FROM unnest(_image_urls) WITH ORDINALITY AS images(u, ord);
  UPDATE public.listings SET image_url = _image_urls[1] WHERE id = _listing_id;
END $$;
REVOKE ALL ON FUNCTION public.save_listing_images(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_listing_images(uuid, text[]) TO authenticated;