'use client'

import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'

const font = "Inter, 'Helvetica Neue', system-ui, sans-serif"

const placeholders: Record<string, string> = {
  branding: 'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=400&q=80',
  typography: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80',
  social: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80',
  lifestyle: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&q=80',
  ai: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80',
  growth: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=400&q=80',
}

const categoryLabels: Record<string, string> = {
  branding: 'BRANDING', typography: 'DESIGN', social: 'SOCIAL',
  lifestyle: 'ISPIRAZIONE', ai: 'AI', growth: 'PRODUTTIVITÀ',
}

function timeAgo(date: string) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days === 0) return 'Oggi'
  if (days === 1) return 'Ieri'
  return `${days}g fa`
}

export default function SalvatiPage() {
  const [saved, setSaved] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/feed?saved=true&limit=50')
        const data = await res.json()
        setSaved(data.items || [])
      } catch {
        setSaved([])
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [])

  const remove = (id: string) => {
    setSaved(prev => prev.filter(i => i.id !== id))
    fetch('/api/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_id: id, action: 'unsave' }),
    })
  }

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text" style={{ fontFamily: font }}>
      <div className="mx-auto max-w-lg px-4 pt-12">
        <header className="mb-6">
          <h1 className="text-[26px] font-black uppercase tracking-tight">
            Salvati<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-1 text-sm text-grow-muted">
            {saved.length > 0 ? `${saved.length} contenuti salvati` : 'I tuoi contenuti preferiti'}
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-grow-yellow" />
          </div>
        ) : saved.length === 0 ? (
          <div className="rounded-[20px] border border-grow-border bg-grow-card px-6 py-16 text-center">
            <svg className="mx-auto mb-4 text-grow-muted" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v18l-7-4-7 4V4z" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-semibold text-grow-text">Nessun contenuto salvato</p>
            <p className="mt-1 text-xs text-grow-muted">Usa l'icona 🔖 per salvare articoli dal feed.</p>
          </div>
        ) : (
          <div className="space-y-0 rounded-[20px] border border-grow-border bg-grow-card px-4">
            {saved.map((item, i) => (
              <article key={item.id} className={`flex gap-3 py-4 ${i < saved.length - 1 ? 'border-b border-grow-border' : ''}`}>
                <img
                  src={item.image_url || placeholders[item.category] || placeholders.lifestyle}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-grow-yellow">
                    {categoryLabels[item.category] || item.category?.toUpperCase()}
                  </span>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <h3 className="mt-1 text-[15px] font-bold leading-snug text-grow-text line-clamp-2">
                      {item.title}
                    </h3>
                  </a>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[11px] text-grow-muted">
                      {item.sources?.name} · {timeAgo(item.published_at)}
                    </p>
                    <button onClick={() => remove(item.id)} className="text-grow-muted hover:text-red-400 transition-colors" aria-label="Rimuovi">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v18l-7-4-7 4V4z" strokeLinejoin="round" fill="currentColor" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
