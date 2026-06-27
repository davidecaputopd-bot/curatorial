'use client'

import { useState, useRef, useEffect } from 'react'
import BottomNav from '@/components/BottomNav'

const font = "Inter, 'Helvetica Neue', system-ui, sans-serif"

type Message = {
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  imageLoading?: boolean
}

const QUICK = [
  'Dammi 3 hook per un Reel sul vino naturale.',
  'Genera un\'immagine: studio creativo minimalista, luce dorata.',
  'Libri per diventare creative director?',
  'Scrivimi una bio da art director per Instagram.',
  'Genera un\'immagine: brand editoriale moda, bianco nero.',
  'Idee per una mia attività creativa da lanciare ora.',
]

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadHistory() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/chat-history')
      const data = await res.json()
      if (data.messages?.length) {
        setMessages(data.messages)
      } else {
        setMessages([{ role: 'assistant', content: 'Ciao. Sono il tuo assistente creativo. Posso scrivere copy, generare immagini con FLUX, darti idee, analizzare brand. Cosa fai oggi?' }])
      }
    } catch {
      setMessages([{ role: 'assistant', content: 'Ciao. Cosa vuoi fare oggi?' }])
    }
    setHistoryLoaded(true)
  }

  const saveMessage = async (msg: Omit<Message, 'imageLoading'>) => {
    try {
      await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: msg.role, content: msg.content, imageUrl: msg.imageUrl }),
      })
    } catch {}
  }

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    saveMessage(userMsg)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages.slice(-10) }),
      })
      const data = await res.json()

      if (data.imageUrl) {
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.reply || 'Sto generando...',
          imageLoading: true,
        }
        setMessages(prev => [...prev, assistantMsg])
        saveMessage({ role: 'assistant', content: data.reply || 'Ecco.', imageUrl: data.imageUrl })

        const img = new Image()
        img.onload = () => {
          setMessages(prev => prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, imageUrl: data.imageUrl, imageLoading: false } : m
          ))
        }
        img.onerror = () => {
          setMessages(prev => prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, imageLoading: false, content: m.content + '\n(Generazione fallita — riprova.)' } : m
          ))
        }
        img.src = data.imageUrl
      } else {
        const assistantMsg: Message = { role: 'assistant', content: data.reply || 'Nessuna risposta.' }
        setMessages(prev => [...prev, assistantMsg])
        saveMessage(assistantMsg)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Errore. Riprova.' }])
    }

    setLoading(false)
  }

  const clearHistory = async () => {
    if (!confirm('Cancelli tutta la cronologia?')) return
    await fetch('/api/chat-history', { method: 'DELETE' })
    setMessages([{ role: 'assistant', content: 'Ricominciamo. Cosa vuoi fare?' }])
  }

  return (
    <main className="flex min-h-screen flex-col bg-grow-bg text-grow-text" style={{ fontFamily: font }}>
      <header className="sticky top-0 z-10 border-b border-grow-border bg-grow-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-grow-yellow text-grow-text font-black text-xs">AI</div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight">GROW<span className="text-grow-yellow">.</span>AI</h1>
              <p className="text-[10px] text-grow-muted">Llama 3.3 70B · FLUX Image</p>
            </div>
          </div>
          <button onClick={clearHistory} className="text-grow-muted hover:text-grow-text p-1.5" title="Cancella cronologia">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-52">
        <div className="mx-auto max-w-lg space-y-4">
          {!historyLoaded && (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-pulse rounded-full bg-grow-yellow" />
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-grow-yellow text-grow-text font-medium'
                    : 'bg-grow-card border border-grow-border text-grow-text'
                }`}>
                  {msg.content}
                </div>
                {msg.imageLoading && (
                  <div className="w-[280px] h-[280px] rounded-2xl border border-grow-border bg-grow-soft flex flex-col items-center justify-center gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-grow-yellow" />
                    <p className="text-xs text-grow-muted">Generazione FLUX in corso…</p>
                  </div>
                )}
                {msg.imageUrl && !msg.imageLoading && (
                  <img
                    src={msg.imageUrl}
                    alt="Generata"
                    className="rounded-2xl w-full max-w-[320px] object-cover border border-grow-border"
                  />
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-grow-card border border-grow-border rounded-2xl px-4 py-3">
                <span className="flex gap-1">
                  {[0,1,2].map(j => (
                    <span key={j} className="h-1.5 w-1.5 rounded-full bg-grow-muted animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />
                  ))}
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="fixed bottom-[68px] left-0 right-0 border-t border-grow-border bg-grow-card/95 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-4 pt-3 pb-3">
          <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {QUICK.map(q => (
              <button key={q} onClick={() => send(q)} disabled={loading}
                className="shrink-0 rounded-full border border-grow-border bg-grow-soft px-3 py-1.5 text-xs font-medium text-grow-text disabled:opacity-40">
                {q.length > 38 ? q.slice(0, 38) + '…' : q}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Scrivi o chiedi di generare un'immagine…"
              className="flex-1 rounded-full border border-grow-border bg-grow-soft px-4 py-2.5 text-sm text-grow-text placeholder:text-grow-muted focus:outline-none focus:border-grow-yellow"
            />
            <button onClick={() => send(input)} disabled={!input.trim() || loading}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-grow-yellow text-grow-text disabled:opacity-40">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
