-- This migration is non-destructive: it adds ownership, backfills existing rows,
-- then enables RLS on personal tables only.

begin;

do $$
declare
  grow_user_id uuid;
  auth_user_count integer;
begin
  select count(*) into auth_user_count from auth.users;

  if auth_user_count <> 1 then
    raise exception 'Expected exactly one Supabase Auth user, found %', auth_user_count;
  end if;

  select id into grow_user_id from auth.users limit 1;

  alter table public.chat_history add column if not exists user_id uuid references auth.users(id);
  alter table public.interactions add column if not exists user_id uuid references auth.users(id);
  alter table public.memories add column if not exists user_id uuid references auth.users(id);
  alter table public.mind_sessions add column if not exists user_id uuid references auth.users(id);
  alter table public.saved_items add column if not exists user_id uuid references auth.users(id);
  alter table public.user_profile add column if not exists user_id uuid references auth.users(id);

  update public.chat_history set user_id = grow_user_id where user_id is null;
  update public.interactions set user_id = grow_user_id where user_id is null;
  update public.memories set user_id = grow_user_id where user_id is null;
  update public.mind_sessions set user_id = grow_user_id where user_id is null;
  update public.saved_items set user_id = grow_user_id where user_id is null;
  update public.user_profile set user_id = grow_user_id where user_id is null;

  alter table public.chat_history alter column user_id set not null;
  alter table public.interactions alter column user_id set not null;
  alter table public.memories alter column user_id set not null;
  alter table public.mind_sessions alter column user_id set not null;
  alter table public.saved_items alter column user_id set not null;
  alter table public.user_profile alter column user_id set not null;
end $$;

alter table public.chat_history enable row level security;
alter table public.interactions enable row level security;
alter table public.memories enable row level security;
alter table public.mind_sessions enable row level security;
alter table public.saved_items enable row level security;
alter table public.user_profile enable row level security;

drop policy if exists "own chat history" on public.chat_history;
create policy "own chat history" on public.chat_history
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own interactions" on public.interactions;
create policy "own interactions" on public.interactions
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own memories" on public.memories;
create policy "own memories" on public.memories
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own mind sessions" on public.mind_sessions;
create policy "own mind sessions" on public.mind_sessions
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own saved items" on public.saved_items;
create policy "own saved items" on public.saved_items
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own profile" on public.user_profile;
create policy "own profile" on public.user_profile
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists chat_history_user_id_idx on public.chat_history(user_id);
create index if not exists interactions_user_id_idx on public.interactions(user_id);
create index if not exists memories_user_id_idx on public.memories(user_id);
create index if not exists mind_sessions_user_id_idx on public.mind_sessions(user_id);
create index if not exists saved_items_user_id_idx on public.saved_items(user_id);
create index if not exists user_profile_user_id_idx on public.user_profile(user_id);

commit;
