-- 1. profiles: restrict reads to authenticated users
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2. user_roles: restrict reads to authenticated users
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.user_roles;
CREATE POLICY "Roles are viewable by authenticated users"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.user_roles FROM anon;
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 3. storage listing-images: authenticated-only reads, owner-only updates
DROP POLICY IF EXISTS "Public read individual listing images" ON storage.objects;
CREATE POLICY "Authenticated users can read listing images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "Users can update their own listing images" ON storage.objects;
CREATE POLICY "Users can update their own listing images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'listing-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);