'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
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
  { key: 'art', label: 'Arte' },
  { key: 'social_design', label: 'Social' },
]

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

function SafeImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [err, setErr] = useState(false)

  return (
    <img
      src={err ? placeholders.design : src}
      alt={alt}
      className={className}
      onError={() => setErr(true)}
      loading="lazy"
    />
  )
}

function VisualCard({ item, idx }: { item: any; idx: number }) {
  const imgSrc = item.image_url || placeholders[item.category as string] || placeholders.design
  const href = item.url === '#' ? undefined : item.url
  const tall = idx % 5 === 0 || idx % 9 === 0 || (item.height || 0) > (item.width || 0)

  return (
    <div className={tall ? 'row-span-2' : 'row-span-1'}>
      <a
        href={href}
        target={href ? '_blank' : undefined}
        rel="noopener noreferrer"
        className="group relative block h-full overflow-hidden rounded-[1.35rem] bg-grow-soft"
      >
        <SafeImage
          src={imgSrc}
          alt={item.title || 'Reference'}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.045]"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="mb-2 inline-flex rounded-full bg-[#FFE500] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#0F0F10]">
              {item.category || 'reference'}
            </div>

            {item.title && (
              <p className="line-clamp-2 text-[11px] font-bold leading-tight text-white/90">
                {item.title}
              </p>
            )}
          </div>
        </div>
      </a>
    </div>
  )
}

export default function Home() {
  const [active, setActive] = useState<string | null>(null)
  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async (cat: string | null) => {
    setActive(cat)
    setLoading(true)

    const p = cat ? '&category=' + cat : ''

    fetch('/api/feed?type=image&limit=36' + p)
      .then((r) => r.json())
      .then((d) => setImages(d.items || []))
      .catch(() => setImages([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(null)
  }, [])

  return (
    <main className="min-h-screen bg-grow-bg pb-32 text-grow-text" style={{ fontFamily: font }}>
      <div className="mx-auto max-w-lg px-4 pt-8">
        <header className="mb-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-grow-muted">
                GROW Today
              </p>

              <h1 className="mt-2 text-[44px] font-black uppercase leading-[0.82] tracking-tighter">
                GROW<span className="text-grow-yellow">.</span>
              </h1>
            </div>

            <Link
              href="/ai"
              className="rounded-full bg-[#0F0F10] px-4 py-2 text-xs font-black uppercase tracking-tight text-white"
            >
              AI
            </Link>
          </div>

          <p className="mt-5 max-w-sm text-sm leading-relaxed text-grow-muted">
            Reference visive, mood, immagini e materiali da trasformare in lavoro.
            Niente articoli in Home: qui si guarda, si salva, si usa.
          </p>
        </header>

        <section className="mb-7 grid grid-cols-3 gap-2">
          <Link
            href="/scopri"
            className="rounded-[1.5rem] bg-[#FFE500] p-4 text-[#0F0F10]"
          >
            <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Apri</p>
            <h2 className="mt-2 text-lg font-black uppercase leading-none">Scopri</h2>
          </Link>

          <Link
            href="/archivio"
            className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4"
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-grow-muted">Salva</p>
            <h2 className="mt-2 text-lg font-black uppercase leading-none">Archivio</h2>
          </Link>

          <Link
            href="/calendario"
            className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4"
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-grow-muted">Fai</p>
            <h2 className="mt-2 text-lg font-black uppercase leading-none">Piano</h2>
          </Link>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-grow-muted">
                Visual feed
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight">
                Scopri adesso
              </h2>
            </div>

            <Link href="/scopri" className="text-xs font-black uppercase tracking-tight text-grow-muted">
              Vedi tutto
            </Link>
          </div>

          <div className="scrollbar-hide -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
            {categories.map((c) => (
              <button
                key={c.key ?? 'all'}
                onClick={() => load(c.key)}
                className={[
                  'shrink-0 rounded-full px-4 py-2 text-sm font-black transition-colors',
                  active === c.key
                    ? 'bg-grow-yellow text-grow-bg'
                    : 'border border-black/10 bg-white/60 text-grow-muted hover:text-grow-text',
                ].join(' ')}
              >
                {c.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid auto-rows-[118px] grid-cols-3 gap-2">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className={[
                    'animate-pulse rounded-[1.35rem] bg-grow-soft',
                    i % 5 === 0 || i % 9 === 0 ? 'row-span-2' : '',
                  ].join(' ')}
                />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="rounded-[2rem] border border-black/10 bg-white/70 p-6 text-center">
              <p className="text-sm font-bold text-grow-muted">
                Nessuna immagine disponibile. Popola GROW con Are.na o fetch-images.
              </p>
            </div>
          ) : (
            <div className="grid auto-rows-[118px] grid-cols-3 gap-2">
              {images.map((item, idx) => (
                <VisualCard key={item.id} item={item} idx={idx} />
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  )
}
