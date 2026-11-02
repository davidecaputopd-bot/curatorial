'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import { SaveFlowerIcon } from '@/components/SaveHeart'
import {
  readLocalStudioAssets,
  removeLocalStudioAsset,
  type StudioAsset,
} from '@/lib/studio/local-assets'

const SocialArchive = dynamic(() => import('@/components/SocialArchive'), {
  loading: () => (
    <div className="grid grid-cols-3 gap-[2px] overflow-hidden rounded-[1.15rem]">
      {Array.from({ length: 15 }, (_, index) => (
        <div key={index} className="aspect-[3/4] animate-pulse bg-white/10" />
      ))}
    </div>
  ),
})

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
  platform?: string | null
}

const PLATFORM_LABELS: Record<string, string> = {
  arena: 'Are.na',
  unsplash: 'Unsplash',
  pexels: 'Pexels',
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
  const [view, setView] = useState<'reference' | 'social'>('reference')
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
    <main className="min-h-[100dvh] bg-grow-bg px-5 pb-32 pt-10 text-grow-text lg:pb-12">
      <section className="mx-auto max-w-lg lg:max-w-5xl">
        <header className="mb-6">
          <h1 className="grow-page-title">
            Archivio<span className="text-grow-yellow">.</span>
          </h1>

          <div className="grow-surface mt-6 grid grid-cols-2 rounded-full p-1">
            {[
              { key: 'reference' as const, label: 'Reference' },
              { key: 'social' as const, label: 'Social' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setView(option.key)}
                className={[
                  'grow-press min-h-11 rounded-full px-4 text-sm font-semibold',
                  view === option.key
                    ? 'grow-object bg-grow-text text-grow-black'
                    : 'text-grow-muted',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        {view === 'social' ? (
          <SocialArchive />
        ) : loading ? (
          <div className="grid auto-rows-[124px] grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={[
                  'animate-pulse rounded-2xl bg-grow-card',
                  i % 3 === 0 ? 'row-span-2' : '',
                ].join(' ')}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="grow-surface rounded-[1.4rem] px-6 py-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-grow-soft text-grow-yellow">
              <SaveFlowerIcon size={24} />
            </div>

            <h2 className="mt-4 font-display text-[22px] leading-tight">
              Nulla salvato
            </h2>

            <p className="mt-2 max-w-[30ch] text-[15px] text-grow-muted">
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
                    'group relative overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]',
                    isTextOutput ? 'grow-surface' : 'bg-grow-card',
                    tall ? 'row-span-2' : 'row-span-1',
                  ].join(' ')}
                >
                  {isTextOutput ? (
                    <div className="flex h-full flex-col justify-end p-4 text-grow-text">
                      <p className="line-clamp-6 text-[13px] leading-relaxed text-grow-text/85">
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

                  {item.platform && PLATFORM_LABELS[item.platform] && (
                    <span className="absolute left-2 top-2 z-20 rounded-full bg-black/55 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-xl">
                      {PLATFORM_LABELS[item.platform]}
                    </span>
                  )}

                  <div className="absolute right-2 top-2 z-20 flex gap-2">
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-grow-yellow text-grow-black shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition-transform hover:scale-110"
                      aria-label="Rimuovi dai salvati"
                    >
                      <SaveFlowerIcon />
                    </button>
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="text-xs font-medium text-white/75">
                      {item.is_studio_asset
                        ? `Studio · ${item.project || item.category}`
                        : item.category || 'reference'}
                    </p>

                    {item.title && (
                      <h2 className="mt-1 line-clamp-2 text-[13px] font-bold leading-tight text-white">
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
