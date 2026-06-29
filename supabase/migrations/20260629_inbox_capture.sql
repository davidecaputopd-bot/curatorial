-- Adds image support to inbox_items and a storage bucket for screenshots
-- shared from phone (Instagram/TikTok screenshots, photos, etc).
-- Non-destructive: only adds a column and a new bucket.

begin;

alter table public.inbox_items add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('inbox-images', 'inbox-images', true)
on conflict (id) do nothing;

drop policy if exists "authenticated upload inbox images" on storage.objects;
create policy "authenticated upload inbox images" on storage.objects
for insert to authenticated
with check (bucket_id = 'inbox-images');

drop policy if exists "public read inbox images" on storage.objects;
create policy "public read inbox images" on storage.objects
for select to public
using (bucket_id = 'inbox-images');

drop policy if exists "service role manage inbox images" on storage.objects;
create policy "service role manage inbox images" on storage.objects
for all to service_role
using (bucket_id = 'inbox-images')
with check (bucket_id = 'inbox-images');

commit;
