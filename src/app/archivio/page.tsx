'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import {
  readLocalStudioAssets,
  removeLocalStudioAsset,
  type StudioAsset,
} from '@/lib/studio/local-assets'

type ArchiveItem = {
  id: string
  title?: string | null
  category?: string | null
  image_url?: string | null
  url?: string | null
  summary?: string | null
  output_text?: string | null
  project?: string | null
  width?: number | null
  height?: number | null
  is_studio_asset?: boolean
  sync_status?: StudioAsset['sync_status']
}

function buildAiHref(item: ArchiveItem) {
  const params = new URLSearchParams()

  if (item.id) params.set('ref', item.id)
  if (item.title) params.set('title', item.title)
  if (item.category) params.set('category', item.category)
  if (item.image_url) params.set('image', item.image_url)
  if (item.url) params.set('url', item.url)

  return `/ai?${params.toString()}`
}

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
  const [items, setItems] = useState<ArchiveItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)

    try {
      const [savedResponse, studioResponse] = await Promise.all([
        fetch('/api/saved'),
        fetch('/api/studio/assets'),
      ])
      const [savedData, studioData] = (await Promise.all([
        savedResponse.json().catch(() => ({ items: [] })),
        studioResponse.json().catch(() => ({ assets: [] })),
      ])) as [{ items?: ArchiveItem[] }, { assets?: StudioAsset[] }]
      const localAssets = readLocalStudioAssets()
      const remoteAssets = Array.isArray(studioData.assets)
        ? (studioData.assets as StudioAsset[])
        : []
      const knownRemoteIds = new Set(remoteAssets.map((asset) => asset.id))
      const studioAssets = [
        ...remoteAssets,
        ...localAssets.filter((asset) => !knownRemoteIds.has(asset.id)),
      ].map((asset) => ({
        ...asset,
        is_studio_asset: true,
        image_url: asset.url,
        category: asset.asset_type,
        summary: asset.output_text,
      }))

      setItems([
        ...studioAssets,
        ...(Array.isArray(savedData.items) ? savedData.items : []),
      ])
    } catch {
      setItems(
        readLocalStudioAssets().map((asset) => ({
          ...asset,
          is_studio_asset: true,
          image_url: asset.url,
          category: asset.asset_type,
          summary: asset.output_text,
        }))
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void load()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const remove = async (id: string) => {
    const item = items.find((candidate) => candidate.id === id)
    setItems((prev) => prev.filter((item) => item.id !== id))

    try {
      if (item?.is_studio_asset) {
        if (item.sync_status === 'local_only') {
          removeLocalStudioAsset(id)
          return
        }
        const response = await fetch('/api/studio/assets', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        if (!response.ok) removeLocalStudioAsset(id)
        return
      }

      await fetch('/api/saved', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: id }),
      })
    } catch {}
  }

  return (
    <main className="min-h-screen bg-grow-bg px-4 pb-32 pt-10 text-grow-text">
      <section className="mx-auto max-w-lg">
        <header className="mb-7">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-grow-muted">
            GROW Archivio
          </p>

          <h1 className="mt-2 text-[38px] font-black uppercase leading-[0.88] tracking-tighter">
            Archivio<span className="text-grow-yellow">.</span>
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-grow-muted">
            Reference scelte e output prodotti in Studio, raccolti nella stessa
            memoria creativa.
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
              Salva una reference da Scopri oppure crea un output in Studio.
            </p>
          </div>
        ) : (
          <div className="grid auto-rows-[124px] grid-cols-2 gap-3">
            {items.map((item, idx) => {
              const img =
                item.image_url ||
                placeholders[item.category || 'design'] ||
                placeholders.design
              const tall = idx % 4 === 0 || (item.height || 0) > (item.width || 0)
              const isTextOutput = item.is_studio_asset && !item.image_url

              return (
                <article
                  key={item.id}
                  className={[
                    'group relative overflow-hidden rounded-[1.6rem]',
                    isTextOutput ? 'bg-[#0F0F10]' : 'bg-grow-soft',
                    tall ? 'row-span-2' : 'row-span-1',
                  ].join(' ')}
                >
                  {isTextOutput ? (
                    <div className="flex h-full flex-col justify-end p-4 text-white">
                      <p className="line-clamp-6 text-xs leading-relaxed text-white/70">
                        {item.output_text || item.summary}
                      </p>
                    </div>
                  ) : item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={item.title || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.045]" />
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={item.title || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.045]" />
                  )}

                  <div className="absolute right-2 top-2 z-20 flex gap-2">
                    <Link
                      href={buildAiHref(item)}
                      className="flex h-9 items-center justify-center rounded-full bg-white/90 px-3 text-[10px] font-black uppercase tracking-tight text-[#0F0F10] shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-transform hover:scale-105"
                    >
                      Usa
                    </Link>

                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFE500] text-[#0F0F10] shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition-transform hover:scale-110"
                      aria-label="Rimuovi dai salvati"
                    >
                      ♥
                    </button>
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#FFE500]">
                      {item.is_studio_asset
                        ? `Studio · ${item.project || item.category}`
                        : item.category || 'reference'}
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
