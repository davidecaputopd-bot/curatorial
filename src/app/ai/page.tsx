'use client'

import { useState, useRef, useEffect } from 'react'
import BottomNav from '@/components/BottomNav'

const font = "Inter, 'Helvetica Neue', system-ui, sans-serif"

type Message = {
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
}

const QUICK = [
  'Dammi 3 hook per un Reel su un vino naturale salentino.',
  'Che libri dovrei leggere per diventare creative director?',
  'Genera un mood board per un brand di moda minimalista.',
  'Come mi posiziono come art director su LinkedIn?',
  'Idee per una mia attività creativa che posso avviare ora.',
  'Scrivimi una bio professionale per Instagram.',
]

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Ciao Davide. Sono qui per aiutarti a costruire quello che vuoi — copy, idee, strategie, immagini. Cosa ti serve oggi?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-12),
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || 'Errore nella risposta.',
        imageUrl: data.imageUrl,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Errore di connessione. Riprova.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-grow-bg text-grow-text" style={{ fontFamily: font }}>
      <header className="sticky top-0 z-10 border-b border-grow-border bg-grow-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-grow-yellow text-grow-text font-black text-sm">
            AI
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight">
              GROW<span className="text-grow-yellow">.</span>AI
            </h1>
            <p className="text-[11px] text-grow-muted">Assistente creativo · Llama 3.3 70B</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-52">
        <div className="mx-auto max-w-lg space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-grow-yellow text-grow-text font-medium'
                    : 'bg-grow-card border border-grow-border text-grow-text'
                }`}>
                  {msg.content}
                </div>
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Immagine generata"
                    className="rounded-2xl w-full max-w-[320px] object-cover border border-grow-border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-grow-card border border-grow-border rounded-2xl px-4 py-3">
                <span className="flex gap-1 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-grow-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
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
              <button
                key={q}
                onClick={() => send(q)}
                disabled={loading}
                className="shrink-0 rounded-full border border-grow-border bg-grow-soft px-3 py-1.5 text-xs font-medium text-grow-text disabled:opacity-40"
              >
                {q.length > 40 ? q.slice(0, 40) + '…' : q}
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
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-grow-yellow text-grow-text disabled:opacity-40 transition-opacity"
            >
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
