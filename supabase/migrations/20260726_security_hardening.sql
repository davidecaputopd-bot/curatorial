-- Security hardening for GROW's shared discovery data and personal image bucket.
-- Non-destructive: no application rows or storage objects are deleted.

begin;

create or replace function public.is_grow_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and (
      exists (
        select 1 from public.user_profile
        where user_id = auth.uid()
      )
      or exists (
        select 1 from public.saved_items
        where user_id = auth.uid()
      )
      or exists (
        select 1 from public.chat_history
        where user_id = auth.uid()
      )
      or exists (
        select 1 from public.inbox_items
        where user_id = auth.uid()
      )
    );
$$;

revoke all on function public.is_grow_owner() from public;
grant execute on function public.is_grow_owner() to authenticated;

-- The discovery feed is readable by the GROW owner and writable only by
-- service-role cron handlers. Anonymous Supabase REST access is denied.
alter table public.content_items enable row level security;
alter table public.sources enable row level security;

drop policy if exists "grow owner reads content" on public.content_items;
create policy "grow owner reads content" on public.content_items
for select to authenticated
using (public.is_grow_owner());

drop policy if exists "grow owner reads sources" on public.sources;
create policy "grow owner reads sources" on public.sources
for select to authenticated
using (public.is_grow_owner());

-- Screenshots and phone captures are personal data. Existing object names are
-- kept intact, but the bucket becomes private and only the owner can read it.
update storage.buckets
set public = false
where id = 'inbox-images';

drop policy if exists "authenticated upload inbox images" on storage.objects;
drop policy if exists "public read inbox images" on storage.objects;
drop policy if exists "grow owner reads inbox images" on storage.objects;
drop policy if exists "grow owner uploads inbox images" on storage.objects;
drop policy if exists "grow owner updates inbox images" on storage.objects;
drop policy if exists "grow owner deletes inbox images" on storage.objects;

create policy "grow owner reads inbox images" on storage.objects
for select to authenticated
using (
  bucket_id = 'inbox-images'
  and public.is_grow_owner()
);

create policy "grow owner uploads inbox images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'inbox-images'
  and public.is_grow_owner()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "grow owner updates inbox images" on storage.objects
for update to authenticated
using (
  bucket_id = 'inbox-images'
  and public.is_grow_owner()
)
with check (
  bucket_id = 'inbox-images'
  and public.is_grow_owner()
);

create policy "grow owner deletes inbox images" on storage.objects
for delete to authenticated
using (
  bucket_id = 'inbox-images'
  and public.is_grow_owner()
);

commit;
