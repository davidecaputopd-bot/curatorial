'use client'

import { useState, useRef, useEffect } from 'react'
import BottomNav from '@/components/BottomNav'

const font = "Inter, 'Helvetica Neue', system-ui, sans-serif"

type Message = { role: 'user' | 'assistant'; content: string }

const QUICK = [
  'Dammi un hook per un Reel su un vino naturale.',
  'Analizza il trend del minimalismo nel branding 2025.',
  'Scrivimi una caption elegante per un prodotto di lusso.',
  'Suggerisci 3 idee content per un brand di moda sostenibile.',
]

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Ciao Davide. Sono il tuo assistente creativo. Chiedimi un\'idea, un copy, un\'analisi — sono qui.' }
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
      const res = await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: text, history: messages }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Non ho capito, riprova.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Errore di connessione. Riprova tra poco.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-grow-bg text-grow-text" style={{ fontFamily: font }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-grow-border bg-grow-card/95 backdrop-blur-md px-4 py-4">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-grow-yellow text-grow-text">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l1.2 4.2L17 8.5l-3.8 1.3L12 14l-1.2-4.2L7 8.5l3.8-1.3L12 3z" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-black uppercase tracking-tight">
              GROW<span className="text-grow-yellow">.</span>AI
            </h1>
            <p className="text-[11px] text-grow-muted">Assistente creativo personale</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-48">
        <div className="mx-auto max-w-lg space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-grow-yellow text-grow-text font-medium'
                  : 'bg-grow-card border border-grow-border text-grow-text'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-grow-card border border-grow-border rounded-2xl px-4 py-3">
                <span className="flex gap-1">
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

      {/* Quick prompts + input */}
      <div className="fixed bottom-[68px] left-0 right-0 border-t border-grow-border bg-grow-card/95 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-4 pt-3 pb-2">
          <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {QUICK.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                className="shrink-0 rounded-full border border-grow-border bg-grow-soft px-3 py-1.5 text-xs font-medium text-grow-text"
              >
                {q.length > 36 ? q.slice(0, 36) + '…' : q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Chiedi qualcosa…"
              className="flex-1 rounded-full border border-grow-border bg-grow-soft px-4 py-2.5 text-sm text-grow-text placeholder:text-grow-muted focus:outline-none focus:border-grow-yellow"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-grow-yellow text-grow-text disabled:opacity-40"
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
