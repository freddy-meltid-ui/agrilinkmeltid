CREATE POLICY "field evidence upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'field-evidence' AND owner = auth.uid() AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "field evidence read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'field-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "field evidence update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'field-evidence' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'field-evidence' AND owner = auth.uid());
CREATE POLICY "field evidence delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'field-evidence' AND owner = auth.uid());