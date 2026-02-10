-- Journal photos bucket: create it in Supabase Dashboard (Storage → New bucket).
-- Name: journal-photos, Public: true, then run the policies below in SQL Editor.
-- (Do not INSERT into storage.buckets; use Dashboard or the app will try to create it on first upload.)

-- Policies: users upload/delete only their own folder (path: user_id/...); public read so URLs work
DROP POLICY IF EXISTS "Users can upload own journal photos" ON storage.objects;
CREATE POLICY "Users can upload own journal photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'journal-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Public read for journal photos" ON storage.objects;
CREATE POLICY "Public read for journal photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'journal-photos');

DROP POLICY IF EXISTS "Users can delete own journal photos" ON storage.objects;
CREATE POLICY "Users can delete own journal photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'journal-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
