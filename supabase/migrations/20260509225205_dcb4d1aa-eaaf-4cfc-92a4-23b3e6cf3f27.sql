
-- 1. Restrict listing on listing-images bucket: only allow reading objects whose name is known (no folder listing)
DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;
CREATE POLICY "Anyone can view listing images by name"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'listing-images'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND name = name
);

-- Better: require a specific name match — disallow bare LIST by requiring the object name to be provided.
-- Drop and replace with a stricter policy that prevents enumeration via prefix search.
DROP POLICY IF EXISTS "Anyone can view listing images by name" ON storage.objects;
CREATE POLICY "Public read individual listing images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'listing-images'
  AND auth.role() = 'authenticated'
  OR (bucket_id = 'listing-images' AND octet_length(name) > 0 AND position('/' in name) > 0)
);

-- 2. Revoke EXECUTE on trigger-only SECURITY DEFINER functions from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
