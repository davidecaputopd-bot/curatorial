'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

type Item = {
  id: string
  content?: string
  url?: string
  image_url?: string
  created_at: string
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'adesso'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}g`
}

export default function ChatPage() {
  const [items, setItems] = useState<Item[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/inbox?source=chat')
      const data = await res.json()
      const sorted = (data.items || []).slice().reverse()
      setItems(sorted)
      const latest = sorted[sorted.length - 1]
      if (latest) localStorage.setItem('grow_chat_last_seen', latest.created_at)
    } catch {}
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items.length])

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const value = text
    setText('')
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: value, source: 'chat' }),
      })
      const data = await res.json()
      if (data.item) setItems((prev) => [...prev, data.item])
    } catch {}
    setSending(false)
  }

  const uploadImage = async (file: File) => {
    setSending(true)
    try {
      const { createBrowserSupabaseClient } = await import('@/lib/supabase/client')
      const supabase = createBrowserSupabaseClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('inbox-images').upload(path, file, { contentType: file.type })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('inbox-images').getPublicUrl(path)
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: data.publicUrl, source: 'chat' }),
      })
      const saved = await res.json()
      if (saved.item) setItems((prev) => [...prev, saved.item])
    } catch {}
    setSending(false)
  }

  const copy = async (item: Item) => {
    const value = item.content || item.url || ''
    try {
      await navigator.clipboard.writeText(value)
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {}
  }

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await fetch('/api/inbox', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  return (
    <main className="flex min-h-screen flex-col bg-grow-bg text-grow-text">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-28 pt-8">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>GROW</p>
            <h1 className="text-[26px] font-black uppercase tracking-tight">
              Con te stesso<span className="text-grow-yellow">.</span>
            </h1>
          </div>
          <Link href="/inbox" className="text-[10px] font-bold uppercase text-grow-muted">
            Inbox →
          </Link>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto pb-3">
          {items.length === 0 && (
            <div className="rounded-[1.3rem] border border-grow-border bg-grow-card px-5 py-10 text-center">
              <p className="text-sm text-grow-muted">Niente ancora. Manda qualcosa dal telefono, lo trovi qui sul computer (e viceversa).</p>
            </div>
          )}
          {items.map((item) => (
            <div key={item.id} className="group flex items-start gap-2">
              <div className="flex-1 rounded-[1.1rem] border border-grow-border bg-grow-card px-3.5 py-2.5">
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" className="mb-1.5 max-h-60 w-full rounded-lg object-cover" />
                )}
                {item.content && <p className="whitespace-pre-wrap text-sm text-grow-text">{item.content}</p>}
                <p className="mt-1 text-[10px] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>{timeAgo(item.created_at)}</p>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                {item.content && (
                  <button
                    onClick={() => copy(item)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-grow-soft text-grow-text"
                    aria-label="Copia messaggio"
                  >
                    {copiedId === item.id ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                    )}
                  </button>
                )}
                <button
                  onClick={() => remove(item.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-grow-muted opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Elimina"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div
          className="flex items-end gap-2 rounded-[1.3rem] border border-grow-border bg-grow-card p-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
            if (file) void uploadImage(file)
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            onPaste={(e) => {
              const file = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))?.getAsFile()
              if (file) {
                e.preventDefault()
                void uploadImage(file)
              }
            }}
            placeholder="Scrivi o incolla qualcosa..."
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-grow-text placeholder:text-grow-muted focus:outline-none"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grow-yellow text-grow-text disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
