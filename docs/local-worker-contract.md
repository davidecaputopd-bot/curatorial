# GROW local worker contract

## Scopo

Il worker locale collega GROW su Vercel ai motori installati sul Mac senza
esporre ComfyUI, LTX o una shell su Internet.

## Flusso

1. GROW crea un record `studio_jobs` con stato `queued`.
2. Il worker autenticato legge solo i job dell’utente assegnato.
3. Il worker marca il job `running`.
4. Il worker compila il workflow approvato e chiama ComfyUI o LTX in locale.
5. L’output viene caricato in uno storage privato.
6. Il worker salva risultato e metadati, poi marca il job `done`.
7. GROW importa l’asset in Archivio dopo conferma dell’utente.

## Stati worker

- `not_configured`: nessun worker associato.
- `ready`: worker autenticato e disponibile.
- `running`: job in esecuzione.
- `error`: esecuzione fallita con errore leggibile.
- `completed`: output caricato e job completato.

## Vincoli di sicurezza

- Nessun endpoint ComfyUI/LTX pubblico.
- Nessun tunnel non autenticato.
- Nessuna shell o comando arbitrario proveniente dalla UI.
- Il worker accetta solo workflow e parametri in allowlist.
- Secret solo nel keychain del Mac o in variabili locali non committate.
- Ogni job costoso o distruttivo richiede approvazione esplicita.
- Retry limitati, idempotenza per job ID e deduplica tramite prompt hash.

## Valutazione output

Ogni asset deve poter registrare:

- `quality_score` da 1 a 5;
- `usable_for_client`;
- `notes`;
- `watermark`;
- `reuse_score`.
