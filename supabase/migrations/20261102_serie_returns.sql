-- Serie: quando torna una serie, calcolato dal sync notturno invece che a ogni apertura.
-- Non distruttiva: aggiunge colonne. return_notified ricorda l'ultimo ritorno notificato
-- ("3:2027-03-12" o "3:tba") per avvisare una sola volta quando cambia.

begin;

alter table public.tv_shows
  add column if not exists last_aired_at timestamptz,
  add column if not exists return_season integer,
  add column if not exists return_date timestamptz,
  add column if not exists return_notified text;

-- Fa ripassare il sync sulle serie non concluse, così le colonne si riempiono subito.
update public.tv_shows set synced_at = null where show_status is distinct from 'Ended';

commit;
