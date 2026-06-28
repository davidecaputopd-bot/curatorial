'use client'

import { useEffect, useRef, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import SaveHeart from '@/components/SaveHeart'

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
  branding: 'Branding',
  typography: 'Tipografia',
  interior_design: 'Interni',
  fashion: 'Moda',
  web: 'Web',
  ai: 'AI',
  '3d_printing': '3D Print',
  art: 'Arte',
  social_design: 'Social Design',
  design: 'Design',
  lifestyle: 'Lifestyle',
  social: 'Social',
  growth: 'Crescita',
}

const placeholders: Record<string, string> = {
  branding: 'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=900&q=80',
  typography: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900&q=80',
  interior_design: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=80',
  fashion: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
  web: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=900&q=80',
  ai: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80',
  '3d_printing': 'https://images.unsplash.com/photo-1581092921461-39b9d08a9b21?w=900&q=80',
  art: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=900&q=80',
  social_design: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&q=80',
  design: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=900&q=80',
  lifestyle: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=900&q=80',
  social: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&q=80',
  growth: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=900&q=80',
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

function ImageCard({
  item,
  saved,
  onDwell,
}: {
  item: any
  saved: boolean
  onDwell: (id: string, seconds: number) => void
}) {
  const t = useRef(0)

  const enter = () => {
    t.current = Date.now()
  }

  const leave = () => {
    const seconds = (Date.now() - t.current) / 1000
    if (seconds > 1) onDwell(item.id, seconds)
  }

  const imgSrc = item.image_url || placeholders[item.category as string] || placeholders.design
  const href = item.url === '#' ? undefined : item.url

  return (
    <a
      href={href}
      target={href ? '_blank' : undefined}
      rel="noopener noreferrer"
      className="group relative block h-full w-full overflow-hidden rounded-[1.35rem] bg-grow-soft"
      onMouseEnter={enter}
      onMouseLeave={leave}
      onTouchStart={enter}
      onTouchEnd={leave}
    >
      <SaveHeart itemId={item.id} initialSaved={saved} />

      <SafeImage
        src={imgSrc}
        alt={item.title || 'Reference'}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.045]"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="mb-2 inline-flex rounded-full bg-[#FFE500] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#0F0F10]">
            {categoryLabels[item.category] || item.category || 'Reference'}
          </div>

          {item.artist_name && (
            <p className="truncate text-[11px] font-bold text-white/90">{item.artist_name}</p>
          )}

          {item.title && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-white/75">{item.title}</p>
          )}

          {item.dominant_color && (
            <div className="mt-2 flex items-center gap-1.5">
              <div
                className="h-3 w-3 rounded-full border border-white/40"
                style={{ backgroundColor: item.dominant_color }}
              />
              <span className="text-[9px] font-bold text-white/60">{item.dominant_color}</span>
            </div>
          )}
        </div>
      </div>
    </a>
  )
}

export default function ScopriPage() {
  const [active, setActive] = useState<string | null>(null)
  const [images, setImages] = useState<any[]>([])
  const [loadingImages, setLoadingImages] = useState(true)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const load = async (cat: string | null) => {
    setActive(cat)
    setLoadingImages(true)

    const p = cat ? '&category=' + cat : ''

    fetch('/api/feed?type=image&limit=72' + p)
      .then((r) => r.json())
      .then((d) => setImages(d.items || []))
      .catch(() => setImages([]))
      .finally(() => setLoadingImages(false))
  }

  useEffect(() => {
    load(null)

    fetch('/api/saved')
      .then((r) => r.json())
      .then((data) => {
        setSavedIds(new Set((data.items || []).map((item: any) => item.id)))
      })
      .catch(() => setSavedIds(new Set()))
  }, [])

  const handleDwell = async (itemId: string, seconds: number) => {
    try {
      await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action: 'dwell', seconds }),
      })
    } catch {}
  }

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text" style={{ fontFamily: font }}>
      <div className="mx-auto max-w-lg px-4 pt-10">
        <header className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-grow-muted">
            Visual discovery
          </p>

          <h1 className="mt-2 text-[34px] font-black uppercase leading-[0.9] tracking-tighter">
            Scopri<span className="text-grow-yellow">.</span>
          </h1>

          <p className="mt-3 max-w-sm text-sm leading-relaxed text-grow-muted">
            Reference visive, immagini da Are.na, mood, asset e ispirazioni. Niente articoli:
            qui si guarda, si salva, si trasforma.
          </p>
        </header>

        <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-5">
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

        {loadingImages ? (
          <div className="grid auto-rows-[122px] grid-cols-3 gap-2">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className={[
                  'animate-pulse rounded-[1.35rem] bg-grow-soft',
                  i % 7 === 0 || i % 11 === 0 ? 'row-span-2' : '',
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
          <div className="grid auto-rows-[122px] grid-cols-3 gap-2">
            {images.map((item, idx) => {
              const isPortrait = (item.height || 0) > (item.width || 0)
              const isBig = idx % 7 === 0 || idx % 13 === 0
              const isTall = isBig || isPortrait

              return (
                <div key={item.id} className={isTall ? 'row-span-2' : 'row-span-1'}>
                  <ImageCard item={item} saved={savedIds.has(item.id)} onDwell={handleDwell} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
