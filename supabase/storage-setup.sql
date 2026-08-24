-- ClientSafe file storage for Vercel.
-- Run in the Supabase SQL editor (Storage + Auth enabled).
-- vault-previews is public so watermarked images/videos can load in the browser.
-- vault-private holds originals and extracted live demos; downloads go through the app.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('vault-previews', 'vault-previews', true, 31457280),
  ('vault-private', 'vault-private', false, 31457280)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "Public read vault-previews" on storage.objects;
create policy "Public read vault-previews"
on storage.objects
for select
to public
using (bucket_id = 'vault-previews');
