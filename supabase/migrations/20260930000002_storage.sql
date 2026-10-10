-- Storage buckets. Object keys always start with the owner's user id: "<uid>/...".
--
--   public-media   avatars, banners, product covers, audio previews, alert sounds (public read)
--   product-files  the files people buy (private; buyers get short-lived signed URLs)
--   slips          payment slips uploaded by supporters (private; server-only)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media', 'public-media', true, 10485760,
   array['image/png', 'image/jpeg', 'image/webp', 'image/gif',
         'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm']),
  ('product-files', 'product-files', false, 52428800, null),
  ('slips', 'slips', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "owners upload public media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'public-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "owners replace public media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'public-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "owners delete public media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'public-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "owners read own product files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'product-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "owners delete own product files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Product file uploads go through signed upload URLs minted by the server,
-- and slips are server-only, so neither needs an insert policy.
