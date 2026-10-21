-- Serie TV (archivio TV Time + aggiornamento nuove puntate da TVmaze).
-- Non distruttiva. Stesso schema delle altre tabelle personali: user_id + RLS.

begin;

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
  tvtime_status text,                    -- stato importato: al passo | in corso / indietro | non iniziata
  progress_season integer,               -- ultimo episodio visto (null = posizione da impostare)
  progress_episode integer,
  favorite boolean not null default false,
  favorite_position integer,
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
  source text not null default 'grow',   -- grow | tvtime
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

alter table public.tv_shows enable row level security;
alter table public.tv_episodes enable row level security;
alter table public.tv_episode_watches enable row level security;
alter table public.tv_push_subscriptions enable row level security;

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

-- Una riga per serie seguita: prossimo episodio da vedere, quanti ne mancano, prossima uscita.
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
    ) as unwatched
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

commit;
