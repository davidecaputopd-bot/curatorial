'use client'

import { useEffect, useMemo, useState } from 'react'
import BottomNav from '@/components/BottomNav'

const font = "Inter, 'Helvetica Neue', system-ui, sans-serif"

type Message = {
  role: 'user' | 'assistant'
  content: string
  image_url?: string
  imageUrl?: string
}

type Reference = {
  id?: string
  title?: string
  category?: string
  image?: string
  url?: string
}

function parseReference(): Reference | null {
  if (typeof window === 'undefined') return null

  const params = new URLSearchParams(window.location.search)

  const ref: Reference = {
    id: params.get('ref') || undefined,
    title: params.get('title') || undefined,
    category: params.get('category') || undefined,
    image: params.get('image') || undefined,
    url: params.get('url') || undefined,
  }

  if (!ref.id && !ref.title && !ref.image && !ref.url) return null

  return ref
}

function initialMessage(reference: Reference | null): Message {
  if (reference) {
    return {
      role: 'assistant',
      content:
        'Ok. Hai scelto una reference dall’Archivio. Posso trasformarla in copy, prompt immagine, moodboard, carosello, brief cliente o piano contenuti. Dimmi per quale progetto la vuoi usare.',
    }
  }

  return {
    role: 'assistant',
    content:
      'Ciao. Sono GROW AI: archivista, editor e sparring partner creativo. Posso trasformare reference salvate, immagini e idee in copy, prompt, moodboard, caroselli, brief e piani operativi.',
  }
}

function buildReferenceContext(reference: Reference | null) {
  if (!reference) return ''

  return [
    'CONTESTO REFERENCE SELEZIONATA DA GROW:',
    reference.title ? `Titolo: ${reference.title}` : '',
    reference.category ? `Categoria: ${reference.category}` : '',
    reference.url ? `Fonte: ${reference.url}` : '',
    reference.image ? `Immagine: ${reference.image}` : '',
    '',
    'Usa questa reference come materiale creativo, non come semplice link.',
  ]
    .filter(Boolean)
    .join('\n')
}

export default function AiPage() {
  const [reference, setReference] = useState<Reference | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const referenceContext = useMemo(() => buildReferenceContext(reference), [reference])

  useEffect(() => {
    const ref = parseReference()
    setReference(ref)

    const loadHistory = async () => {
      try {
        const res = await fetch('/api/chat-history')
        const data = await res.json()

        if (data.messages?.length) {
          setMessages(data.messages)
        } else {
          setMessages([initialMessage(ref)])
        }
      } catch {
        setMessages([initialMessage(ref)])
      }
    }

    loadHistory()
  }, [])

  const send = async (raw: string) => {
    const text = raw.trim()
    if (!text || loading) return

    setInput('')
    setLoading(true)

    const visibleUserMessage: Message = { role: 'user', content: text }
    const nextMessages = [...messages, visibleUserMessage]
    setMessages(nextMessages)

    const messageForApi = referenceContext
      ? `${referenceContext}\n\nRICHIESTA DI DAVIDE:\n${text}`
      : text

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageForApi,
          history: messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      const data = await res.json()

      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: data.reply || 'Errore: risposta vuota.',
          imageUrl: data.imageUrl,
        },
      ])
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: 'Errore di connessione. Riprova.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const clear = async () => {
    try {
      await fetch('/api/chat-history', { method: 'DELETE' })
    } catch {}

    setMessages([initialMessage(reference)])
  }

  const quickActions = reference
    ? [
        'Trasformala in un carosello Instagram',
        'Scrivimi un prompt immagine nello stesso mood',
        'Usala per un contenuto AN23',
        'Usala per una direzione visual luxury',
        'Fammi un brief creativo partendo da questa reference',
      ]
    : [
        'Analizza i salvati e dimmi cosa posso produrre',
        'Dammi 5 idee per AN23',
        'Scrivi un copy Exousia più forte',
        'Genera un prompt immagine editoriale',
        'Organizza il lavoro di oggi',
      ]

  return (
    <main className="flex min-h-screen flex-col bg-grow-bg text-grow-text" style={{ fontFamily: font }}>
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-28 pt-8">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-grow-muted">
              GROW AI
            </p>

            <h1 className="mt-2 text-[34px] font-black uppercase leading-[0.9] tracking-tighter">
              Usa quello che salvi<span className="text-grow-yellow">.</span>
            </h1>
          </div>

          <button
            type="button"
            onClick={clear}
            className="rounded-full border border-black/10 bg-white/60 px-3 py-2 text-[10px] font-black uppercase tracking-tight text-grow-muted"
          >
            Reset
          </button>
        </header>

        {reference && (
          <section className="mb-5 overflow-hidden rounded-[2rem] border border-black/10 bg-white/70 shadow-sm">
            {reference.image && (
              <div className="h-52">
                <img src={reference.image} alt={reference.title || 'Reference'} className="h-full w-full object-cover" />
              </div>
            )}

            <div className="p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-muted">
                Reference selezionata
              </p>

              <h2 className="mt-1 line-clamp-2 text-xl font-black uppercase leading-tight tracking-tight">
                {reference.title || 'Reference senza titolo'}
              </h2>

              {reference.category && (
                <p className="mt-2 inline-flex rounded-full bg-[#FFE500] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0F0F10]">
                  {reference.category}
                </p>
              )}
            </div>
          </section>
        )}

        <section className="mb-5">
          <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => send(action)}
                className="shrink-0 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-black text-grow-muted transition hover:bg-[#FFE500] hover:text-[#0F0F10]"
              >
                {action}
              </button>
            ))}
          </div>
        </section>

        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={[
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start',
              ].join(' ')}
            >
              <div
                className={[
                  'max-w-[86%] rounded-[1.6rem] px-4 py-3 text-sm leading-relaxed shadow-sm',
                  message.role === 'user'
                    ? 'bg-[#FFE500] text-[#0F0F10]'
                    : 'border border-black/10 bg-white/75 text-grow-text',
                ].join(' ')}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {(message.imageUrl || message.image_url) && (
                  <img
                    src={message.imageUrl || message.image_url}
                    alt=""
                    className="mt-3 rounded-[1.2rem]"
                  />
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-[1.6rem] border border-black/10 bg-white/75 px-4 py-3 text-sm font-bold text-grow-muted">
                Sto ragionando…
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-[92px] left-0 right-0 z-40 px-4">
          <div className="mx-auto flex max-w-lg items-center gap-2 rounded-[2rem] border border-black/10 bg-[#F7F4EE]/95 p-2 shadow-[0_18px_50px_rgba(15,15,16,0.12)] backdrop-blur-xl">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send(input)
                }
              }}
              placeholder={reference ? 'Cosa vuoi farne?' : 'Scrivi a GROW AI…'}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-grow-muted"
            />

            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grow-yellow text-grow-text disabled:opacity-40"
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
