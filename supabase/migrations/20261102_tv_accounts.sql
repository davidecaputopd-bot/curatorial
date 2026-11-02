-- Account per l'app Serie: ogni persona ha il suo profilo e la sua libreria.
-- Gli account nascono solo da un codice di invito (vedi /api/account/join):
-- profili e inviti si scrivono solo col service role, non con la chiave pubblica.
-- Non distruttiva.

begin;

create table if not exists public.tv_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  constraint tv_profiles_role_check check (role in ('owner', 'member'))
);

create table if not exists public.tv_invites (
  code text primary key,
  note text,
  created_at timestamptz not null default now(),
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz
);

alter table public.tv_profiles enable row level security;
alter table public.tv_invites enable row level security;

-- Ognuno vede solo il proprio profilo. Nessuna policy di scrittura: creare o
-- cambiare un profilo passa dal service role.
drop policy if exists "tv_profiles own row" on public.tv_profiles;
create policy "tv_profiles own row" on public.tv_profiles
for select to authenticated
using (id = auth.uid());

-- Nessuna policy su tv_invites: con la chiave pubblica i codici restano invisibili.

commit;
