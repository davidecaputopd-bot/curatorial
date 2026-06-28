# GROW — Contesto progetto

## Stack
- Next.js (src/ directory, App Router), Tailwind, TypeScript
- Supabase (PostgreSQL): tabelle `content_items`, `sources`, `user_profile`, `interactions`, `chat_history`
- Vercel deploy: `npx vercel --prod`
- Git remote: vedi configurazione locale

## Variabili d'ambiente (Vercel)
SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_URL, GROQ_API_KEY, GEMINI_API_KEY, HF_TOKEN

## Struttura
src/app/
  ai/page.tsx      — chat AI
  scopri/          — feed RSS
  salvati/         — articoli salvati (da collegare)
  mind/            — focus timer, breathing, memory game
src/app/api/
  chat/            — Gemini 2.5 Flash primary, Groq fallback
  chat-history/    — CRUD cronologia su Supabase
  feed/            — algoritmo con pesi categoria
  fetch-rss/       — fetch articoli RSS
  interact/        — salvataggio interazioni

## Cosa funziona
- Feed RSS: 190+ articoli, algoritmo pesi (80% preferiti + 20% serendipity)
- /ai: Gemini 2.5 Flash + Groq fallback, cronologia su Supabase
- /mind: Focus timer 25m, Box breathing, Memory grid
- /scopri, /salvati: pagine attive

## Cosa manca / bug noti
- Feed rotti da disabilitare su Supabase: Later Blog, Fast Company Design (404)
- /salvati: mostra sempre vuoto, logica salvataggio da collegare
- Cron notturno fetch-rss: aggiungere vercel.json
- Meta title: ancora "Create Next App"

## Design system
- Font: Bebas Neue (display), DM Mono (label), DM Sans Light (body)
- Colore accent: Imperial Crimson #AF0E1E
- Palette Tailwind: grow-bg, grow-card, grow-soft, grow-border, grow-text, grow-muted, grow-yellow, grow-black
- Stile: minimal, editoriale, dark-friendly

## Proprietario
Davide Caputo — art director freelance, Leverano (Salento)
Clienti attivi: ANventitre, Exousia, Cantina Don Carlo, TRAMA
