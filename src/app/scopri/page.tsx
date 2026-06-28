'use client'

import { useEffect, useRef, useState } from 'react'
import BottomNav from '@/components/BottomNav'

const font = "Inter, 'Helvetica Neue', system-ui, sans-serif"

const categories = [
  { key: null, label: 'Tutto' },
  { key: 'branding', label: 'Branding' },
  { key: 'typography', label: 'Tipo' },
  { key: 'interior_design', label: 'Interni' },
  { key: 'fashion', label: 'Moda' },
  { key: 'web', label: 'Web' },
  { key: 'ai', label: 'AI' },
  { key: '3d_printing', label: '3D' },
  { key: 'art', label: 'Arte' },
  { key: 'social_design', label: 'Social' },
  { key: 'design', label: 'Design' },
  { key: 'lifestyle', label: 'Lifestyle' },
]

const categoryLabels: Record<string, string> = {
  branding: 'Branding', typography: 'Tipografia', interior_design: 'Interni',
  fashion: 'Moda', web: 'Web', ai: 'AI', '3d_printing': '3D Print',
  art: 'Arte', social_design: 'Social Design', design: 'Design',
  lifestyle: 'Lifestyle', social: 'Social', growth: 'Crescita',
}

const placeholders: Record<string, string> = {
  branding: 'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=800&q=80',
  typography: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80',
  interior_design: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
  fashion: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  web: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&q=80',
  ai: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80',
  '3d_printing': 'https://images.unsplash.com/photo-1581092921461-39b9d08a9b21?w=800&q=80',
  art: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800&q=80',
  social_design: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
  design: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80',
  lifestyle: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80',
  social: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
  growth: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=800&q=80',
}

// Layout Cosmos: sequenza di pattern che si ripete
// tall = 2 righe altezza, wide = full width, square = normale
type CardSize = 'wide' | 'tall' | 'square'

function getCardSize(idx: number, isSerendipity: boolean): CardSize {
  // Pattern che si ripete ogni 7 card
  const pattern: CardSize[] = ['wide', 'tall', 'square', 'square', 'wide', 'square', 'tall']
  if (isSerendipity) return 'wide' // le sorprese escono sempre full width
  return pattern[idx % pattern.length]
}

function timeAgo(date: string) {
  const hours = Math.floor((Date.now() - new Date(date).getTime()) / 3600000)
  if (hours < 1) return 'Adesso'
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ieri'
  return `${days}g fa`
}

function CardImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [error, setError] = useState(false)
  return (
    <img
      src={error ? placeholders.design : src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  )
}

function FeedCard({ item, idx, onDwell }: { item: any; idx: number; onDwell: (id: string, seconds: number) => void }) {
  const enterTime = useRef<number>(0)
  const size = getCardSize(idx, item.is_serendipity)
  const imgSrc = item.image_url || placeholders[item.category] || placeholders.design

  const imageHeight = size === 'wide' ? 'h-52' : size === 'tall' ? 'h-48' : 'h-28'
  const colSpan = size === 'wide' ? 'col-span-2' : size === 'tall' ? 'col-span-1 row-span-2' : 'col-span-1'

  return (
    
      href={item.url === '#' ? undefined : item.url}
      target={item.url !== '#' ? '_blank' : undefined}
      rel="noopener noreferrer"
      className={`group relative block overflow-hidden rounded-2xl border bg-grow-card transition-all duration-200 hover:scale-[1.01] hover:shadow-lg ${colSpan} ${item.is_serendipity ? 'border-grow-yellow/40' : 'border-grow-border'}`}
      onMouseEnter={() => { enterTime.current = Date.now() }}
      onMouseLeave={() => {
        const seconds = (Date.now() - enterTime.current) / 1000
        if (seconds > 1) onDwell(item.id, seconds)
      }}
      onTouchStart={() => { enterTime.current = Date.now() }}
      onTouchEnd={() => {
        const seconds = (Date.now() - enterTime.current) / 1000
        if (seconds > 1) onDwell(item.id, seconds)
      }}
    >
      {item.is_serendipity && (
        <div className="absolute right-2 top-2 z-10 rounded-full bg-grow-yellow/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-grow-bg">
          Scopri
        </div>
      )}
      <CardImage
        src={imgSrc}
        alt={item.title}
        className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${imageHeight}`}
      />
      <div className="p-3">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-grow-yellow">
          {categoryLabels[item.category] || item.category?.toUpperCase()}
        </span>
        <h3 className={`mt-1 font-bold leading-snug text-grow-text line-clamp-2 ${size === 'wide' ? 'text-[15px]' : 'text-[12px]'}`}>
          {item.title}
        </h3>
        <p className="mt-1.5 text-[10px] text-grow-muted">
          {item.sources?.name} · {timeAgo(item.published_at)}
        </p>
      </div>
    </a>
  )
}

export default function ScopriPage() {
  const [active, setActive] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async (cat: string | null) => {
    setActive(cat)
    setLoading(true)
    try {
      const url = cat ? `/api/feed?category=${cat}&limit=40` : '/api/feed?limit=40'
      const res = await fetch(url)
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(null) }, [])

  const handleDwell = async (itemId: string, seconds: number) => {
    try {
      await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action: 'dwell', seconds })
      })
    } catch { /* silenzioso */ }
  }

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text" style={{ fontFamily: font }}>
      <div className="mx-auto max-w-lg px-4 pt-12">

        <header className="mb-6">
          <h1 className="text-[26px] font-black uppercase tracking-tight">
            Scopri<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-1 text-sm text-grow-muted">Curato per te · aggiornato ogni notte</p>
        </header>

        {/* Filtri categoria */}
        <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-4">
          {categories.map(c => (
            <button
              key={c.key ?? 'all'}
              onClick={() => load(c.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active === c.key
                  ? 'bg-grow-yellow text-grow-bg'
                  : 'border border-grow-border bg-grow-soft text-grow-muted hover:text-grow-text'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`animate-pulse rounded-2xl bg-grow-soft ${i % 3 === 0 ? 'col-span-2 h-52' : 'h-44'}`}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-grow-muted">
            <p className="text-4xl mb-3">○</p>
            <p className="text-sm">Nessun contenuto per questa categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 auto-rows-auto">
            {items.map((item, idx) => (
              <FeedCard
                key={item.id}
                item={item}
                idx={idx}
                onDwell={handleDwell}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
