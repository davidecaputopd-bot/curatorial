'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import BottomNav from '@/components/BottomNav'

type Action = {
  tool: string
  args: unknown
  result: unknown
  uiStatus?: 'running' | 'confirmed' | 'cancelled' | 'error'
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  image_url?: string
  actions?: Action[]
  feedback?: 'sending' | 'positive' | 'negative' | 'error'
}

type Reference = {
  id?: string
  title?: string
  category?: string
  image?: string
  url?: string
}

type Citation = {
  type: 'archivio' | 'inbox' | 'calendario'
  id: string
  title: string
  meta?: string
  image_url?: string
  url?: string
}

type Conversation = { conversation_id: string; title: string; updated_at: string }

const TOOL_LABELS: Record<string, string> = {
  get_operational_context: 'Letto contesto GROW',
  list_calendar_items: 'Letto calendario',
  create_calendar_item: 'Creato contenuto calendario',
  update_calendar_status: 'Aggiornato stato calendario',
  list_inbox_items: 'Letto inbox',
  create_inbox_item: 'Creato item inbox',
  create_memory: 'Nuovo ricordo',
  search_saved_content: 'Cercato in archivio',
  project_radar: 'Radar cliente aggiornato',
  get_monthly_output_summary: 'Calcolato output mensile',
  generate_image: 'Immagine generata',
  web_search: 'Ricerca web completata',
  fetch_webpage: 'Pagina letta',
}

const CONFIRMATION_TOOLS = new Set([
  'create_calendar_item',
  'update_calendar_status',
  'create_inbox_item',
  'create_memory',
])

function actionArgs(action: Action) {
  return action.args && typeof action.args === 'object' && !Array.isArray(action.args)
    ? (action.args as Record<string, unknown>)
    : {}
}

function actionSummary(action: Action) {
  const args = actionArgs(action)
  if (action.tool === 'create_calendar_item') {
    return [
      args.title,
      args.client,
      args.scheduled_date,
    ].filter(Boolean).join(' · ')
  }
  if (action.tool === 'update_calendar_status') {
    return `${args.title_contains || 'Contenuto'} → ${args.new_status || 'nuovo stato'}`
  }
  if (action.tool === 'create_inbox_item') {
    return String(args.content || args.url || 'Nuovo elemento Inbox')
  }
  if (action.tool === 'create_memory') {
    return String(args.content || 'Nuovo ricordo')
  }
  return TOOL_LABELS[action.tool] || action.tool
}

const CLIENT_NOTES: Record<string, string> = {
  ANventitre: 'Tono premium mediterraneo. Logo a cerchio verde. Vino bio.',
  AN23: 'Tono premium mediterraneo. Logo a cerchio verde. Vino bio.',
  Exousia: 'Tono professionale, radicato nel territorio locale. Colore verde #0E2B1F.',
  'Cantina Don Carlo': 'Tono naturale ed elegante. Mai usare "Madre Terra" o cliché simili.',
  'ACI Copertino': 'Tono istituzionale ma accessibile, comunicazione locale.',
  TRAMA: 'Vintage contemporaneo. Apertura store ottobre 2026.',
}

const QUICK_PROMPTS = [
  'Leggi GROW e dimmi da dove riparto oggi.',
  'Trova una cosa utile nella mia Inbox e trasformala in lavoro.',
  'Controlla Piano e dimmi cosa sto ignorando.',
  'Cerca nel mio Archivio una direzione visiva per il prossimo contenuto.',
]

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function newConversationId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : messageId()
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
  if (!reference.id && !reference.title && !reference.image && !reference.url) return null
  return reference
}

function parseQueryExtras() {
  if (typeof window === 'undefined') return { project: null, brief: null }
  const params = new URLSearchParams(window.location.search)
  return { project: params.get('project') || null, brief: params.get('brief') || null }
}

function buildProjectContext(project: string | null) {
  if (!project) return ''
  const notes = CLIENT_NOTES[project]
  return [`PROGETTO ATTIVO: ${project}`, notes ? `Regole per questo cliente: ${notes}` : ''].filter(Boolean).join('\n')
}

