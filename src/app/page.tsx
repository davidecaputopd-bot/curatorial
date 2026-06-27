'use client'

import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'

/* ─── Design tokens ─── */
const font = "Inter, 'Helvetica Neue', system-ui, sans-serif"

const categoryPlaceholders: Record<string, string> = {
  branding: 'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=800&q=80',
  typography: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80',
  social: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
  lifestyle: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80',
  ai: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80',
  growth: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=800&q=80',
}

const categoryLabels: Record<string, string> = {
  branding: 'BRANDING',
  typography: 'DESIGN',
  social: 'SOCIAL',
  lifestyle: 'ISPIRAZIONE',
  ai: 'AI',
  growth: 'PRODUTTIVITÀ',
}

const chips = [
  { key: null, label: 'Tutte' },
  { key: 'ai', label: 'AI News' },
  { key: 'lifestyle', label: 'Ispirazione' },
  { key: 'growth', label: 'Produttività' },
  { key: 'social', label: 'Marketing' },
  { key: 'typography', label: 'Design' },
]

const DEMO_HERO = {
  id: 'demo-hero',
  title: 'Il ritorno del brand craft: autenticità come vantaggio.',
  category: 'branding',
  image_url: categoryPlaceholders.branding,
  url: '#',
  read_time_minutes: 6,
  sources: { name: 'Martina Russo' },
  published_at: new Date().toISOString(),
}

const DEMO_ITEMS = [
  {
    id: 'demo-1',
    title: 'Costruire brand che lasciano traccia.',
    category: 'lifestyle',
    image_url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&q=80',
    url: '#',
    read_time_minutes: 6,
    sources: { name: 'Martina Russo' },
    published_at: new Date().toISOString(),
    description: 'Strategie, esempi e insight per creare valore autentico.',
  },
  {
    id: 'demo-2',
    title: 'Tipografia editoriale nel 2025.',
    category: 'typography',
    image_url: categoryPlaceholders.typography,
    url: '#',
    read_time_minutes: 4,
    sources: { name: 'Design Weekly' },
    published_at: new Date(Date.now() - 86400000).toISOString(),
    description: 'Come scegliere font che comunicano senza gridare.',
  },
  {
    id: 'demo-3',
    title: 'Social media: meno post, più valore.',
    category: 'social',
    image_url: categoryPlaceholders.social,
    url: '#',
    read_time_minutes: 5,
    sources: { name: 'Growth Lab' },
    published_at: new Date(Date.now() - 172800000).toISOString(),
    description: 'Un approccio editoriale per i contenuti social.',
  },
]

const AI_UPDATES = [
  {
    name: 'OpenAI',
    description: 'GPT-4o migliora la comprensione visiva e dei file allegati.',
    time: 'Oggi',
    icon: '◯',
  },
  {
    name: 'Adobe Firefly',
    description: 'Nuovi strumenti per editing generativo integrato.',
    time: 'Ieri',
    icon: '✦',
  },
  {
    name: 'Runway',
    description: 'Gen-3 Alpha: video AI più fluidi e controllabili.',
    time: '2g fa',
    icon: '▶',
  },
]

/* ─── Types ─── */
type FeedItem = {
  id: string
  title: string
  category: string
  image_url?: string
  url: string
  read_time_minutes?: number
  sources?: { name: string }
  published_at: string
  description?: string
  type?: string
  video_id?: string
}

/* ─── Helpers ─── */
function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Oggi'
  if (days === 1) return 'Ieri'
  return `${days}g fa`
}

function getCategoryLabel(category?: string) {
  if (!category) return 'ISPIRAZIONE'
  return categoryLabels[category] || category.toUpperCase()
}

function getImage(item: FeedItem) {
  if (item.type === 'video' && item.video_id) {
    return `https://img.youtube.com/vi/${item.video_id}/mqdefault.jpg`
  }
  return item.image_url || categoryPlaceholders[item.category] || categoryPlaceholders.lifestyle
}

function getReadingTime(item: FeedItem) {
  return item.read_time_minutes || 3
}

