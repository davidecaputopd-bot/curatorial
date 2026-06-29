'use client'

import { useState } from 'react'
import BottomNav from '@/components/BottomNav'

type Action = { tool: string; args: unknown; result: unknown }

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: Action[]
}

const TOOL_LABELS: Record<string, string> = {
  list_calendar_items: 'Letto calendario',
  create_calendar_item: 'Creato contenuto calendario',
  update_calendar_status: 'Aggiornato stato calendario',
  list_inbox_items: 'Letto inbox',
  create_inbox_item: 'Creato item inbox',
  search_saved_content: 'Cercato in archivio',
  get_monthly_output_summary: 'Calcolato output mensile',
}

const SUGGESTIONS = [
  'Cosa ho in programma per TRAMA questa settimana?',
  'Aggiungi un reel per ANventitre con la bottiglia in pineta, idea',
  'Segna come pubblicato il post di Exousia sulla finanza agevolata',
  'Quanto ho pubblicato questo mese per ogni cliente?',
]

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function StudioPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: messageId(),
      role: 'assistant',
      content: 'Sono l\'agente di GROW. Posso leggere e modificare calendario, inbox e archivio mentre parliamo. Dimmi cosa serve.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async (raw: string) => {
    const text = raw.trim()
    if (!text || loading) return

    const userMessage: Message = { id: messageId(), role: 'user', content: text }
    const next = [...messages, userMessage]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessages([...next, { id: messageId(), role: 'assistant', content: data.reply, actions: data.actions }])
      } else {
        setMessages([...next, { id: messageId(), role: 'assistant', content: `Errore: ${data.error || 'qualcosa non ha funzionato'}` }])
      }
    } catch {
      setMessages([...next, { id: messageId(), role: 'assistant', content: 'Errore di rete. Riprova.' }])
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen flex-col bg-grow-bg text-grow-text">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-28 pt-8">
        <header className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-grow-muted">GROW Studio</p>
          <h1 className="mt-2 text-[34px] font-black uppercase leading-[0.9] tracking-tighter">
            Agente<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-2 text-sm text-grow-muted">Legge e scrive davvero su calendario, inbox e archivio.</p>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[85%] rounded-[1.3rem] px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-grow-black text-white' : 'border border-grow-border bg-grow-card text-grow-text'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.actions.map((a, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-grow-yellow px-2 py-0.5 text-[9px] font-bold uppercase text-grow-text"
                      >
                        {TOOL_LABELS[a.tool] || a.tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-[1.3rem] border border-grow-border bg-grow-card px-4 py-3 text-sm text-grow-muted">…</div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="mb-4 space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-[1.1rem] border border-grow-border bg-grow-card px-4 py-2.5 text-left text-sm text-grow-text hover:border-black/20"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-full border border-grow-border bg-grow-card px-2 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Chiedi o chiedi di fare qualcosa..."
            className="flex-1 bg-transparent px-3 text-sm text-grow-text placeholder:text-grow-muted focus:outline-none"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grow-yellow text-grow-text disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