function buildReferenceContext(reference: Reference | null) {
  if (!reference) return ''
  return [
    'CONTESTO REFERENCE SELEZIONATA DA GROW:',
    reference.title ? `Titolo: ${reference.title}` : '',
    reference.category ? `Categoria: ${reference.category}` : '',
    reference.url ? `Fonte: ${reference.url}` : '',
    '',
    'Usa questa reference come materiale creativo, non come semplice link.',
  ].filter(Boolean).join('\n')
}

function buildCitationsContext(citations: Citation[]) {
  if (!citations.length) return ''
  return [
    'DAVIDE CITA QUESTI ELEMENTI SALVATI:',
    ...citations.map((citation) =>
      [
        `- [${citation.type}] ${citation.title}`,
        citation.meta ? `Tipo/contesto: ${citation.meta}` : '',
        citation.url ? `Fonte: ${citation.url}` : '',
        citation.image_url ? `Immagine: ${citation.image_url}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    ),
    '',
    'Tratta la selezione come un insieme: confronta ricorrenze, differenze e principi riutilizzabili. Non dichiarare di aver visto dettagli visivi che il modello non può verificare.',
  ].join('\n')
}

export default function AiPage() {
  const [reference, setReference] = useState<Reference | null>(null)
  const [project, setProject] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showCitePicker, setShowCitePicker] = useState(false)
  const [citeQuery, setCiteQuery] = useState('')
  const [citeResults, setCiteResults] = useState<Citation[]>([])
  const [citations, setCitations] = useState<Citation[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const referenceContext = useMemo(() => buildReferenceContext(reference), [reference])
  const projectContext = useMemo(() => buildProjectContext(project), [project])

  useEffect(() => {
    const { project: p, brief } = parseQueryExtras()
    let bundle: Citation[] = []
    try {
      const stored = window.sessionStorage.getItem(
        'grow-ai-reference-bundle'
      )
      const parsed = stored ? JSON.parse(stored) : []
      if (Array.isArray(parsed)) {
        bundle = parsed
          .filter(
            (item): item is Citation =>
              item &&
              item.type === 'archivio' &&
              typeof item.id === 'string' &&
              typeof item.title === 'string'
          )
          .slice(0, 12)
      }
      window.sessionStorage.removeItem('grow-ai-reference-bundle')
    } catch {}

    const frame = window.requestAnimationFrame(() => {
      setReference(parseReference())
      if (p) setProject(p)
      if (brief) setInput(brief)
      if (bundle.length) {
        setCitations(bundle)
        if (!brief) {
          setInput(
            'Confronta queste reference e ricavane una direzione creativa coerente, concreta e riutilizzabile.'
          )
        }
      }
      setConversationId(newConversationId())
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (!citeQuery.trim()) {
      return
    }
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(citeQuery)}`)
        .then((r) => r.json())
        .then((d) => setCiteResults(d.items || []))
        .catch(() => setCiteResults([]))
    }, 300)
    return () => clearTimeout(timeout)
  }, [citeQuery])

  const openHistory = async () => {
    setShowHistory(true)
    try {
      const res = await fetch('/api/chat-history?list=true')
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch {}
  }

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/chat-history?conversation_id=${id}`)
      const data = await res.json()
      setMessages(
        (data.messages || []).map((m: { role: 'user' | 'assistant'; content: string; image_url?: string }) => ({
          id: messageId(),
          role: m.role,
          content: m.content,
          image_url: m.image_url,
        }))
      )
      setConversationId(id)
      setShowHistory(false)
    } catch {}
  }

  const startNewChat = () => {
    setConversationId(newConversationId())
    setMessages([])
    setCitations([])
    setShowHistory(false)
  }

  const addCitation = (item: Citation) => {
    setCitations((prev) => (prev.find((c) => c.id === item.id) ? prev : [...prev, item]))
    setShowCitePicker(false)
    setCiteQuery('')
    setCiteResults([])
  }

  const removeCitation = (id: string) => setCitations((prev) => prev.filter((c) => c.id !== id))

  const updateAction = (
    messageId: string,
    actionIndex: number,
    patch: Partial<Action>
  ) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              actions: message.actions?.map((action, index) =>
                index === actionIndex ? { ...action, ...patch } : action
              ),
            }
          : message
      )
    )
  }

  const confirmAction = async (
    messageId: string,
    actionIndex: number,
    action: Action
  ) => {
    updateAction(messageId, actionIndex, { uiStatus: 'running' })
    try {
      const response = await fetch('/api/agent/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: action.tool, args: actionArgs(action) }),
      })
      const data = await response.json().catch(() => ({}))
      updateAction(messageId, actionIndex, {
        result: data.result,
        uiStatus: response.ok && data.ok ? 'confirmed' : 'error',
      })
    } catch {
      updateAction(messageId, actionIndex, { uiStatus: 'error' })
    }
  }

  const cancelAction = (messageId: string, actionIndex: number) => {
    updateAction(messageId, actionIndex, { uiStatus: 'cancelled' })
  }

  const sendFeedback = async (
    messageId: string,
    content: string,
    rating: 'positive' | 'negative'
  ) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, feedback: 'sending' } : message
      )
    )
    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, content, project }),
      })
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? { ...message, feedback: response.ok ? rating : 'error' }
            : message
        )
      )
    } catch {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, feedback: 'error' } : message
        )
      )
    }
  }

  async function send(raw: string) {
    const text = raw.trim()
    if (!text || loading) return

    const userMessage: Message = { id: messageId(), role: 'user', content: text }
    const next = [...messages, userMessage]
    setMessages(next)
    setInput('')
    setLoading(true)

    const contextBlocks = [projectContext, referenceContext, buildCitationsContext(citations)].filter(Boolean).join('\n\n')
    const messageForApi = contextBlocks ? `${contextBlocks}\n\nRICHIESTA DI DAVIDE:\n${text}` : text

    const assistantId = messageId()
    // placeholder for streaming reply
    setMessages([...next, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageForApi,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          conversationId,
        }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        setMessages([...next, { id: assistantId, role: 'assistant', content: `Errore: ${(data as {error?: string}).error || 'qualcosa non ha funzionato'}` }])
        setLoading(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let finalActions: Action[] = []
      let finalImageUrl: string | undefined

      const updateContent = (patch: (prev: string) => string) => {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: patch(m.content) } : m))
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6)) as { type: string; text?: string; tool?: string; actions?: Action[]; imageUrl?: string; error?: string; reply?: string }
            if (evt.type === 'token' && evt.text) {
              updateContent(prev => prev + evt.text)
            } else if (evt.type === 'tool' && evt.tool) {
              setMessages(prev => prev.map(m => m.id === assistantId
                ? { ...m, actions: [...(m.actions || []), { tool: evt.tool!, args: {}, result: {} }] }
                : m
              ))
            } else if (evt.type === 'done') {
              finalActions = evt.actions || []
              finalImageUrl = evt.imageUrl || undefined
              if (evt.reply) updateContent(prev => prev || evt.reply!)
            } else if (evt.type === 'error') {
              updateContent(() => `Errore: ${evt.error || 'qualcosa non ha funzionato'}`)
            }
          } catch {}
        }
      }

      setMessages(prev => prev.map(m => m.id === assistantId
        ? { ...m, actions: finalActions, imageUrl: finalImageUrl }
        : m
      ))
    } catch {
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: 'Errore di connessione. Riprova.' } : m))
    }
    setCitations([])
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen flex-col bg-grow-bg text-grow-text">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-28 pt-8">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-grow-muted">GROW</p>
            <h1 className="mt-2 text-[34px] font-black uppercase leading-[0.9] tracking-tighter">
              AI<span className="text-grow-yellow">.</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openHistory}
              className="rounded-full border border-grow-border bg-grow-card px-3 py-2 text-[10px] font-black uppercase tracking-tight text-grow-muted"
            >
              Cronologia
            </button>
            <button
              type="button"
              onClick={startNewChat}
              className="rounded-full bg-[#0F0F10] px-3 py-2 text-[10px] font-black uppercase tracking-tight text-white"
            >
              Nuova chat
            </button>
          </div>
        </header>

        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
            <div className="max-h-[70vh] w-full overflow-y-auto rounded-t-[2rem] bg-grow-bg p-5" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black uppercase">Conversazioni</h2>
                <button onClick={() => setShowHistory(false)} className="text-xs font-bold text-grow-muted">Chiudi</button>
              </div>
              {conversations.length === 0 ? (
                <p className="text-sm text-grow-muted">Nessuna conversazione salvata ancora.</p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((c) => (
                    <button
                      key={c.conversation_id}
                      onClick={() => loadConversation(c.conversation_id)}
                      className="block w-full rounded-[1.1rem] border border-grow-border bg-grow-card px-4 py-3 text-left"
                    >
                      <p className="line-clamp-1 text-sm font-bold">{c.title || 'Conversazione'}</p>
                      <p className="mt-0.5 text-[10px] text-grow-muted">{new Date(c.updated_at).toLocaleString('it-IT')}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {project && (
          <div className="mb-4 flex items-center gap-2 rounded-full border border-grow-border bg-grow-card px-4 py-2">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-muted">Progetto attivo</span>
            <span className="rounded-full bg-grow-yellow px-2.5 py-0.5 text-[11px] font-black uppercase text-black">{project}</span>
          </div>
        )}

        {reference && (
          <section className="mb-5 overflow-hidden rounded-[2rem] border border-grow-border bg-grow-card">
            {reference.image && (
              <div className="h-52">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={reference.image} alt={reference.title || 'Reference'} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-muted">Reference collegata</p>
              <h2 className="mt-1 line-clamp-2 text-xl font-black uppercase leading-tight tracking-tight">
                {reference.title || 'Reference senza titolo'}
              </h2>
            </div>
          </section>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.length === 0 && (
            <div className="rounded-[1.6rem] border border-grow-border bg-grow-card px-5 py-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-muted">
                Cabina GROW
              </p>
              <p className="mt-2 text-sm leading-relaxed text-grow-muted">
                Posso leggere Piano, Inbox e Archivio prima di rispondere. Usami per decidere, trasformare e chiudere lavoro.
              </p>
              <div className="mt-4 grid gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void send(prompt)}
                    className="rounded-[1rem] border border-black/10 bg-white px-3 py-3 text-left text-xs font-bold leading-snug text-grow-text active:scale-[0.99]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={[
                  'max-w-[88%] rounded-[1.6rem] px-4 py-3 text-sm leading-relaxed',
                  message.role === 'user' ? 'bg-grow-yellow text-black' : 'border border-grow-border bg-grow-card text-grow-text',
                ].join(' ')}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {(message.imageUrl || message.image_url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={message.imageUrl || message.image_url} alt="Output generato da GROW" className="mt-3 rounded-[1.2rem]" />
                )}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.actions.map((action, index) => {
                      const needsConfirmation = CONFIRMATION_TOOLS.has(action.tool)
                      if (!needsConfirmation) {
                        return (
                          <span
                            key={`${action.tool}-${index}`}
                            className="inline-flex rounded-full bg-grow-yellow px-2 py-0.5 text-[9px] font-bold uppercase text-grow-text"
                          >
                            {TOOL_LABELS[action.tool] || action.tool}
                          </span>
                        )
                      }

                      return (
                        <div
                          key={`${action.tool}-${index}`}
                          className="rounded-[1.15rem] bg-[#0F0F10] p-3 text-white"
                        >
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-grow-yellow">
                            Azione proposta
                          </p>
                          <p className="mt-1 text-xs font-black uppercase">
                            {TOOL_LABELS[action.tool] || action.tool}
                          </p>
                          <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-white/60">
                            {actionSummary(action)}
                          </p>

                          {!action.uiStatus && (
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void confirmAction(message.id, index, action)
                                }
                                className="rounded-full bg-grow-yellow px-3 py-2 text-[9px] font-black uppercase text-black"
                              >
                                Conferma
                              </button>
                              <button
                                type="button"
                                onClick={() => cancelAction(message.id, index)}
                                className="rounded-full border border-white/15 px-3 py-2 text-[9px] font-black uppercase text-white/60"
                              >
                                Annulla
                              </button>
                            </div>
                          )}

                          {action.uiStatus && (
                            <p
                              className={[
                                'mt-3 text-[9px] font-black uppercase',
                                action.uiStatus === 'confirmed'
                                  ? 'text-grow-yellow'
                                  : action.uiStatus === 'error'
                                    ? 'text-red-400'
                                    : 'text-white/40',
                              ].join(' ')}
                            >
                              {action.uiStatus === 'running'
                                ? 'Esecuzione…'
                                : action.uiStatus === 'confirmed'
                                  ? 'Confermato ed eseguito'
                                  : action.uiStatus === 'cancelled'
                                    ? 'Annullato'
                                    : 'Errore: riprova'}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {message.role === 'assistant' && message.content && (
                  <div className="mt-3 flex items-center gap-2 border-t border-black/5 pt-2">
                    {message.feedback === 'positive' || message.feedback === 'negative' ? (
                      <span className="text-[9px] font-black uppercase tracking-wide text-grow-muted">
                        Preferenza registrata
                      </span>
                    ) : (
                      <>
                        <span className="text-[9px] font-bold uppercase text-grow-muted">
                          Utile?
                        </span>
                        <button
                          type="button"
                          disabled={message.feedback === 'sending'}
                          onClick={() =>
                            void sendFeedback(message.id, message.content, 'positive')
                          }
                          className="rounded-full border border-black/10 px-2 py-1 text-[9px] font-black uppercase text-grow-muted disabled:opacity-40"
                        >
                          Sì
                        </button>
                        <button
                          type="button"
                          disabled={message.feedback === 'sending'}
                          onClick={() =>
                            void sendFeedback(message.id, message.content, 'negative')
                          }
                          className="rounded-full border border-black/10 px-2 py-1 text-[9px] font-black uppercase text-grow-muted disabled:opacity-40"
                        >
                          No
                        </button>
                        {message.feedback === 'error' && (
                          <span className="text-[9px] font-bold text-red-500">
                            Riprova
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="rounded-[1.6rem] border border-grow-border bg-grow-card px-4 py-3 text-sm font-bold text-grow-muted">
                <span className="inline-flex gap-1">
                  <span className="ds-pulse-dot" style={{ animationDelay: '0ms' }}>·</span>
                  <span className="ds-pulse-dot" style={{ animationDelay: '160ms' }}>·</span>
                  <span className="ds-pulse-dot" style={{ animationDelay: '320ms' }}>·</span>
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="fixed bottom-[92px] left-0 right-0 z-40 px-4">
          <div className="mx-auto max-w-xl">
            {citations.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {citations.map((c) => (
                  <span key={c.id} className="flex items-center gap-1.5 rounded-full bg-[#0F0F10] px-3 py-1 text-[10px] font-bold text-grow-yellow">
                    {c.title}
                    <button onClick={() => removeCitation(c.id)} className="text-white/50">×</button>
                  </span>
                ))}
              </div>
            )}

            {showCitePicker && (
              <div className="mb-2 rounded-[1.3rem] border border-black/10 bg-white p-3 shadow-lg">
                <input
                  autoFocus
                  value={citeQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    setCiteQuery(value)
                    if (!value.trim()) setCiteResults([])
                  }}
                  placeholder="Cerca in archivio, inbox, calendario..."
                  className="mb-2 w-full rounded-full border border-black/10 px-3 py-1.5 text-sm focus:outline-none"
                />
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {citeResults.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => addCitation(item)}
                      className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-grow-soft"
                    >
                      <span className="mr-1.5 rounded bg-grow-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-grow-muted">{item.type}</span>
                      {item.title}
                    </button>
                  ))}
                  {citeQuery.trim() && citeResults.length === 0 && (
                    <p className="px-2 py-1.5 text-xs text-grow-muted">Nessun risultato.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-[2rem] border border-black/10 bg-[#F7F4EE]/95 p-2 shadow-[0_18px_50px_rgba(15,15,16,0.12)] backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setShowCitePicker((v) => !v)}
                aria-label="Cita un elemento salvato"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-grow-muted hover:text-grow-text"
              >
                @
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send(input)
                  }
                }}
                placeholder="Scrivi qualsiasi cosa..."
                aria-label="Messaggio per GROW AI"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-grow-muted"
              />
              <button
                type="button"
                onClick={() => void send(input)}
                disabled={!input.trim() || loading}
                aria-label="Invia"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grow-yellow text-grow-text disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