/* ─── Sub-components ─── */
function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'bg-grow-yellow text-grow-text'
          : 'border border-grow-border bg-grow-soft text-grow-text'
      }`}
    >
      {label}
    </button>
  )
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
      <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v18l-7-4-7 4V4z" strokeLinejoin="round" />
    </svg>
  )
}

function HeroCard({
  item,
  onSave,
}: {
  item: FeedItem
  onSave: (id: string) => void
}) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
      <article className="relative mb-6 overflow-hidden rounded-[20px]">
        <img
          src={getImage(item)}
          alt={item.title}
          className="h-[280px] w-full object-cover sm:h-[300px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-grow-yellow">
            {getCategoryLabel(item.category)}
          </span>
          <h2 className="mt-2 text-[22px] font-bold leading-tight text-white sm:text-2xl">
            {item.title}
          </h2>
          <div className="mt-3 flex items-end justify-between gap-3">
            <span className="text-xs text-white/75">
              di {item.sources?.name || 'GROW'} · {getReadingTime(item)} min lettura
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onSave(item.id)
              }}
              className="text-white/90 transition-opacity hover:opacity-100"
              aria-label="Salva"
            >
              <BookmarkIcon />
            </button>
          </div>
        </div>
      </article>
    </a>
  )
}

function FeedItemCard({
  item,
  onSave,
}: {
  item: FeedItem
  onSave: (id: string) => void
}) {
  const description =
    item.description ||
    (item.title.length > 60 ? `${item.title.slice(0, 80)}…` : '')

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
      <article className="flex gap-3 border-b border-grow-border py-4 last:border-b-0">
        <img
          src={getImage(item)}
          alt=""
          className="h-20 w-20 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-grow-muted">
              {getCategoryLabel(item.category)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onSave(item.id)
              }}
              className="shrink-0 text-grow-muted transition-colors hover:text-grow-text"
              aria-label="Salva"
            >
              <BookmarkIcon />
            </button>
          </div>
          <h3 className="mt-1 text-[17px] font-bold leading-snug text-grow-text">
            {item.title}
          </h3>
          {description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-grow-muted">
              {description}
            </p>
          )}
          <p className="mt-2 text-[11px] text-grow-muted">
            {item.sources?.name || 'GROW'} · {getReadingTime(item)} min lettura
          </p>
        </div>
      </article>
    </a>
  )
}

function PromptCard() {
  return (
    <article className="relative mb-4 overflow-hidden rounded-[20px] bg-grow-yellow p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-grow-text">
        Prompt del giorno
      </p>
      <p className="mt-3 max-w-[85%] text-lg font-bold leading-snug text-grow-text">
        Idea una campagna social per un brand di caffè specialty rivolto a giovani creativi.
      </p>
      <button
        type="button"
        className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-grow-black text-grow-yellow"
        aria-label="Apri prompt"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 17L17 7M17 7H9M17 7v8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </article>
  )
}

function MindQuickCard() {
  const grid = [
    'bg-grow-black', 'bg-grow-soft', 'bg-grow-yellow',
    'bg-grow-soft', 'bg-grow-black', 'bg-grow-soft',
    'bg-grow-yellow', 'bg-grow-soft', 'bg-grow-black',
  ]

  return (
    <article className="flex flex-1 flex-col rounded-[20px] border border-grow-border bg-grow-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted">
        Allena la mente
      </p>
      <h3 className="mt-2 text-base font-bold text-grow-text">Griglia di memoria</h3>
      <p className="text-xs font-semibold text-grow-muted">Livello 3</p>
      <p className="mt-1 text-xs leading-relaxed text-grow-muted">
        Allena la tua memoria visiva.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1">
        {grid.map((color, i) => (
          <div key={i} className={`aspect-square rounded-sm ${color}`} />
        ))}
      </div>
      <button
        type="button"
        className="mt-4 inline-flex items-center gap-1 self-start rounded-full bg-grow-yellow px-4 py-2 text-xs font-bold text-grow-text"
      >
        Inizia
        <span aria-hidden>→</span>
      </button>
    </article>
  )
}

function AssistantCard() {
  return (
    <article className="flex flex-1 flex-col rounded-[20px] border border-grow-border bg-grow-card p-4">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted">
          Assistente rapido
        </p>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-grow-muted">
          <path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.2-3.6A7.8 7.8 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-grow-muted">
        Hai bisogno di un&apos;idea, di un riassunto o di aiuto su un progetto?
      </p>
      <button
        type="button"
        className="mt-4 inline-flex items-center gap-1 self-start rounded-full bg-grow-yellow px-4 py-2 text-xs font-bold text-grow-text"
      >
        Apri Assistente
        <span aria-hidden>→</span>
      </button>
    </article>
  )
}

function AiUpdatesSection({ items }: { items: typeof AI_UPDATES }) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-grow-muted">
          Aggiornamenti AI
        </h2>
        <button type="button" className="text-xs font-semibold text-grow-muted">
          Vedi tutti
        </button>
      </div>
      <div className="overflow-hidden rounded-[20px] border border-grow-border bg-grow-card">
        {items.map((update, i) => (
          <div
            key={update.name}
            className={`flex items-start gap-3 px-4 py-3.5 ${
              i < items.length - 1 ? 'border-b border-grow-border' : ''
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-grow-black text-sm text-white">
              {update.name === 'OpenAI' ? '◯' : update.name === 'Adobe Firefly' ? '✦' : '▶'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-grow-text">{update.name}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-grow-yellow" />
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-grow-muted">
                {update.description}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-grow-muted">{update.time}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="h-8 w-8 animate-pulse rounded-full bg-grow-yellow" />
      <p className="mt-4 text-sm font-medium text-grow-muted">Caricamento contenuti…</p>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-[20px] border border-grow-border bg-grow-card px-5 py-8 text-center">
      <p className="text-sm font-semibold text-grow-text">Impossibile caricare il feed.</p>
      <p className="mt-1 text-xs text-grow-muted">Controlla la connessione e riprova.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full bg-grow-yellow px-5 py-2 text-xs font-bold text-grow-text"
      >
        Riprova
      </button>
    </div>
  )
}

