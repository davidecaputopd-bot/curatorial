'use client'
import { useState } from 'react'

interface Props { item: any; onSkip?: () => void }

const categoryColors: Record<string, string> = {
  branding: '#C17F3E',
  typography: '#8B9E8A',
  social: '#E07B54',
  lifestyle: '#D4B896',
  ai: '#6B8CAE',
  growth: '#7A7A7A',
}

const categoryPlaceholders: Record<string, string> = {
  branding: 'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=800&q=80',
  typography: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80',
  social: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
  lifestyle: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80',
  ai: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80',
  growth: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=800&q=80',
}

export default function ContentCard({ item, onSkip }: Props) {
  const [saved, setSaved] = useState(false)
  const [liked, setLiked] = useState(false)
  const color = categoryColors[item.category] || '#C17F3E'
  const image = item.image_url || categoryPlaceholders[item.category]

  const interact = async (action: string) => {
    await fetch('/api/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_id: item.id, action })
    })
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'oggi'
    if (days === 1) return 'ieri'
    return `${days}g fa`
  }

  if (item.type === 'video') {
    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4"
        style={{ borderLeft: `3px solid ${color}` }}>
        <div className="relative">
          <img
            src={`https://img.youtube.com/vi/${item.video_id}/maxresdefault.jpg`}
            alt={item.title}
            className="w-full h-48 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                `https://img.youtube.com/vi/${item.video_id}/hqdefault.jpg`
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 bg-black bg-opacity-70 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl ml-1">▶</span>
            </div>
          </div>
          <span className="absolute top-3 left-3 text-xs font-mono uppercase tracking-wider px-2 py-1 rounded-full text-white"
            style={{ backgroundColor: color }}>
            VIDEO
          </span>
        </div>
        <div className="p-4">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            <h2 className="font-serif text-lg font-bold leading-snug hover:opacity-70 transition-opacity"
              style={{ color: '#1A1714' }}>
              {item.title}
            </h2>
          </a>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs" style={{ color: '#6B6560' }}>
              {item.sources?.name} · {timeAgo(item.published_at)}
            </span>
            <div className="flex gap-3">
              <button onClick={() => { setSaved(true); interact('save') }}
                className="text-lg" style={{ opacity: saved ? 1 : 0.3 }}>🔖</button>
              <button onClick={() => { interact('skip'); onSkip?.() }}
                className="text-lg opacity-30">✕</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4"
      style={{ borderLeft: `3px solid ${color}` }}>
      <img src={image} alt={item.title} className="w-full h-52 object-cover" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono uppercase tracking-wider"
            style={{ color }}>
            {item.category}
          </span>
          {item.read_time_minutes && (
            <span className="text-xs" style={{ color: '#9B9590' }}>
              · {item.read_time_minutes} min
            </span>
          )}
          {item.is_serendipity && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
              scoperta ✦
            </span>
          )}
        </div>

        <a href={item.url} target="_blank" rel="noopener noreferrer">
          <h2 className="font-serif text-xl font-bold leading-snug mb-2 hover:opacity-70 transition-opacity"
            style={{ color: '#1A1714' }}>
            {item.title}
          </h2>
        </a>

        {item.summary && (
          <p className="text-sm line-clamp-2 mb-3" style={{ color: '#6B6560' }}>
            {item.summary}
          </p>
        )}

        <div className="flex items-center justify-between pt-2"
          style={{ borderTop: '1px solid #E8E4DC' }}>
          <span className="text-xs" style={{ color: '#9B9590' }}>
            {item.sources?.name} · {timeAgo(item.published_at)}
          </span>
          <div className="flex gap-3">
            <button onClick={() => { setLiked(true); interact('like') }}
              className="text-xl transition-transform hover:scale-125"
              style={{ opacity: liked ? 1 : 0.3 }}>❤️</button>
            <button onClick={() => { setSaved(true); interact('save') }}
              className="text-xl transition-transform hover:scale-125"
              style={{ opacity: saved ? 1 : 0.3 }}>🔖</button>
            <button onClick={() => { interact('skip'); onSkip?.() }}
              className="text-xl transition-transform hover:scale-125 opacity-30">✕</button>
          </div>
        </div>
      </div>
    </div>
  )
}