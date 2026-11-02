-- Preserve all listings, images and inquiries while widening validation.
ALTER TABLE public.inquiries DROP CONSTRAINT inquiries_message_check;
ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_message_check CHECK (char_length(btrim(message)) BETWEEN 1 AND 5000);
ALTER TABLE public.listing_images DROP CONSTRAINT listing_images_order_range;
ALTER TABLE public.listing_images ADD CONSTRAINT listing_images_order_range CHECK (sort_order BETWEEN 0 AND 9);
CREATE OR REPLACE FUNCTION public.save_listing_images(_listing_id uuid, _image_urls text[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
 PERFORM 1 FROM public.listings WHERE id = _listing_id AND (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF _image_urls IS NULL OR cardinality(_image_urls) > 10 OR EXISTS (SELECT 1 FROM unnest(_image_urls) u WHERE u IS NULL OR char_length(u) = 0 OR char_length(u) > 8192 OR NOT (u LIKE 'https://%' OR u LIKE '/images/%')) THEN RAISE EXCEPTION 'Choose up to 10 valid photos'; END IF;
 DELETE FROM public.listing_images WHERE listing_id = _listing_id;
 INSERT INTO public.listing_images(listing_id,image_url,sort_order) SELECT _listing_id,u,(ord-1)::smallint FROM unnest(_image_urls) WITH ORDINALITY AS images(u,ord);
 UPDATE public.listings SET image_url = _image_urls[1] WHERE id = _listing_id;
END $$;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE INDEX listings_search_trgm_idx ON public.listings USING gin ((title || ' ' || description) gin_trgm_ops);
CREATE INDEX inquiries_unread_recipient_idx ON public.inquiries(recipient_id) WHERE read_at IS NULL;
CREATE INDEX inquiries_conversation_idx ON public.inquiries(listing_id,least(sender_id,recipient_id),greatest(sender_id,recipient_id),created_at DESC);
CREATE FUNCTION public.search_listings(_term text DEFAULT '') RETURNS SETOF public.listings LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT * FROM public.listings WHERE status='available' AND (title || ' ' || description) ILIKE '%' || replace(replace(replace(btrim(left(coalesce(_term,''),80)), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
$$;
GRANT EXECUTE ON FUNCTION public.search_listings(text) TO anon,authenticated;
CREATE FUNCTION public.inbox_conversations(_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 WITH grouped AS (
 SELECT listing_id, CASE WHEN sender_id=auth.uid() THEN recipient_id ELSE sender_id END other_id, max(created_at) latest_at, count(*) FILTER (WHERE recipient_id=auth.uid() AND read_at IS NULL) unread
 FROM public.inquiries WHERE sender_id=auth.uid() OR recipient_id=auth.uid() GROUP BY listing_id, CASE WHEN sender_id=auth.uid() THEN recipient_id ELSE sender_id END
 ), page AS (SELECT * FROM grouped ORDER BY latest_at DESC,listing_id,other_id LIMIT 21 OFFSET greatest(0,_offset))
 SELECT coalesce(jsonb_agg(jsonb_build_object('listing_id',g.listing_id,'other_id',g.other_id,'latest_at',g.latest_at,'unread',g.unread,'name',p.full_name,'title',l.title,'image_url',l.image_url,'status',l.status,'preview',(SELECT message FROM public.inquiries i WHERE i.listing_id=g.listing_id AND least(i.sender_id,i.recipient_id)=least(auth.uid(),g.other_id) AND greatest(i.sender_id,i.recipient_id)=greatest(auth.uid(),g.other_id) ORDER BY created_at DESC,id DESC LIMIT 1)) ORDER BY g.latest_at DESC),'[]'::jsonb) FROM page g LEFT JOIN public.profiles p ON p.id=g.other_id LEFT JOIN public.listings l ON l.id=g.listing_id;
$$;
REVOKE ALL ON FUNCTION public.inbox_conversations(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.inbox_conversations(integer) TO authenticated;
CREATE TABLE public.listing_attachments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,storage_path text NOT NULL UNIQUE,filename text NOT NULL CHECK(char_length(filename) BETWEEN 1 AND 200),size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 1 AND 10485760),created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,DELETE ON public.listing_attachments TO authenticated;
GRANT ALL ON public.listing_attachments TO service_role;
ALTER TABLE public.listing_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in listing attachment read" ON public.listing_attachments FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.listings l WHERE l.id=listing_id));
CREATE POLICY "Owners add PDFs" ON public.listing_attachments FOR INSERT TO authenticated WITH CHECK(EXISTS(SELECT 1 FROM public.listings l WHERE l.id=listing_id AND l.owner_id=auth.uid()) AND split_part(storage_path,'/',1)=auth.uid()::text);
CREATE POLICY "Owners remove PDFs" ON public.listing_attachments FOR DELETE TO authenticated USING(EXISTS(SELECT 1 FROM public.listings l WHERE l.id=listing_id AND l.owner_id=auth.uid()));
CREATE INDEX listing_attachments_listing_idx ON public.listing_attachments(listing_id);
CREATE POLICY "Owners upload listing documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='listing-documents' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "Signed in users read linked PDFs" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='listing-documents' AND ((storage.foldername(name))[1]=auth.uid()::text OR EXISTS(SELECT 1 FROM public.listing_attachments a WHERE a.storage_path=name)));
CREATE POLICY "Owners delete listing documents" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='listing-documents' AND (storage.foldername(name))[1]=auth.uid()::text);
COMMENT ON TABLE public.listing_attachments IS 'Optional listing PDFs; private storage, signed-in reads and owner-only writes.';