/* ─── Page ─── */
export default function Home() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [usingDemo, setUsingDemo] = useState(false)

  const loadFeed = async (category: string | null = null) => {
    setLoading(true)
    setError(false)
    try {
      const url = category
        ? `/api/feed?category=${category}&limit=20`
        : '/api/feed?limit=20'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Feed error')
      const data = await res.json()
      const feedItems: FeedItem[] = data.items || []
      if (feedItems.length === 0) {
        setItems(category ? [] : [DEMO_HERO, ...DEMO_ITEMS])
        setUsingDemo(true)
      } else {
        setItems(feedItems)
        setUsingDemo(false)
      }
    } catch {
      setItems([DEMO_HERO, ...DEMO_ITEMS])
      setUsingDemo(true)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeed()
  }, [])

  const interact = async (id: string, action: string) => {
    if (id.startsWith('demo-')) return
    await fetch('/api/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_id: id, action }),
    })
  }

  const hero = items[0]
  const rest = items.slice(1)

  const aiFromFeed = items
    .filter((i) => i.category === 'ai')
    .slice(0, 3)
    .map((i) => ({
      name: i.sources?.name || 'AI',
      description: i.title,
      time: timeAgo(i.published_at),
      icon: '◯',
    }))

  const aiUpdates = aiFromFeed.length >= 2 ? aiFromFeed : AI_UPDATES

  return (
    <main
      className="min-h-screen bg-grow-bg pb-28 text-grow-text"
      style={{ fontFamily: font }}
    >
      <div className="mx-auto max-w-lg px-4 pt-12">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-[26px] font-black uppercase tracking-tight">
            GROW<span className="text-grow-yellow">.</span>
          </h1>
          <div className="flex items-center gap-3">
            <button type="button" className="text-grow-text" aria-label="Notifiche">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-grow-yellow bg-grow-soft text-sm font-bold">
              D
            </div>
          </div>
        </header>

        {/* Greeting */}
        <section className="mb-6">
          <p className="text-xl font-bold leading-snug">Buongiorno, Davide</p>
          <p className="mt-1 text-sm text-grow-muted">
            Oggi è il momento di fare un passo avanti.
          </p>
        </section>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {error && (
              <div className="mb-4">
                <ErrorState onRetry={() => loadFeed(activeCategory)} />
              </div>
            )}

            {usingDemo && !error && (
              <p className="mb-4 text-center text-[11px] text-grow-muted">
                Contenuti di esempio — il feed si aggiornerà appena disponibile.
              </p>
            )}

            {/* Hero */}
            {hero && (
              <HeroCard item={hero} onSave={(id) => interact(id, 'save')} />
            )}

            {/* AI Updates */}
            <AiUpdatesSection items={aiUpdates} />

            {/* Prompt del giorno */}
            <PromptCard />

            {/* Mind + Assistant */}
            <div className="mb-6 flex gap-3">
              <MindQuickCard />
              <AssistantCard />
            </div>

            {/* Category chips */}
            <section className="mb-2">
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-grow-muted">
                Scopri per categoria
              </h2>
              <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
                {chips.map((chip) => (
                  <Chip
                    key={chip.key ?? 'all'}
                    label={chip.label}
                    active={activeCategory === chip.key}
                    onClick={() => {
                      setActiveCategory(chip.key)
                      loadFeed(chip.key)
                    }}
                  />
                ))}
              </div>
            </section>

            {/* Article list */}
            <section className="rounded-[20px] border border-grow-border bg-grow-card px-4">
              {rest.length === 0 ? (
                <p className="py-10 text-center text-sm text-grow-muted">
                  Nessun altro contenuto in questa categoria.
                </p>
              ) : (
                rest.map((item) => (
                  <FeedItemCard
                    key={item.id}
                    item={item}
                    onSave={(id) => interact(id, 'save')}
                  />
                ))
              )}
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
