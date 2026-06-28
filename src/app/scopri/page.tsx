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

function timeAgo(date: string): string {
  const hours = Math.floor((Date.now() - new Date(date).getTime()) / 3600000)
  if (hours < 1) return 'Adesso'
  if (hours < 24) return hours + 'h fa'
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ieri'
  return days + 'g fa'
}

function SafeImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [err, setErr] = useState(false)
  return <img src={err ? placeholders.design : src} alt={alt} className={className} onError={() => setErr(true)} loading="lazy" />
}

function ImageCard({ item, onDwell }: { item: any; onDwell: (id: string, s: number) => void }) {
  const t = useRef(0)
  const enter = () => { t.current = Date.now() }
  const leave = () => { const s = (Date.now() - t.current) / 1000; if (s > 1) onDwell(item.id, s) }
  const imgSrc = item.image_url || placeholders[item.category as string] || placeholders.design
  const cls = 'group relative block overflow-hidden rounded-xl bg-grow-soft w-full h-full'
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={cls} onMouseEnter={enter} onMouseLeave={leave} onTouchStart={enter} onTouchEnd={leave}>
      <SafeImage src={imgSrc} alt={item.title || ''} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-2">
          {item.artist_name && <p className="text-[10px] text-white/90 font-medium truncate">{item.artist_name}</p>}
          {item.dominant_color && (
            <div className="mt-1 flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full border border-white/30" style={{ backgroundColor: item.dominant_color }} />
              <span className="text-[9px] text-white/60">{item.dominant_color}</span>
            </div>
          )}
        </div>
      </div>
    </a>
  )
}

function ArticleCard({ item, idx, onDwell }: { item: any; idx: number; onDwell: (id: string, s: number) => void }) {
  const t = useRef(0)
  const isWide = idx % 5 === 0
  const enter = () => { t.current = Date.now() }
  const leave = () => { const s = (Date.now() - t.current) / 1000; if (s > 1) onDwell(item.id, s) }
  const imgSrc = item.image_url || placeholders[item.category as string] || placeholders.design
  const wrapCls = 'group relative block overflow-hidden rounded-2xl border bg-grow-card transition-all duration-200 hover:scale-[1.01] ' + (isWide ? 'col-span-2' : 'col-span-1') + ' ' + (item.is_serendipity ? 'border-grow-yellow/40' : 'border-grow-border')
  const href = item.url === '#' ? undefined : item.url
  const target = item.url !== '#' ? '_blank' : undefined
  return (
    <a href={href} target={target} rel="noopener noreferrer" className={wrapCls} onMouseEnter={enter} onMouseLeave={leave} onTouchStart={enter} onTouchEnd={leave}>
      {item.is_serendipity && <div className="absolute right-2 top-2 z-10 rounded-full bg-grow-yellow/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-grow-bg">Scopri</div>}
      <SafeImage src={imgSrc} alt={item.title} className={'w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ' + (isWide ? 'h-48' : 'h-28')} />
      <div className="p-3">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-grow-yellow">{categoryLabels[item.category] || item.category}</span>
        <h3 className={'mt-1 font-bold leading-snug text-grow-text line-clamp-2 ' + (isWide ? 'text-[14px]' : 'text-[12px]')}>{item.title}</h3>
        <p className="mt-1.5 text-[10px] text-grow-muted">{item.sources?.name} · {timeAgo(item.published_at)}</p>
      </div>
    </a>
  )
}

export default function ScopriPage() {
  const [active, setActive] = useState<string | null>(null)
  const [images, setImages] = useState<any[]>([])
  const [articles, setArticles] = useState<any[]>([])
  const [loadingImages, setLoadingImages] = useState(true)
  const [loadingArticles, setLoadingArticles] = useState(true)

  const load = async (cat: string | null) => {
    setActive(cat)
    setLoadingImages(true)
    setLoadingArticles(true)
    const p = cat ? '&category=' + cat : ''
    fetch('/api/feed?type=image&limit=24' + p).then(r => r.json()).then(d => setImages(d.items || [])).catch(() => setImages([])).finally(() => setLoadingImages(false))
    fetch('/api/feed?type=article&limit=20' + p).then(r => r.json()).then(d => setArticles(d.items || [])).catch(() => setArticles([])).finally(() => setLoadingArticles(false))
  }

  useEffect(() => { load(null) }, [])

  const handleDwell = async (itemId: string, seconds: number) => {
    try { await fetch('/api/interact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId, action: 'dwell', seconds }) }) } catch {}
  }

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text" style={{ fontFamily: font }}>
      <div className="mx-auto max-w-lg px-4 pt-12">
        <header className="mb-6">
          <h1 className="text-[26px] font-black uppercase tracking-tight">Scopri<span className="text-grow-yellow">.</span></h1>
          <p className="mt-1 text-sm text-grow-muted">Curato per te · aggiornato ogni notte</p>
        </header>

        <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-4">
          {categories.map(c => (
            <button key={c.key ?? 'all'} onClick={() => load(c.key)} className={'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ' + (active === c.key ? 'bg-grow-yellow text-grow-bg' : 'border border-grow-border bg-grow-soft text-grow-muted hover:text-grow-text')}>
              {c.label}
            </button>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-grow-muted">Immagini</h2>
          {loadingImages ? (
            <div className="grid grid-cols-3 gap-2 auto-rows-[120px]">
              {Array.from({ length: 9 }).map((_, i) => <div key={i} className={'animate-pulse rounded-xl bg-grow-soft ' + (i % 4 === 0 ? 'row-span-2' : '')} />)}
            </div>
          ) : images.length === 0 ? (
            <p className="py-8 text-center text-sm text-grow-muted">Esegui /api/fetch-images per popolare.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 auto-rows-[120px]">
              {images.map((item, idx) => {
                const isPortrait = (item.height || 0) > (item.width || 0)
                const isBig = idx % 6 === 0
                return <div key={item.id} className={isBig || isPortrait ? 'row-span-2' : 'row-span-1'}><ImageCard item={item} onDwell={handleDwell} /></div>
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-grow-muted">Articoli</h2>
          {loadingArticles ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className={'animate-pulse rounded-2xl bg-grow-soft ' + (i % 5 === 0 ? 'col-span-2 h-48' : 'h-40')} />)}
            </div>
          ) : articles.length === 0 ? (
            <p className="py-8 text-center text-sm text-grow-muted">Nessun articolo disponibile.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {articles.map((item, idx) => <ArticleCard key={item.id} item={item} idx={idx} onDwell={handleDwell} />)}
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  )
}