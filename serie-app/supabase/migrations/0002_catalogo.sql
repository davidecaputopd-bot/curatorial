-- Catalogo serie: copia locale dell'indice TVmaze, da cui si sceglie
-- all'ingresso. Non è roba di nessuno in particolare — la leggono tutti,
-- la scrive solo il service role (vedi /api/tv/catalogo/refresh).

begin;

create extension if not exists pg_trgm;

create table if not exists public.tv_catalog (
  tvmaze_id integer primary key,
  title text not null,
  poster text,
  network text,
  show_status text,
  premiered date,
  weight integer not null default 0,     -- popolarità TVmaze, 0-100
  genres text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists tv_catalog_weight_idx on public.tv_catalog (weight desc, title);
create index if not exists tv_catalog_title_idx on public.tv_catalog using gin (title gin_trgm_ops);
create index if not exists tv_catalog_genres_idx on public.tv_catalog using gin (genres);

-- L'indice TVmaze si percorre una pagina alla volta: qui resta il segno.
create table if not exists public.tv_catalog_state (
  id boolean primary key default true,
  next_page integer not null default 0,
  shows integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint tv_catalog_state_single check (id)
);

insert into public.tv_catalog_state (id) values (true) on conflict (id) do nothing;

alter table public.tv_catalog enable row level security;
alter table public.tv_catalog_state enable row level security;

-- Il catalogo è pubblico per chi è dentro: nessun dato personale.
drop policy if exists "tv_catalog readable" on public.tv_catalog;
create policy "tv_catalog readable" on public.tv_catalog
for select to authenticated
using (true);

-- Nessuna policy su tv_catalog_state: lo tocca solo il service role.

commit;
