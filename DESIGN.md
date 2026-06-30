---
name: GROW
description: L'archivio creativo e il piano operativo personale di un art director freelance.
colors:
  paper: "#F7F4EE"
  ink: "#111111"
  ink-deep: "#0F0F10"
  muted: "#5F5A52"
  card: "#FFFFFF"
  soft: "#F1EDE5"
  border: "#DED8CC"
  highlighter: "#FFE500"
  highlighter-deep: "#FFD600"
typography:
  display:
    fontFamily: "Bebas Neue, Arial Black, sans-serif"
    fontSize: "clamp(1.75rem, 5vw, 2.375rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.02em"
  title:
    fontFamily: "DM Sans, Helvetica Neue, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "DM Sans, Helvetica Neue, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "DM Mono, Courier New, monospace"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.15em"
rounded:
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.highlighter}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.highlighter-deep}"
  button-dark:
    backgroundColor: "{colors.ink-deep}"
    textColor: "{colors.highlighter}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.soft}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
---

# Design System: GROW

## 1. Overview

**Creative North Star: "Lo Studio Quaderno"**

GROW si comporta come il taccuino fisico di uno studio creativo indipendente: pagine color crema, inchiostro nero netto, un solo evidenziatore giallo usato con intenzione. Non è un'app consumer che cerca di intrattenere, e non è una dashboard SaaS che cerca di vendersi — è lo strumento di lavoro quotidiano di un singolo art director, costruito per ridurre l'attrito tra "ho visto qualcosa" e "l'ho usato in un brief". Ogni schermata privilegia l'azione immediata sul dettaglio nascosto: stato e prossimo passo si leggono a colpo d'occhio, mai dietro un tap in più.

Il sistema rifiuta esplicitamente l'estetica da SaaS generico — niente card grid identiche e ripetute all'infinito, niente palette "SaaS-cream" scontata e priva di carattere, niente eyebrow uppercase sopra ogni sezione, niente badge colorati a pioggia senza gerarchia. GROW non deve sembrare un template di dashboard B2B: deve sembrare costruito su misura per un solo workflow, con la fiducia tipografica di un brief di design, non i riempitivi rassicuranti di un onboarding consumer.

**Key Characteristics:**
- Tipografia da titolo di rivista (Bebas Neue) accanto a corpo testo umano (DM Sans) e didascalie tecniche (DM Mono)
- Superfici quasi piatte: bordo sottile invece di ombra, eccetto sugli elementi flottanti
- Giallo come firma riconoscibile, non come tappezzeria — presente ma mai dominante sulla superficie totale
- Pillole arrotondate per azioni e stato, rettangoli morbidi (24px+) per i contenitori
- Colore per identità funzionale (cliente, stato pipeline) separato e distinguibile dal colore di brand

## 2. Colors

Palette ristretta e tinteggiata calda: un solo accento elettrico sopra una base di carta e inchiostro.

