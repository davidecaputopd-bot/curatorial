# Time

Tracker di serie TV per un gruppo di amici: ognuno ha il suo account, la sua
libreria e il suo colore. Rifà la struttura di TV Time — da vedere, in arrivo,
libreria, dettaglio serie con stagioni ed episodi — senza la parte social.

App a sé: **repo in comune con GROW, ma progetto Vercel e progetto Supabase
separati**. GROW resta personale e non condivide né deploy né database.

## Com'è fatta

- Next.js (App Router) + Tailwind, stesso sistema visivo di GROW ma con
  l'accent scelto da chi usa l'app
- Supabase per dati e account; TVmaze per episodi e calendario
- `/` da vedere, in arrivo, libreria · `/s/[id]` dettaglio serie ·
  `/imposta` posizione iniziale · `/entra` accesso · `/inviti` codici
- Cron giornaliero `/api/tv/sync`: aggiorna le serie e manda le notifiche

## Account

Un account nasce **solo** da un codice di invito: `/api/account/join` lo
verifica e crea il profilo col service role. Senza riga in `tv_profiles` il
proxy non lascia entrare, quindi nemmeno una registrazione fatta da fuori apre
la porta. Tieni comunque disattivata la registrazione pubblica di Supabase.

Chi ha `role = 'owner'` crea i codici da `/inviti`.

## Personalizzazione

Al primo ingresso si scelgono nome e colore. Il nome diventa il nome dell'app
(`Marco` → `Marco's Time`), il colore è l'accent di tutta l'interfaccia: cinque
opzioni — ghiaccio, lime, arancio, fucsia, lavanda. Il giallo non c'è: è di
GROW. I valori stanno in `src/app/globals.css` sotto `[data-accent]`, le
etichette in `src/lib/accents.ts`.

## Messa in piedi

1. Nuovo progetto Supabase, poi applica lo schema:
   ```
   psql "$TIME_DB" -f supabase/migrations/0001_init.sql
   ```
2. Variabili d'ambiente: copia `.env.example` e riempilo
   (`npx web-push generate-vapid-keys` per le chiavi push).
3. Su Vercel: nuovo progetto sulla stessa repo con **Root Directory**
   `serie-app`, le variabili di sopra e il suo dominio.
4. Crea il tuo account da `/entra` con il codice `FONDATORE`, poi prendi il
   ruolo owner:
   ```
   update public.tv_profiles set role = 'owner' where id = '<tuo uuid>';
   ```
5. Porta dentro la libreria già copiata dal vecchio telefono:
   ```
   GROW_DB=... TIME_DB=... VECCHIO_UUID=... NUOVO_UUID=... \
     ./scripts/trasloca-libreria.sh
   ```
6. In Supabase → Authentication: registrazione pubblica **off**.

## Sviluppo

```
npm install
npm run dev
```
