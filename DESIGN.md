---
name: GROW
description: L'archivio creativo e il piano operativo personale di un art director freelance.
colors:
  stage: "#0D0C0B"
  surface: "#181715"
  surface-2: "#23211E"
  line: "#2E2B27"
  ring: "#6E6A62"
  paper: "#F3F0E8"
  muted: "#A39E94"
  butter: "#2B2810"
  now: "#FFE500"
  now-strong: "#FFD600"
  ink: "#0D0C0B"
  ok: "#6BD69A"
  done: "#B49BF2"
  time: "#74C6F2"
  fix: "#FF8450"
typography:
  page-title:
    fontFamily: "Schibsted Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.035em"
  block-title:
    fontFamily: "Schibsted Grotesk"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  section-title:
    fontFamily: "Schibsted Grotesk"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Schibsted Grotesk"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Schibsted Grotesk"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
  small:
    fontFamily: "Schibsted Grotesk"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.35
rounded:
  control: "14px"
  tile: "18px"
  card: "22px"
  block: "28px"
  sheet: "32px"
  full: "9999px"
spacing:
  scale: "4px"
  gutter: "20px"
  between-groups: "32px"
  title-to-content: "12px"
  siblings: "8px"
---

# Design System: GROW

## 1. Overview

**Creative North Star: "Palco"**

Il nero è il palcoscenico, la carta crema di GROW diventa la luce del testo, il colore pieno è la struttura. Ogni schermata ha un solo blocco protagonista, sempre giallo, perché è la cosa da fare adesso: il prossimo episodio in Serie, lo spazio di cattura in Inbox, "Prima chiudi questo" in Piano. Tutto il resto sta un passo indietro, su superfici scure appena sollevate.

GROW deve sembrare un oggetto, non una dashboard. Gli elementi premibili hanno peso: luce dall'alto, ombra sotto, una molla quando li lasci. Niente blob, aloni decorativi, pillole a pioggia o etichette maiuscole sopra ogni sezione.

## 2. Colors

### Palco e carta
- **Palco** (#0D0C0B): sfondo di ogni schermata. Nero caldo, non neutro.
- **Superficie** (#181715) e **Superficie 2** (#23211E): liste, card, campi, controlli a riposo.
- **Linea** (#2E2B27): divisori sottili dentro le liste.
- **Anello** (#6E6A62): contorno dei controlli vuoti (check, interruttori). 3,3:1 sulla superficie.
- **Carta** (#F3F0E8): testo principale e pulsanti chiari. 17:1 sul palco.
- **Tenue** (#A39E94): testo secondario. 7,3:1 sul palco, 6,7:1 sulla superficie.

### Il colore è uno stato
Ogni colore dice sempre la stessa cosa, in tutte le sezioni.
- **Adesso** (#FFE500): la cosa da fare, la voce attiva della navigazione, lo stato "in corso". È il giallo di sempre di GROW.
- **Al passo, pronto** (#6BD69A).
- **Completato, pubblicato** (#B49BF2).
- **Futuro** (#74C6F2): in arrivo, date, tempo.
- **Da sistemare** (#FF8450): ritardo, posizione mancante, elimina.

### Named Rules
**Un giallo per schermata.** Il giallo pieno sta su un solo blocco per schermata più la voce attiva della navigazione. Altrove il giallo compare al massimo come contorno o come numero luminoso.

**Inchiostro sul colore.** Sui blocchi colorati il testo è sempre inchiostro (#0D0C0B): ogni combinazione supera 8:1.

**I clienti hanno il logo, non un colore.** In Piano ogni cliente è il suo logo nel suo riquadro (`public/clients/`), sul fondo per cui è disegnato. Chi non ha un logo ha il monogramma. Tipi di nota e categorie sono testo.

## 3. Typography

**Schibsted Grotesk** per tutto, da 400 a 900, caricato con `next/font` nel layout principale. Nessun monospazio: codici episodio, orari e conteggi usano le cifre tabellari del carattere stesso (`tabular-nums`). I numeri grandi da soli usano le cifre proporzionali.

- **Titolo pagina** (800, 44px, interlinea 0,9, -0,035em): "Serie.", "Inbox.", "Piano.". La riga è tagliata sulla maiuscola (`text-box-trim`), così lo spazio sopra è uguale a quello ai lati.
- **Titolo del blocco** (800, 36px, 0,95).
- **Titolo di gruppo** (800, 22px, 1,05).
- **Nome** (700, 17px, 1,2): serie, lavori, note.
- **Testo** (400, 15px, 1,45).
- **Piccolo** (400, 13px, 1,35): metadati, codici, date.

**La Regola del Punto Giallo** resta: ogni titolo di pagina finisce con un punto giallo.

## 4. Spacing

Griglia da 4. Margine laterale 20px. 32px tra un gruppo e l'altro, 12px tra il titolo di un gruppo e il suo contenuto, 8px tra elementi fratelli. I raggi sono concentrici: un elemento interno ha raggio uguale a quello esterno meno il padding.

## 5. Elevation and depth

Una sola luce, dall'alto. Utilità in `globals.css`:
- `.grow-surface`: superficie scura appena sollevata (sfumatura quasi invisibile, filo di luce sul bordo alto, ombra stretta).
- `.grow-block`: il blocco giallo protagonista, con ombra profonda.
- `.grow-object`: pulsanti e riquadri colorati o chiari, convessi.
- `.grow-socket`: il check vuoto, un incavo.
- `.grow-press`: premendo l'oggetto scende di 1px e si rimpicciolisce a 0,98; al rilascio torna con una molla smorzata (circa 4% di rimbalzo, `--spring`).
- `.grow-tilt` con `useTilt`: il blocco protagonista si inclina in prospettiva verso il dito (max 7°), con un riflesso che segue il punto toccato e il poster su un piano più vicino. Solo su elementi premibili.

Con "riduci movimento" restano solo i cambi di stato: niente molla, niente inclinazione, niente animazioni d'ingresso.

## 6. Components

- **Navigazione**: barra flottante scura in basso su mobile, barra laterale su desktop. Voce attiva gialla.
- **Linguette**: controllo a segmenti su superficie scura, con il cursore chiaro che scivola. Il conteggio di "Da vedere" è un numero giallo con un bagliore, senza riquadro.
- **Check**: tondo, 48px, incavo vuoto con anello a 3,3:1; giallo e convesso quando è segnato, con la spunta che si disegna.
- **Liste**: un'unica superficie con divisori sottili, non card una sopra l'altra.
- **Like**: il fiore di GROW (`SaveHeart`). Non si cambia.
- **Schede dal basso**: superficie scura, angoli da 32px, sfondo sfocato dietro.
- **Stati vuoti**: titolo da 22px e una frase che dice cosa fare, allineati a sinistra.

## 7. Do's and Don'ts

### Do:
- **Do** dare a ogni schermata un solo blocco giallo, la cosa da fare adesso.
- **Do** usare i colori di stato sempre con lo stesso significato.
- **Do** tenere i tocchi a 44px o più.
- **Do** usare `.grow-press` su tutto ciò che si preme.

### Don't:
- **Don't** reintrodurre il seme (icon-1…5) come segno grafico.
- **Don't** usare il lime acido, i gradienti viola-blu, i blob o gli aloni decorativi.
- **Don't** colorare i clienti: hanno il logo.
- **Don't** mettere etichette maiuscole spaziate sopra le sezioni.
- **Don't** far inclinare elementi che non si premono.
