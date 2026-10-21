-- Serie: "guarda più tardi" (come is_for_later di TV Time) e minuti visti per le statistiche.
-- Non distruttiva: aggiunge una colonna e ricrea la vista (s.* va riespanso).

begin;

alter table public.tv_shows add column if not exists for_later boolean not null default false;

drop view if exists public.tv_show_overview;
create view public.tv_show_overview with (security_invoker = on) as
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

commit;
