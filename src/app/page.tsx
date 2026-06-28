'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import SaveHeart from '@/components/SaveHeart'

const placeholders: Record<string, string> = {
  branding: 'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=900&q=80',
  typography: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900&q=80',
  interior_design: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=80',
  fashion: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
  web: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=900&q=80',
  ai: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80',
  art: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=900&q=80',
  social_design: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&q=80',
  design: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=900&q=80',
  lifestyle: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=900&q=80',
}

const clients = [
  { name: 'ANventitre', color: '#2D4A1E', initials: 'AN' },
  { name: 'Exousia', color: '#1A3A2A', initials: 'EX' },
  { name: 'Cantina Don Carlo', color: '#6B2D1A', initials: 'DC' },
  { name: 'TRAMA', color: '#1A1A2E', initials: 'TR' },
]

const quickBriefs = [
  'Reel AN23 bottiglia in pineta',
  'Carosello Exousia finanza agevolata',
  'Mockup etichetta Cantina Don Carlo',
  'Visual TRAMA vintage opening',
]

function MiniCard({ item, saved }: { item: any; saved: boolean }) {
  const img = item.image_url || placeholders[item.category] || placeholders.design

  return (
    
      href={item.url !== '#' ? item.url : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block h-full overflow-hidden rounded-[1.1rem] bg-[#F1EDE5]"
    >
      <SaveHeart itemId={item.id} initialSaved={saved} />
      <img
        src={img}
        alt={item.title || ''}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
        loading="lazy"
        onError={(e) => {
          const t = e.target as HTMLImageElement
          t.src = placeholders.design
        }}
      />
    </a>
  )
}

export default function Home() {
  const [recentImages, setRecentImages] = useState<any[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savedCount, setSavedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/feed?type=image&limit=9')
      .then((r) => r.json())
      .then((d) => setRecentImages(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))

    fetch('/api/saved')
      .then((r) => r.json())
      .then((d) => {
        const items = d.items || []
        setSavedCount(items.length)
        setSavedIds(new Set(items.map((i: any) => i.id)))
      })
      .catch(() => {})
  }, [])

  const ora = new Date().getHours()
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera'

  return (
    <main className="min-h-screen bg-[#F7F4EE] pb-32 text-[#111111]">
      <div className="mx-auto max-w-lg px-4 pt-8">

        {/* Header */}
        <header className="mb-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#5F5A52]">
            {saluto}
          </p>
          <h1 className="mt-1 font-display text-[52px] font-black uppercase leading-[0.85] tracking-tighter">
            GROW<span className="text-[#FFE500]">.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#5F5A52]">
            Raccogli, organizza, trasforma in lavoro.
          </p>
        </header>

        {/* Nav cards */}
        <section className="mb-8 grid grid-cols-2 gap-3">
          <Link
            href="/scopri"
            className="group relative overflow-hidden rounded-[1.5rem] bg-[#0F0F10] p-5 text-white"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/40">Ispirati</p>
            <h2 className="mt-2 font-display text-2xl font-black uppercase leading-none">Scopri</h2>
            <p className="mt-1.5 text-xs leading-snug text-white/50">Reference, Are.na, mood visivi</p>
            <div className="mt-4 inline-flex rounded-full bg-[#FFE500] px-3 py-1.5 text-[10px] font-black uppercase text-black">
              Apri →
            </div>
          </Link>

          <Link
            href="/ai"
            className="group relative overflow-hidden rounded-[1.5rem] bg-[#FFE500] p-5 text-[#0F0F10]"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">Produci</p>
            <h2 className="mt-2 font-display text-2xl font-black uppercase leading-none">AI</h2>
            <p className="mt-1.5 text-xs leading-snug text-black/50">Brief → piano → output</p>
            <div className="mt-4 inline-flex rounded-full bg-[#0F0F10] px-3 py-1.5 text-[10px] font-black uppercase text-white">
              Scrivi →
            </div>
          </Link>

          <Link
            href="/archivio"
            className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#5F5A52]">Salvati</p>
            <h2 className="mt-2 font-display text-2xl font-black uppercase leading-none">Archivio</h2>
            <p className="mt-1.5 text-xs text-[#5F5A52]">
              {savedCount > 0 ? `${savedCount} reference` : 'Vuoto'}
            </p>
          </Link>

          <Link
            href="/studio"
            className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#5F5A52]">Lavora</p>
            <h2 className="mt-2 font-display text-2xl font-black uppercase leading-none">Studio</h2>
            <p className="mt-1.5 text-xs text-[#5F5A52]">Compila prompt, genera</p>
          </Link>
        </section>

        {/* Quick AI briefs */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#5F5A52]">
              Brief rapidi
            </p>
            <Link href="/ai" className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#5F5A52]">
              Tutti →
            </Link>
          </div>
          <div className="space-y-2">
            {quickBriefs.map((brief) => (
              <Link
                key={brief}
                href={`/ai?brief=${encodeURIComponent(brief)}`}
                className="flex items-center justify-between rounded-[1.1rem] border border-black/8 bg-white/60 px-4 py-3 transition hover:border-black/20 hover:bg-white"
              >
                <span className="text-sm font-bold">{brief}</span>
                <span className="font-mono text-[10px] font-bold uppercase text-[#5F5A52]">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Clienti */}
        <section className="mb-8">
          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#5F5A52]">
            Clienti attivi
          </p>
          <div className="grid grid-cols-4 gap-2">
            {clients.map((c) => (
              <Link
                key={c.name}
                href={`/ai?project=${encodeURIComponent(c.name)}`}
                className="flex flex-col items-center gap-2 rounded-[1.1rem] border border-black/8 bg-white/60 py-4 transition hover:border-black/20 hover:bg-white"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-black text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {c.initials}
                </div>
                <span className="text-center text-[9px] font-black uppercase leading-tight tracking-wider text-[#5F5A52]">
                  {c.name.split(' ')[0]}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Feed anteprima */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#5F5A52]">
              Ultimi arrivi
            </p>
            <Link href="/scopri" className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#5F5A52]">
              Vedi tutto →
            </Link>
          </div>

          {loading ? (
            <div className="grid auto-rows-[96px] grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className={['animate-pulse rounded-[1.1rem] bg-[#F1EDE5]', i === 0 ? 'row-span-2' : ''].join(' ')}
                />
              ))}
            </div>
          ) : recentImages.length > 0 ? (
            <div className="grid auto-rows-[96px] grid-cols-3 gap-2">
              {recentImages.map((item, idx) => (
                <div key={item.id} className={idx === 0 ? 'row-span-2' : 'row-span-1'}>
                  <MiniCard item={item} saved={savedIds.has(item.id)} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-black/10 bg-white/60 px-5 py-10 text-center">
              <p className="text-sm text-[#5F5A52]">Nessuna immagine ancora. Esegui fetch-images.</p>
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  )
}
