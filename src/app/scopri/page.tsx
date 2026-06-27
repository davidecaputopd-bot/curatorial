'use client'

import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'

const font = "Inter, 'Helvetica Neue', system-ui, sans-serif"

const categories = [
  { key: null, label: 'Tutto' },
  { key: 'ai', label: 'AI News' },
  { key: 'typography', label: 'Design' },
  { key: 'social', label: 'Social Media' },
  { key: 'branding', label: 'Branding' },
  { key: 'lifestyle', label: 'Ispirazione' },
  { key: 'growth', label: 'Produttività' },
]

const categoryLabels: Record<string, string> = {
  branding: 'BRANDING', typography: 'DESIGN', social: 'SOCIAL',
  lifestyle: 'ISPIRAZIONE', ai: 'AI', growth: 'PRODUTTIVITÀ',
}

const placeholders: Record<string, string> = {
  branding: 'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=600&q=80',
  typography: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80',
  social: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80',
  lifestyle: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&q=80',
  ai: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80',
  growth: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=600&q=80',
}

const DEMO: any[] = [
  { id: 'd1', title: 'Il futuro del design system nel 2025.', category: 'typography', url: '#', sources: { name: 'Design Weekly' }, published_at: new Date().toISOString(), read_time_minutes: 4 },
  { id: 'd2', title: 'Come ChatGPT sta cambiando il workflow creativo.', category: 'ai', url: '#', sources: { name: 'AI Insider' }, published_at: new Date().toISOString(), read_time_minutes: 6 },
  { id: 'd3', title: 'Branding autentico: costruire identità durature.', category: 'branding', url: '#', sources: { name: 'Brand Notes' }, published_at: new Date().toISOString(), read_time_minutes: 5 },
  { id: 'd4', title: 'Reels che convertono: struttura e hook.', category: 'social', url: '#', sources: { name: 'Social Lab' }, published_at: new Date().toISOString(), read_time_minutes: 3 },
  { id: 'd5', title: 'Flusso e concentrazione: il metodo Pomodoro evoluto.', category: 'growth', url: '#', sources: { name: 'Deep Work' }, published_at: new Date().toISOString(), read_time_minutes: 5 },
  { id: 'd6', title: 'Minimalismo visivo come scelta editoriale.', category: 'lifestyle', url: '#', sources: { name: 'Aesthetic Notes' }, published_at: new Date().toISOString(), read_time_minutes: 4 },
]

function timeAgo(date: string) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days === 0) return 'Oggi'
  if (days === 1) return 'Ieri'
  return `${days}g fa`
}

export default function ScopriPage() {
  const [active, setActive] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>(DEMO)
  const [loading, setLoading] = useState(false)

  const load = async (cat: string | null) => {
    setActive(cat)
    setLoading(true)
    try {
      const url = cat ? `/api/feed?category=${cat}&limit=30` : '/api/feed?limit=30'
      const res = await fetch(url)
      const data = await res.json()
      setItems(data.items?.length ? data.items : DEMO.filter(i => !cat || i.category === cat))
    } catch {
      setItems(DEMO.filter(i => !cat || i.category === cat))
    } finally {
      setLoading(false)
    }
  }

  const filtered = active ? items.filter(i => i.category === active) : items

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text" style={{ fontFamily: font }}>
      <div className="mx-auto max-w-lg px-4 pt-12">
        <header className="mb-6">
          <h1 className="text-[26px] font-black uppercase tracking-tight">
            Scopri<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-1 text-sm text-grow-muted">Contenuti selezionati per te.</p>
        </header>

        {/* Category chips */}
        <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-4">
          {categories.map(c => (
            <button
              key={c.key ?? 'all'}
              onClick={() => load(c.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active === c.key
                  ? 'bg-grow-yellow text-grow-text'
                  : 'border border-grow-border bg-grow-soft text-grow-text'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-grow-yellow" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item, idx) => (
              
                key={item.id}
                href={item.url === '#' ? undefined : item.url}
                target={item.url !== '#' ? '_blank' : undefined}
                rel="noopener noreferrer"
                className={`group block overflow-hidden rounded-[16px] border border-grow-border bg-grow-card ${
                  idx === 0 ? 'col-span-2' : ''
                }`}
              >
                <img
                  src={item.image_url || placeholders[item.category] || placeholders.lifestyle}
                  alt=""
                  className={`w-full object-cover ${idx === 0 ? 'h-48' : 'h-32'}`}
                />
                <div className="p-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-grow-yellow">
                    {categoryLabels[item.category] || item.category?.toUpperCase()}
                  </span>
                  <h3 className="mt-1 text-sm font-bold leading-snug text-grow-text line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[11px] text-grow-muted">
                    {item.sources?.name} · {timeAgo(item.published_at)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
