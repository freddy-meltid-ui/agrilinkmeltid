
-- Add premium flag to listings
ALTER TABLE public.listings ADD COLUMN is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN premium_until timestamp with time zone;

-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true);

-- Storage policies for listing images
CREATE POLICY "Anyone can view listing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'listing-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own listing images"
ON storage.objects FOR DELETE
USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);
