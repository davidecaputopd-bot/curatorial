'use client'

import { useEffect, useMemo, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import { ProductionPlanCard } from '@/components/ProductionPlanCard'
import type { ProductionPlan } from '@/lib/ai/production-types'

const font = "Inter, 'Helvetica Neue', system-ui, sans-serif"

const PRODUCTION_TRIGGERS = [
  'video',
  'reel',
  'clip',
  'immagine',
  'visual',
  'mockup',
  'bottiglia',
  'etichetta',
  'carosello',
  'reference',
  'comfyui',
  'ltx',
  'higgsfield',
  'luma',
  'recraft',
  'ideogram',
  'genera',
  'crea',
  'trasforma',
]

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  image_url?: string
  imageUrl?: string
  provider?: string
  providerLabel?: string
  model?: string
  mode?: string
  productionPlan?: ProductionPlan
  productionBrief?: string
  planLoading?: boolean
}

type Reference = {
  id?: string
  title?: string
  category?: string
  image?: string
  url?: string
}

function messageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isProductionRequest(message: string) {
  const text = message.toLowerCase()
  return PRODUCTION_TRIGGERS.some((trigger) => text.includes(trigger))
}

function parseReference(): Reference | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const reference: Reference = {
    id: params.get('ref') || undefined,
    title: params.get('title') || undefined,
    category: params.get('category') || undefined,
    image: params.get('image') || undefined,
    url: params.get('url') || undefined,
  }

  if (!reference.id && !reference.title && !reference.image && !reference.url) {
    return null
  }
  return reference
}

