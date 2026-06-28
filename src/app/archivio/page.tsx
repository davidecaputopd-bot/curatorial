'use client'

import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'

const font = "Inter, 'Helvetica Neue', system-ui, sans-serif"

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

export default function ArchivioPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/saved')
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))

    try {
      await fetch('/api/interact', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: id, itemId: id }),
      })
    } catch {}
  }

  return (
    <main className="min-h-screen bg-grow-bg px-4 pb-32 pt-10 text-grow-text" style={{ fontFamily: font }}>
      <section className="mx-auto max-w-lg">
        <header className="mb-7">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-grow-muted">
            GROW Archivio
          </p>

          <h1 className="mt-2 text-[38px] font-black uppercase leading-[0.88] tracking-tighter">
            Salvati<span className="text-grow-yellow">.</span>
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-grow-muted">
            Reference, immagini, mood e materiali che hai scelto. Qui GROW inizia a diventare memoria creativa.
          </p>
        </header>

        {loading ? (
          <div className="grid auto-rows-[124px] grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={[
                  'animate-pulse rounded-[1.6rem] bg-grow-soft',
                  i % 3 === 0 ? 'row-span-2' : '',
                ].join(' ')}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[2rem] border border-black/10 bg-white/70 px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE500] text-2xl">
              ♥
            </div>

            <h2 className="mt-5 text-xl font-black uppercase tracking-tight">
              Nulla salvato
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-grow-muted">
              Vai su Scopri e usa il cuore giallo sulle reference che vuoi tenere.
            </p>
          </div>
        ) : (
          <div className="grid auto-rows-[124px] grid-cols-2 gap-3">
            {items.map((item, idx) => {
              const img = item.image_url || placeholders[item.category] || placeholders.design
              const tall = idx % 4 === 0 || (item.height || 0) > (item.width || 0)

              return (
                <article
                  key={item.id}
                  className={[
                    'group relative overflow-hidden rounded-[1.6rem] bg-grow-soft',
                    tall ? 'row-span-2' : 'row-span-1',
                  ].join(' ')}
                >
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="block h-full">
                    <img src={img} alt={item.title || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.045]" />
                  </a>

                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#FFE500] text-[#0F0F10] shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition-transform hover:scale-110"
                    aria-label="Rimuovi dai salvati"
                  >
                    ♥
                  </button>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#FFE500]">
                      {item.category || 'reference'}
                    </p>

                    {item.title && (
                      <h2 className="mt-1 line-clamp-2 text-xs font-bold leading-tight text-white">
                        {item.title}
                      </h2>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  )
}