### Primary
- **Evidenziatore** (#FFE500): l'accento di brand. Usato su CTA primarie, badge di stato attivo, indicatori "non letto", la barra attiva nella navigazione, il floating action button. È il colore che dice "agisci qui".
- **Evidenziatore Profondo** (#FFD600): stato hover/press dell'evidenziatore — stessa famiglia, leggermente più saturo verso l'oro.

### Neutral
- **Carta** (#F7F4EE): sfondo di base di ogni schermata. Crema caldo, non bianco puro — la "pagina" del quaderno.
- **Inchiostro** (#111111): testo primario su sfondo carta.
- **Inchiostro Profondo** (#0F0F10): superfici scure intenzionali — barra di navigazione, badge "Lavora in AI", bottoni secondari ad alto contrasto.
- **Tenue** (#5F5A52): testo secondario, etichette, metadati. Un grigio caldo, mai un grigio freddo o desaturato a zero — resta nella famiglia cromatica della carta.
- **Scheda** (#FFFFFF): sfondo delle card sopra la carta, per separazione minima di superficie.
- **Morbido** (#F1EDE5): sfondo di input, select, aree interattive secondarie — un passo più scuro della carta, un passo più chiaro del bordo.
- **Bordo** (#DED8CC): unico colore di bordo nel sistema. Sottile, mai una linea netta in contrasto forte.

### Named Rules
**La Regola della Rarità.** L'evidenziatore giallo occupa il 10–25% di qualunque schermata, mai di più. Compare su un'azione primaria, un badge di stato, un indicatore — non come sfondo di sezione diffuso. La sua riconoscibilità dipende dal fatto che non è ovunque.

**La Regola del Colore Funzionale.** I colori usati per distinguere clienti o stati nella pipeline (ambra, smeraldo, viola, blu, rosa) sono identità funzionali, non estensioni della palette di brand. Non competono mai con il giallo per importanza visiva — restano piccoli (barre laterali da 4px, pallini da 8px), mai superfici piene.

## 3. Typography

**Display Font:** Bebas Neue (con fallback Arial Black, sans-serif)
**Body Font:** DM Sans (con fallback Helvetica Neue, system-ui, sans-serif)
**Label/Mono Font:** DM Mono (con fallback Courier New, monospace)

**Character:** Bebas Neue porta la voce da titolo editoriale — condensato, maiuscolo, deciso, usato con parsimonia sui titoli di pagina. DM Sans è il cavallo da lavoro per ogni testo umano: leggibile, neutro, senza personalità che distrae. DM Mono firma ogni etichetta tecnica e metadato con un tocco da terminale/quaderno tecnico, mai decorativo.

### Hierarchy
- **Display** (400, clamp(1.75rem, 5vw, 2.375rem), line-height 0.9, Bebas Neue, uppercase): titoli di pagina ("Calendario.", "Inbox.", "Archivio."). Il punto finale giallo è una firma ricorrente del sistema.
- **Title** (700, 1.125rem, line-height 1.25, DM Sans): titoli di card, nomi di contenuti, intestazioni di sezione dentro una pagina.
- **Body** (400, 0.875rem, line-height 1.6, DM Sans): testo conversazionale, descrizioni, messaggi chat. Max ~70 caratteri per riga nei container di testo lungo.
- **Label** (500, 0.625rem, line-height 1.3, letter-spacing 0.15em, DM Mono, uppercase): etichette di sezione, metadati, timestamp, badge di stato. Sempre tutto maiuscolo, sempre tracciato largo.

### Named Rules
**La Regola del Punto Giallo.** Ogni titolo Display termina con un punto reso nell'evidenziatore (`<span className="text-grow-yellow">.</span>`). È la firma tipografica del sistema — non va omessa né sostituita con altri segni.

## 4. Elevation

GROW è piatto per default. Le card vivono sulla carta con un bordo sottile (1px, colore Bordo) invece di un'ombra — la separazione di superficie è data dal colore (Scheda su Carta), non dalla profondità simulata. L'ombra appare solo per segnalare galleggiamento reale: elementi che stanno sopra il flusso normale del contenuto (barra di navigazione flottante, floating action button, modali, sheet).

### Shadow Vocabulary
- **Galleggiante Diffusa** (`box-shadow: 0 -2px 40px rgba(15,15,16,0.08), 0 18px 50px rgba(15,15,16,0.12)`): la barra di navigazione inferiore. Ombra ampia e morbida che la stacca dal contenuto sottostante senza un bordo netto.
- **Galleggiante Accento** (`box-shadow: 0 8px 24px rgba(255,229,0,0.4)`): riservata al floating action button — l'unica ombra colorata del sistema, tinta dell'evidenziatore stesso invece che neutra.
- **Modale** (`backdrop-blur con overlay rgba(0,0,0,0.5)`): sheet e modali si aprono dal basso con sfondo sfocato dietro, mai un'ombra propria — la profondità è data dal blur del livello sottostante.

### Named Rules
**La Regola del Bordo, non Ombra.** Le card a riposo usano sempre un bordo sottile, mai un'ombra. L'ombra è riservata esclusivamente a ciò che galleggia sopra il flusso normale (nav, FAB, modali) — è un segnale di stato, non una texture decorativa applicata di default.

## 5. Components

### Buttons
- **Shape:** pillola piena (rounded-full, raggio 9999px) per ogni azione, primaria o secondaria.
- **Primary:** sfondo Evidenziatore (#FFE500), testo Inchiostro, padding 14px 24px, font-weight 700-900 uppercase tracciato stretto.
- **Hover / Focus:** sfondo passa a Evidenziatore Profondo (#FFD600); nessuna animazione di scala, solo cambio colore immediato (≤200ms).
- **Dark/Secondary:** sfondo Inchiostro Profondo (#0F0F10), testo Evidenziatore — usato per azioni di handoff secondarie ("Lavora in AI →"), mai per l'azione primaria della schermata.
- **Ghost:** bordo Bordo (1px), testo Tenue, sfondo trasparente — per filtri e toggle non selezionati.

### Chips / Badge di stato
- **Style:** pillola piccola (px-2 py-0.5), testo 9-10px DM Mono o DM Sans bold uppercase.
- **Stato pipeline:** colore di sfondo trasparente al 15% sul colore semantico (blu=in produzione, verde=pronto, giallo=pubblicato, rosso=da riciclare, grigio=idea) con bordo coordinato. Mai un riempimento pieno e saturo — il chip deve restare leggero sopra la carta.
- **Identità cliente:** barra verticale di 4-8px nel colore assegnato al cliente (ambra, smeraldo, viola, blu, rosa), mai un riempimento di card intero.

### Cards / Containers
- **Corner Style:** raggio grande, 24px (rounded-[1.5rem]) per card di contenuto, 32px (rounded-[2rem]) per sheet e modali full-width.
- **Background:** Scheda (#FFFFFF) o Carta leggermente scura (Morbido #F1EDE5) per aree interattive annidate.
- **Shadow Strategy:** nessuna a riposo — vedi sezione Elevation. Solo bordo 1px colore Bordo.
- **Internal Padding:** 16px standard, 24px per composer e form principali.

### Inputs / Fields
- **Style:** sfondo Morbido (#F1EDE5), bordo 1px Bordo, raggio 16px (rounded-2xl) per campi singoli, 24px per textarea multi-riga.
- **Focus:** il bordo passa a Evidenziatore (#FFE500), nessun glow esterno — il cambio colore è il segnale.
- **Codice OTP:** caso speciale — testo centrato, 24px, font-weight 900, letter-spacing 0.4em, per leggibilità immediata di un codice numerico.

### Navigation
- **BottomNav:** barra flottante arrotondata (rounded-[1.8rem]) ancorata in basso, sfondo Carta semi-trasparente con `backdrop-blur-xl`, 5 voci massimo con icona + etichetta. Voce attiva: pillola Inchiostro Profondo con icona/testo Evidenziatore. Voce inattiva: icona/testo Tenue al 40% di opacità.
- **Tab interni (es. Settimana/Pipeline):** stesso pattern della BottomNav in scala ridotta — pillola scura per la voce attiva dentro un contenitore Scheda.

### Floating Action Button
- **Style:** cerchio pieno Evidenziatore, 52-56px, icona Inchiostro centrata, ombra Galleggiante Accento (vedi Elevation). Ancorato in basso a destra, sopra la BottomNav.

## 6. Do's and Don'ts

### Do:
- **Do** usare il punto giallo (`.`) a chiusura di ogni titolo Display — è la firma tipografica ricorrente del sistema.
- **Do** mantenere l'evidenziatore (#FFE500) tra il 10% e il 25% di superficie per schermata: presente come firma, mai come tappezzeria di sfondo.
- **Do** usare bordo sottile (1px, #DED8CC) come trattamento di default per ogni card a riposo; riservare l'ombra solo a elementi flottanti (nav, FAB, modali).
- **Do** distinguere sempre il colore funzionale (identità cliente, stato pipeline) dal colore di brand: barre sottili o chip piccoli, mai riempimenti pieni che competono con il giallo.
- **Do** chiudere ogni interazione di scrittura (inbox, chat, calendario) nel minor numero di tap possibile — la cattura senza attrito è un principio strategico, non solo visivo.

### Don't:
- **Don't** costruire griglie di card identiche e ripetute all'infinito — è il pattern SaaS generico che il prodotto rifiuta esplicitamente.
- **Don't** usare una palette "SaaS-cream" anonima: il crema di GROW (#F7F4EE) è scelto e tinteggiato, non un default neutro senza carattere.
- **Don't** aggiungere eyebrow uppercase sopra ogni sezione per riflesso — un'etichetta DM Mono ha senso solo quando introduce davvero un gruppo di contenuti distinto, non come decorazione automatica.
- **Don't** spargere badge colorati senza gerarchia: ogni colore funzionale deve avere un solo ruolo chiaro (cliente o stato, mai entrambi nello stesso elemento).
- **Don't** applicare ombre a card a riposo — la profondità in GROW è un segnale raro (galleggiamento), non una texture di default su ogni superficie.
- **Don't** scrivere microcopy rassicurante da assistente premuroso ("sono qui per aiutarti", "non esitare a chiedere") — il tono è quello di un collega senior diretto, non di un onboarding consumer.
- **Don't** scendere sotto 4.5:1 di contrasto per il testo Tenue (#5F5A52) su sfondo Carta (#F7F4EE) — area di rischio nota nel sistema, verificare sempre prima di spedire.