function initialMessage(reference: Reference | null): Message {
  return {
    id: messageId('welcome'),
    role: 'assistant',
    content: reference
      ? 'Reference collegata. Dimmi cosa vuoi produrre e per quale progetto: preparo risposta, motore, percorso, prompt e controlli.'
      : 'Scrivi cosa devi produrre, per quale progetto e con quali vincoli. GROW risponde e, quando serve, costruisce un piano che puoi portare direttamente in Studio.',
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

function referenceSummary(reference: Reference | null) {
  if (!reference) return undefined
  return [
    reference.title ? `Titolo: ${reference.title}` : '',
    reference.category ? `Categoria: ${reference.category}` : '',
    reference.url ? `Fonte: ${reference.url}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

export default function AiPage() {
  const [reference, setReference] = useState<Reference | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const referenceContext = useMemo(() => buildReferenceContext(reference), [reference])
  const selectedReference = useMemo(() => referenceSummary(reference), [reference])

  useEffect(() => {
    const currentReference = parseReference()
    const controller = new AbortController()

    const frame = window.requestAnimationFrame(() => {
      setReference(currentReference)
    })

    async function loadHistory() {
      try {
        const response = await fetch('/api/chat-history', {
          signal: controller.signal,
        })
        const data = await response.json()

        if (data.messages?.length) {
          setMessages(
            data.messages.map((message: Omit<Message, 'id'>, index: number) => ({
              ...message,
              id: `history-${index}-${message.role}-${message.content.slice(0, 16)}`,
            }))
          )
        } else {
          setMessages([initialMessage(currentReference)])
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setMessages([initialMessage(currentReference)])
        }
      }
    }

    void loadHistory()
    return () => {
      window.cancelAnimationFrame(frame)
      controller.abort()
    }
  }, [])

  function attachPlan(messageIdToUpdate: string, plan: ProductionPlan) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageIdToUpdate
          ? { ...message, productionPlan: plan, planLoading: false }
          : message
      )
    )
  }

  function stopPlanLoading(messageIdToUpdate: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageIdToUpdate
          ? { ...message, planLoading: false }
          : message
      )
    )
  }

  async function requestProductionPlan(text: string): Promise<ProductionPlan | null> {
    try {
      const response = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            selectedReference: reference,
            currentRoute: '/ai',
          },
        }),
      })
      const data = await response.json()

      if (response.ok && data.ok && data.plan) {
        return data.plan as ProductionPlan
      }
    } catch {
      return null
    }

    return null
  }

  async function send(raw: string) {
    const text = raw.trim()
    if (!text || loading) return

    const shouldPlan = isProductionRequest(text)
    const userMessage: Message = {
      id: messageId('user'),
      role: 'user',
      content: text,
    }
    const assistantMessageId = messageId('assistant')
    const nextMessages = [...messages, userMessage]

    setInput('')
    setLoading(true)
    setMessages(nextMessages)

    const messageForApi = referenceContext
      ? `${referenceContext}\n\nRICHIESTA DI DAVIDE:\n${text}`
      : text

    try {
      const planRequest = shouldPlan
        ? requestProductionPlan(text)
        : null
      const response = await fetch('/api/chat', {
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
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Chat request failed')

      setMessages([
        ...nextMessages,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: data.reply || 'Errore: risposta vuota.',
          imageUrl: data.imageUrl,
          provider: data.provider,
          providerLabel: data.providerLabel,
          model: data.model,
          mode: data.mode,
          productionBrief: text,
          planLoading: shouldPlan,
        },
      ])

      if (planRequest) {
        void planRequest.then((plan) => {
          if (plan) {
            attachPlan(assistantMessageId, plan)
          } else {
            stopPlanLoading(assistantMessageId)
          }
        })
      }
    } catch {
      setMessages([
        ...nextMessages,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: 'Errore di connessione. Riprova.',
          productionBrief: text,
          planLoading: false,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function clear() {
    try {
      await fetch('/api/chat-history', { method: 'DELETE' })
    } catch {}
    setMessages([initialMessage(reference)])
  }

  const quickActions = reference
    ? [
        'Crea un reel AN23 da questa reference',
        'Trasformala in un mockup prodotto',
        'Prepara un carosello editoriale',
        'Compila un workflow ComfyUI',
      ]
    : [
        'Reel AN23 con bottiglia in pineta e logo finale',
        'Mockup Cantina Don Carlo con etichetta vera',
        'Carosello Exousia sulla finanza agevolata',
        'Visual premium da produrre con ComfyUI',
      ]

  return (
    <main
      className="flex min-h-screen flex-col bg-grow-bg text-grow-text"
      style={{ fontFamily: font }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-28 pt-8">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-grow-muted">
              GROW AI
            </p>
            <h1 className="mt-2 text-[34px] font-black uppercase leading-[0.9] tracking-tighter">
              Dal brief alla produzione<span className="text-grow-yellow">.</span>
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

        <section className="mb-5 grid grid-cols-3 overflow-hidden rounded-[1.4rem] border border-black/10 bg-white/70">
          {[
            ['01', 'Scrivi il brief'],
            ['02', 'Controlla il piano'],
            ['03', 'Produci in Studio'],
          ].map(([number, label]) => (
            <div
              key={number}
              className="border-r border-black/10 px-3 py-3 last:border-r-0"
            >
              <p className="text-[9px] font-black text-grow-muted">{number}</p>
              <p className="mt-1 text-[10px] font-black uppercase leading-tight">
                {label}
              </p>
            </div>
          ))}
        </section>

        {reference && (
          <section className="mb-5 overflow-hidden rounded-[2rem] border border-black/10 bg-white/70 shadow-sm">
            {reference.image && (
              <div className="h-52">
                {/* Dynamic archive URLs cannot use next/image without a fixed host allowlist. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={reference.image}
                  alt={reference.title || 'Reference'}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-muted">
                Reference collegata
              </p>
              <h2 className="mt-1 line-clamp-2 text-xl font-black uppercase leading-tight tracking-tight">
                {reference.title || 'Reference senza titolo'}
              </h2>
              {reference.category && (
                <p className="mt-2 inline-flex rounded-full bg-grow-yellow px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black">
                  {reference.category}
                </p>
              )}
            </div>
          </section>
        )}

        <section className="mb-5">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-grow-muted">
            Prova un brief reale
          </p>
          <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => send(action)}
                className="shrink-0 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-black text-grow-muted transition hover:bg-grow-yellow hover:text-black"
              >
                {action}
              </button>
            ))}
          </div>
        </section>

        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={[
                  message.productionPlan ? 'max-w-full' : 'max-w-[88%]',
                  'rounded-[1.6rem] px-4 py-3 text-sm leading-relaxed shadow-sm',
                  message.role === 'user'
                    ? 'bg-grow-yellow text-black'
                    : 'border border-black/10 bg-white/75 text-grow-text',
                ].join(' ')}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {(message.imageUrl || message.image_url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={message.imageUrl || message.image_url}
                    alt="Output generato da GROW"
                    className="mt-3 rounded-[1.2rem]"
                  />
                )}

                {message.planLoading && (
                  <div className="mt-3 rounded-xl bg-[#0F0F10] p-3 text-xs font-bold text-white/65">
                    Sto costruendo motore, percorso e controlli…
                  </div>
                )}

                {message.productionPlan && (
                  <ProductionPlanCard
                    plan={message.productionPlan}
                    brief={message.productionBrief || message.content}
                    reference={selectedReference}
                  />
                )}

                {message.role === 'assistant' && (message.provider || message.model) && (
                  <p className="mt-3 border-t border-black/10 pt-2 text-[10px] font-black uppercase tracking-[0.12em] text-grow-muted">
                    {message.providerLabel || message.provider || 'AI'}
                    {message.model ? ` · ${message.model}` : ''}
                    {message.mode ? ` · ${message.mode}` : ''}
                  </p>
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
          <div className="mx-auto flex max-w-xl items-center gap-2 rounded-[2rem] border border-black/10 bg-[#F7F4EE]/95 p-2 shadow-[0_18px_50px_rgba(15,15,16,0.12)] backdrop-blur-xl">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void send(input)
                }
              }}
              placeholder={
                reference
                  ? 'Cosa vuoi produrre da questa reference?'
                  : 'Es. Reel AN23, bottiglia in pineta…'
              }
              aria-label="Brief per GROW AI"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-grow-muted"
            />
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={!input.trim() || loading}
              aria-label="Invia brief"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grow-yellow text-grow-text disabled:opacity-40"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
