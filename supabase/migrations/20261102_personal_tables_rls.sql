-- inbox_items e calendar_items non avevano una migrazione RLS in repo (tabelle
-- create fuori dal versionamento). Con più account nello stesso progetto
-- Supabase devono restare per-utente anche via REST, non solo nelle API.
--
-- PRIMA DI APPLICARLA: verifica che non ci siano righe orfane, altrimenti
-- spariscono dalla tua vista.
--   select count(*) from public.inbox_items where user_id is null;
--   select count(*) from public.calendar_items where user_id is null;
-- Se ce ne sono, assegnale al tuo utente prima di proseguire:
--   update public.inbox_items set user_id = (
--     select id from auth.users where lower(email) = lower('EMAIL_PROPRIETARIO')
--   ) where user_id is null;

begin;

alter table public.inbox_items enable row level security;
alter table public.calendar_items enable row level security;

drop policy if exists "own inbox items" on public.inbox_items;
create policy "own inbox items" on public.inbox_items
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own calendar items" on public.calendar_items;
create policy "own calendar items" on public.calendar_items
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;
