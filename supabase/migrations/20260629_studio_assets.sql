-- Personal generated outputs produced inside GROW Studio.
-- Non-destructive: creates a new table with per-user RLS and soft delete.

begin;

create table if not exists public.studio_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null,
  project text not null,
  asset_type text not null,
  engine text not null,
  prompt text not null,
  negative_prompt text,
  format text,
  url text,
  output_text text,
  quality_score smallint check (quality_score between 1 and 5),
  usable_for_client boolean,
  notes text,
  watermark boolean,
  reuse_score smallint check (reuse_score between 1 and 5),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  constraint studio_assets_has_output check (url is not null or output_text is not null)
);

alter table public.studio_assets enable row level security;

drop policy if exists "own studio assets" on public.studio_assets;
create policy "own studio assets" on public.studio_assets
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists studio_assets_user_created_idx
on public.studio_assets(user_id, created_at desc)
where deleted_at is null;

commit;
