#!/usr/bin/env bash
# Sposta la libreria serie dal Supabase di GROW a quello di Time.
# Copia solo le tabelle delle serie: niente inbox, archivio, calendario, AI.
#
#   GROW_DB=postgresql://...   (connection string del progetto GROW)
#   TIME_DB=postgresql://...   (connection string del progetto Time)
#   VECCHIO_UUID=...           (il tuo user_id su GROW)
#   NUOVO_UUID=...             (il tuo user_id su Time, dopo aver creato l'account)
#
# Prima di lanciarlo: applica 0001_init.sql sul progetto Time, crea il tuo
# account da /entra con il codice FONDATORE e prendi il nuovo uuid da
# Supabase → Authentication → Users.
set -euo pipefail

: "${GROW_DB:?manca GROW_DB}"
: "${TIME_DB:?manca TIME_DB}"
: "${VECCHIO_UUID:?manca VECCHIO_UUID}"
: "${NUOVO_UUID:?manca NUOVO_UUID}"

cartella=$(mktemp -d)
dump="$cartella/libreria.sql"

echo "1/4 — esporto le serie da GROW"
pg_dump "$GROW_DB" \
  --data-only --no-owner --no-privileges \
  --table=public.tv_shows \
  --table=public.tv_episodes \
  --table=public.tv_episode_watches \
  > "$dump"

echo "2/4 — riassegno le righe al nuovo account"
# Le tabelle hanno una foreign key su auth.users: senza il remap l'import fallisce.
sed -i.bak "s/$VECCHIO_UUID/$NUOVO_UUID/g" "$dump"
if ! grep -q "$NUOVO_UUID" "$dump"; then
  echo "Nessuna riga con $VECCHIO_UUID nel dump: controlla VECCHIO_UUID." >&2
  exit 1
fi

echo "3/4 — importo su Time"
psql "$TIME_DB" --single-transaction -f "$dump"

echo "4/4 — allineo i contatori delle chiavi"
# Le id sono identity: senza setval il prossimo inserimento va in conflitto.
psql "$TIME_DB" <<'EOSQL'
select setval(
  pg_get_serial_sequence('public.tv_shows', 'id'),
  coalesce((select max(id) from public.tv_shows), 1)
);
select setval(
  pg_get_serial_sequence('public.tv_episode_watches', 'id'),
  coalesce((select max(id) from public.tv_episode_watches), 1)
);
EOSQL

echo
echo "Fatto. Verifica che i conti tornino:"
echo "  psql \"\$GROW_DB\" -c \"select count(*) from public.tv_shows where user_id = '\$VECCHIO_UUID'\""
echo "  psql \"\$TIME_DB\" -c \"select count(*) from public.tv_shows where user_id = '\$NUOVO_UUID'\""
echo
echo "Il dump resta in $cartella finché non lo cancelli tu."
