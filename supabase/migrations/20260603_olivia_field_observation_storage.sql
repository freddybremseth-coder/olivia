-- Olivia / Doña Anna: Supabase Storage bucket for field observation images
-- Run in Supabase SQL Editor before using permanent photo upload in FieldObservationsView.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'olivia-field-observations',
  'olivia-field-observations',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read access for images used in reports and app views.
drop policy if exists "Olivia field observation images are publicly readable" on storage.objects;
create policy "Olivia field observation images are publicly readable"
on storage.objects
for select
using (bucket_id = 'olivia-field-observations');

-- Authenticated Olivia users can upload field-observation photos.
drop policy if exists "Olivia authenticated users can upload field observation images" on storage.objects;
create policy "Olivia authenticated users can upload field observation images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'olivia-field-observations');

-- Authenticated Olivia users can update/delete their uploaded objects if needed.
drop policy if exists "Olivia authenticated users can update field observation images" on storage.objects;
create policy "Olivia authenticated users can update field observation images"
on storage.objects
for update
to authenticated
using (bucket_id = 'olivia-field-observations')
with check (bucket_id = 'olivia-field-observations');

drop policy if exists "Olivia authenticated users can delete field observation images" on storage.objects;
create policy "Olivia authenticated users can delete field observation images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'olivia-field-observations');
