-- Schema iniziale di Time: un progetto Supabase solo per questa app.
-- Ogni persona ha il suo profilo e la sua libreria; nessun dato di GROW qui.
-- Un account nasce solo da un codice di invito (vedi /api/account/join):
-- profili e inviti si scrivono solo col service role.

begin;

create table if not exists public.tv_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'member',
  accent text not null default 'ghiaccio',
  created_at timestamptz not null default now(),
  constraint tv_profiles_role_check check (role in ('owner', 'member')),
  constraint tv_profiles_accent_check
    check (accent in ('ghiaccio', 'lime', 'arancio', 'fucsia', 'lavanda'))
);

create table if not exists public.tv_invites (
  code text primary key,
  note text,
  created_at timestamptz not null default now(),
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz
);

create table if not exists public.tv_shows (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  title text not null,
  tvdb_id integer,                       -- ID TheTVDB (usato da TV Time)
  tvmaze_id integer,
  poster text,
  network text,
  show_status text,                      -- Running | Ended | To Be Determined (TVmaze)
  followed boolean not null default true,
  followed_at date,
  last_watched_at date,
  tvtime_status text,                    -- stato importato da TV Time
  progress_season integer,               -- ultimo episodio visto (null = posizione da impostare)
  progress_episode integer,
  favorite boolean not null default false,
  favorite_position integer,
  for_later boolean not null default false,
  notify boolean not null default true,
  synced_at timestamptz,
  imported_from text,
  created_at timestamptz not null default now(),
  unique (user_id, title)
);

create table if not exists public.tv_episodes (
  id integer not null,                   -- ID episodio TVmaze
  user_id uuid not null default auth.uid() references auth.users(id),
  show_id bigint not null references public.tv_shows(id) on delete cascade,
  season integer not null,
  number integer not null,
  name text,
  airstamp timestamptz,
  runtime integer,
  image text,
  notified_at timestamptz,
  primary key (user_id, id)
);
create index if not exists tv_episodes_show_idx on public.tv_episodes (show_id, season, number);
create index if not exists tv_episodes_air_idx on public.tv_episodes (user_id, airstamp);

create table if not exists public.tv_episode_watches (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  show_id bigint not null references public.tv_shows(id) on delete cascade,
  season integer not null,
  episode integer not null,
  watched_at timestamptz,                -- null = visione non datata
  source text not null default 'time',   -- time | tvtime
  unique (user_id, show_id, season, episode)
);

create table if not exists public.tv_push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.tv_profiles enable row level security;
alter table public.tv_invites enable row level security;
alter table public.tv_shows enable row level security;
alter table public.tv_episodes enable row level security;
alter table public.tv_episode_watches enable row level security;
alter table public.tv_push_subscriptions enable row level security;

-- Ognuno vede solo il proprio profilo. Nessuna scrittura con la chiave pubblica.
drop policy if exists "tv_profiles own row" on public.tv_profiles;
create policy "tv_profiles own row" on public.tv_profiles
for select to authenticated
using (id = auth.uid());

-- Nessuna policy su tv_invites: con la chiave pubblica i codici restano invisibili.

drop policy if exists "tv_shows own rows" on public.tv_shows;
create policy "tv_shows own rows" on public.tv_shows
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "tv_episodes own rows" on public.tv_episodes;
create policy "tv_episodes own rows" on public.tv_episodes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "tv_episode_watches own rows" on public.tv_episode_watches;
create policy "tv_episode_watches own rows" on public.tv_episode_watches
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "tv_push_subscriptions own rows" on public.tv_push_subscriptions;
create policy "tv_push_subscriptions own rows" on public.tv_push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Una riga per serie seguita: prossimo episodio da vedere, quanti ne mancano,
-- minuti visti e prossima uscita.
create or replace view public.tv_show_overview with (security_invoker = on) as
select
  s.*,
  nxt.id as next_episode_id,
  nxt.season as next_season,
  nxt.number as next_number,
  nxt.name as next_name,
  nxt.airstamp as next_airstamp,
  coalesce(cnt.aired, 0) as aired_count,
  coalesce(cnt.unwatched, 0) as unwatched_count,
  coalesce(cnt.watched_minutes, 0) as watched_minutes,
  up.airstamp as upcoming_airstamp
from public.tv_shows s
left join lateral (
  select e.id, e.season, e.number, e.name, e.airstamp
  from public.tv_episodes e
  where e.show_id = s.id
    and e.airstamp <= now()
    and s.progress_season is not null
    and (e.season, e.number) > (s.progress_season, s.progress_episode)
  order by e.season, e.number
  limit 1
) nxt on true
left join lateral (
  select
    count(*) filter (where e.airstamp <= now()) as aired,
    count(*) filter (
      where e.airstamp <= now()
        and s.progress_season is not null
        and (e.season, e.number) > (s.progress_season, s.progress_episode)
    ) as unwatched,
    sum(e.runtime) filter (
      where s.progress_season is not null
        and (e.season, e.number) <= (s.progress_season, s.progress_episode)
    ) as watched_minutes
  from public.tv_episodes e
  where e.show_id = s.id
) cnt on true
left join lateral (
  select e.airstamp
  from public.tv_episodes e
  where e.show_id = s.id and e.airstamp > now()
  order by e.airstamp
  limit 1
) up on true;

-- Primo ingresso: un codice per creare l'account del proprietario.
-- Subito dopo, da SQL: update public.tv_profiles set role = 'owner' where id = '<tuo uuid>';
insert into public.tv_invites (code, note)
values ('FONDATORE', 'primo account')
on conflict (code) do nothing;

commit;
