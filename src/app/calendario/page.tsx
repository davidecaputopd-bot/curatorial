'use client'

import { useEffect, useMemo, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import { useTilt } from '@/components/useTilt'

const CLIENTS = ['Tutti', 'ANventitre', 'Exousia', 'Cantina Don Carlo', 'ACI Copertino', 'TRAMA']
const STATUSES = ['idea', 'in_produzione', 'pronto', 'pubblicato', 'da_riciclare']
const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  in_produzione: 'Produzione',
  pronto: 'Pronto',
  pubblicato: 'Pubblicato',
  da_riciclare: 'Ricicla',
}
const NEXT_ACTIONS: Record<string, string> = {
  idea: 'Sviluppa brief',
  in_produzione: 'Chiudi produzione',
  pronto: 'Programma o pubblica',
  pubblicato: 'Misura e archivia',
  da_riciclare: 'Trasforma in nuovo formato',
}
// Ogni cliente ha il suo logo, sul fondo per cui è disegnato. Il colore resta allo stato del lavoro.
const CLIENT_LOGOS: Record<string, { src: string; bg: string }> = {
  ANventitre: { src: '/clients/anventitre.png', bg: '#0F0F10' },
  Exousia: { src: '/clients/exousia.png', bg: '#F3F0E8' },
  'ACI Copertino': { src: '/clients/aci-copertino.png', bg: '#FFFFFF' },
  TRAMA: { src: '/clients/trama.png', bg: '#F3F0E8' },
  Umami: { src: '/clients/umami.png', bg: '#0F0F10' },
}
const CONTENT_TYPES = ['reel', 'carosello', 'post', 'storia', 'altro']
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

type CalItem = {
  id: string
  client: string
  title: string
  content_type?: string | null
  status: string
  scheduled_date?: string | null
  notes?: string | null
}

type ViewMode = 'agenda' | 'pipeline'

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00`)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
}

function getWeekDays(date: Date) {
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

function shortDate(value?: string | null) {
  if (!value) return 'Senza data'
  return dateFromKey(value).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function distanceLabel(value?: string | null, todayKey = localDateKey(new Date())) {
  if (!value) return 'Da piazzare'
  const diff = Math.round((dateFromKey(value).getTime() - dateFromKey(todayKey).getTime()) / 86_400_000)
  if (diff < 0) return `${Math.abs(diff)}g in ritardo`
  if (diff === 0) return 'Oggi'
  if (diff === 1) return 'Domani'
  return `Tra ${diff}g`
}

function sortByDate(a: CalItem, b: CalItem) {
  if (!a.scheduled_date && !b.scheduled_date) return a.title.localeCompare(b.title)
  if (!a.scheduled_date) return 1
  if (!b.scheduled_date) return -1
  return a.scheduled_date.localeCompare(b.scheduled_date)
}

export default function CalendarioPage() {
  const [items, setItems] = useState<CalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeClient, setActiveClient] = useState('Tutti')
  const [view, setView] = useState<ViewMode>('agenda')
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')

  const today = useMemo(() => new Date(), [])
  const todayKey = localDateKey(today)
  const weekDays = getWeekDays(today)
  const emptyForm = {
    client: '',
    title: '',
    content_type: 'reel',
    status: 'idea',
    scheduled_date: '',
    notes: '',
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    let cancelled = false
    const loadItems = async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (activeClient !== 'Tutti') params.set('client', activeClient)
      try {
        const response = await fetch(`/api/calendar?${params}`)
        const data = await response.json()
        if (!cancelled) setItems(data.items || [])
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadItems()
    return () => {
      cancelled = true
    }
  }, [activeClient])

  const activeItems = items.filter((item) => item.status !== 'pubblicato')
  const overdue = activeItems
    .filter((item) => item.scheduled_date && item.scheduled_date < todayKey)
    .sort(sortByDate)
  const todayItems = activeItems
    .filter((item) => item.scheduled_date === todayKey)
    .sort(sortByDate)
  const upcoming = activeItems
    .filter((item) => item.scheduled_date && item.scheduled_date > todayKey)
    .sort(sortByDate)
    .slice(0, 12)
  const unscheduled = activeItems
    .filter((item) => !item.scheduled_date)
    .sort((a, b) => a.title.localeCompare(b.title))
  const readyNotScheduled = items.filter(
    (item) => item.status === 'pronto' && !item.scheduled_date
  )
  const inMotion = items.filter(
    (item) => item.status === 'in_produzione' || item.status === 'pronto'
  )
  const weekCount = weekDays.reduce(
    (sum, day) =>
      sum + items.filter((item) => item.scheduled_date === localDateKey(day)).length,
    0
  )
  const focusItems = [...overdue, ...todayItems, ...readyNotScheduled].slice(0, 4)

  const itemsForDay = (day: Date) =>
    items.filter((item) => item.scheduled_date === localDateKey(day))

  const changeStatus = async (id: string, status: string) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, status } : item))
    )
    await fetch('/api/calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
  }

  const updateItem = async (id: string, fields: Partial<CalItem>) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...fields } : item))
    )
    await fetch('/api/calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    })
  }

  const remove = async (id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id))
    await fetch('/api/calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  const openModal = (date?: string) => {
    setError('')
    setForm({ ...emptyForm, scheduled_date: date || '' })
    setShowModal(true)
  }

  const addItem = async () => {
    if (!form.client || !form.title) return
    setError('')
    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          scheduled_date: form.scheduled_date || null,
        }),
      })
      const data = await response.json()
      if (!data.item) {
        setError(data.error || 'Salvataggio non riuscito.')
        return
      }
      setItems((previous) => [data.item, ...previous])
      setShowModal(false)
      setForm(emptyForm)
    } catch {
      setError('Errore di rete. Riprova.')
    }
  }

  return (
    <main className="min-h-[100dvh] bg-grow-bg pb-28 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg px-4 pt-9 lg:max-w-5xl">
        <header className="mb-6">
          <div className="flex items-end justify-between gap-4">
            <h1 className="grow-page-title">
              Piano<span className="text-grow-yellow">.</span>
            </h1>
            <button
              type="button"
              onClick={() => openModal()}
              aria-label="Nuovo blocco"
              className="grow-press grow-object flex h-11 w-11 items-center justify-center rounded-full bg-grow-text text-grow-black"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2">
            <Metric label="oggi" value={todayItems.length} />
            <Metric label="in ritardo" value={overdue.length} warn={overdue.length > 0} />
            <Metric label="settimana" value={weekCount} />
            <Metric label="da piazzare" value={unscheduled.length} />
          </div>
        </header>

        <div className="scrollbar-hide -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
          {CLIENTS.map((client) => (
            <button
              key={client}
              type="button"
              onClick={() => setActiveClient(client)}
              className={[
                'grow-press flex min-h-11 shrink-0 items-center rounded-full text-sm font-semibold',
                client === 'Tutti' ? 'px-4' : 'gap-2 pl-1.5 pr-4',
                activeClient === client
                  ? 'grow-object bg-grow-text text-grow-black'
                  : 'grow-surface text-grow-muted',
              ].join(' ')}
            >
              {client === 'Tutti' ? (
                'Tutti'
              ) : (
                <>
                  <ClientLogo client={client} size={32} />
                  {client}
                </>
              )}
            </button>
          ))}
        </div>

        <div className="grow-surface mb-6 grid grid-cols-2 rounded-full p-1">
          {(['agenda', 'pipeline'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={[
                'grow-press min-h-11 rounded-full text-sm font-semibold',
                view === item ? 'grow-object bg-grow-text text-grow-black' : 'text-grow-muted',
              ].join(' ')}
            >
              {item === 'agenda' ? 'Oggi e prossimi' : 'Pipeline'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-[1.4rem] bg-grow-card" />
            ))}
          </div>
        ) : view === 'agenda' ? (
          <div className="space-y-8">
            <FocusPanel items={focusItems} todayKey={todayKey} onChangeStatus={changeStatus} />

            <section>
              <SectionTitle title="Ritmo settimana" meta={`${weekCount} item`} />
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, index) => {
                  const key = localDateKey(day)
                  const dayItems = itemsForDay(day)
                  const isToday = key === todayKey
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => openModal(key)}
                      className={[
                        'grow-press grid min-h-[92px] grid-rows-[auto_auto_1fr] justify-items-start gap-[5px] rounded-2xl px-2 pb-2.5 pt-[9px] text-left',
                        isToday ? 'grow-object bg-grow-yellow text-grow-black' : 'grow-surface',
                      ].join(' ')}
                    >
                      <span className={['text-[11px] font-semibold', isToday ? 'text-grow-black/70' : 'text-grow-muted'].join(' ')}>
                        {DAY_LABELS[index]}
                      </span>
                      <span className="flex h-1.5 gap-[3px]" aria-label={`${dayItems.length} consegne`}>
                        {dayItems.slice(0, 3).map((item) => (
                          <span key={item.id} className={['h-1.5 w-1.5 rounded-full', isToday ? 'bg-grow-black' : 'bg-grow-text/80'].join(' ')} />
                        ))}
                      </span>
                      <span className="self-end text-[22px] font-extrabold leading-none tracking-[-0.03em]">
                        {day.getDate()}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <AgendaSection
              title="Oggi"
              empty="Niente da chiudere oggi."
              items={todayItems}
              todayKey={todayKey}
              onChangeStatus={changeStatus}
              onUpdate={updateItem}
              onRemove={remove}
            />
            <AgendaSection
              title="In ritardo"
              empty="Nessun arretrato. Respira."
              items={overdue}
              todayKey={todayKey}
              onChangeStatus={changeStatus}
              onUpdate={updateItem}
              onRemove={remove}
              danger
            />
            <AgendaSection
              title="Prossimi"
              empty="Nessun contenuto programmato nei prossimi giorni."
              items={upcoming}
              todayKey={todayKey}
              onChangeStatus={changeStatus}
              onUpdate={updateItem}
              onRemove={remove}
            />
            <AgendaSection
              title="Da piazzare"
              empty="Nessuna idea senza data."
              items={unscheduled}
              todayKey={todayKey}
              onChangeStatus={changeStatus}
              onUpdate={updateItem}
              onRemove={remove}
            />
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="font-display text-[36px] leading-[0.95]">
                {inMotion.length} cose aperte.
              </h2>
              <p className="mt-3 max-w-[40ch] text-[13px] leading-snug text-grow-muted">
                La pipeline serve solo a decidere cosa avanza. Se resta qui troppo, è rumore.
              </p>
            </section>

            {STATUSES.map((status) => {
              const group = items.filter((item) => item.status === status).sort(sortByDate)
              return (
                <section key={status}>
                  <SectionTitle title={STATUS_LABELS[status]} meta={String(group.length)} />
                  {group.length === 0 ? (
                    <EmptyLine text="Vuoto." />
                  ) : (
                    <div className="space-y-2">
                      {group.map((item) => (
                        <PlanCard
                          key={item.id}
                          item={item}
                          todayKey={todayKey}
                          onChangeStatus={changeStatus}
                          onUpdate={updateItem}
                          onRemove={remove}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm lg:items-center lg:justify-center"
          onClick={() => setShowModal(false)}
        >
          <div
            className="grow-surface w-full rounded-t-[2rem] p-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:max-w-lg lg:rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[13px] text-grow-muted">
                  Nuovo blocco
                </p>
                <h2 className="mt-1 font-display text-[28px] leading-none">Cosa va prodotto?</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Chiudi"
                className="grow-press flex h-11 w-11 items-center justify-center rounded-full bg-grow-soft text-xl text-grow-text"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Titolo o consegna"
                aria-label="Titolo o consegna"
                className="h-12 w-full rounded-2xl border border-transparent bg-grow-soft px-4 text-[15px] text-grow-text outline-none focus:border-grow-yellow font-semibold"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.client}
                  onChange={(event) => setForm((current) => ({ ...current, client: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-transparent bg-grow-soft px-4 text-[15px] text-grow-text outline-none focus:border-grow-yellow"
                >
                  <option value="">Cliente</option>
                  {CLIENTS.slice(1).map((client) => (
                    <option key={client} value={client}>{client}</option>
                  ))}
                </select>
                <select
                  value={form.content_type}
                  onChange={(event) => setForm((current) => ({ ...current, content_type: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-transparent bg-grow-soft px-4 text-[15px] text-grow-text outline-none focus:border-grow-yellow"
                >
                  {CONTENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(event) => setForm((current) => ({ ...current, scheduled_date: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-transparent bg-grow-soft px-4 text-[15px] text-grow-text outline-none focus:border-grow-yellow"
                />
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-transparent bg-grow-soft px-4 text-[15px] text-grow-text outline-none focus:border-grow-yellow"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Prossima azione, vincoli, reference mancanti…"
                rows={3}
                aria-label="Prossima azione"
                className="w-full resize-none rounded-2xl border border-transparent bg-grow-soft px-4 py-3 text-[15px] leading-snug text-grow-text outline-none focus:border-grow-yellow"
              />
            </div>

            {error && <p className="mt-3 text-[13px] font-semibold text-grow-fix">{error}</p>}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="grow-press grow-surface min-h-12 rounded-full text-[15px] font-semibold text-grow-text"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void addItem()}
                disabled={!form.client || !form.title}
                className="grow-press grow-object min-h-12 rounded-full bg-grow-yellow text-[15px] font-bold text-grow-black disabled:opacity-40"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}

function Metric({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div
      className={[
        'flex min-h-[84px] flex-col justify-between gap-2 rounded-[1.1rem] p-3',
        warn ? 'grow-object bg-grow-fix text-grow-black' : 'grow-surface',
      ].join(' ')}
    >
      <p className={['text-xs font-semibold leading-tight', warn ? 'text-grow-black/70' : 'text-grow-muted'].join(' ')}>{label}</p>
      <p className="font-display text-[28px] leading-none">{value}</p>
    </div>
  )
}

function ClientLogo({ client, size = 44 }: { client: string; size?: number }) {
  const logo = CLIENT_LOGOS[client]
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.27) }
  if (!logo) {
    return (
      <span style={style} className="flex shrink-0 items-center justify-center bg-grow-soft text-[13px] font-extrabold tracking-[-0.03em] text-grow-text shadow-e1">
        {client.slice(0, 2).toUpperCase()}
      </span>
    )
  }
  return (
    <span
      style={{ ...style, background: logo.bg }}
      className="flex shrink-0 overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,.1),inset_0_1px_0_rgba(255,255,255,.18),0_1px_2px_rgba(0,0,0,.5)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo.src} alt={client} className="h-full w-full" />
    </span>
  )
}

function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="grow-section-title">{title}</h2>
      {meta && <span className="text-[13px] tabular-nums text-grow-muted">{meta}</span>}
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="grow-surface rounded-[1.4rem] px-4 py-4 text-[15px] text-grow-muted">
      {text}
    </div>
  )
}

function FocusPanel({
  items,
  todayKey,
  onChangeStatus,
}: {
  items: CalItem[]
  todayKey: string
  onChangeStatus: (id: string, status: string) => void
}) {
  const tilt = useTilt<HTMLElement>(5)
  if (items.length === 0) {
    return (
      <section className="grow-surface rounded-[1.75rem] p-5">
        <p className="text-[13px] font-semibold text-grow-muted">Oggi</p>
        <h2 className="mt-4 font-display text-4xl leading-[0.95]">Nessun incendio.</h2>
        <p className="mt-3 text-[15px] leading-snug text-grow-muted">
          Scegli una cosa da far avanzare e mettila in produzione.
        </p>
      </section>
    )
  }
  return (
    <section {...tilt} className="grow-block grow-tilt rounded-[1.75rem] p-5">
      <p className="text-[13px] font-semibold text-grow-black/70">Oggi</p>
      <h2 className="grow-z1 mt-4 font-display text-[36px] leading-[0.95]">Prima chiudi questo.</h2>
      <div className="grow-z2 mt-5 overflow-hidden rounded-[1.1rem] bg-grow-black/[0.08]">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3 [&+&]:shadow-[inset_0_1px_0_rgba(13,12,11,.12)]">
            <ClientLogo client={item.client} size={36} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[15px] font-bold leading-tight">{item.title}</p>
              <p className="mt-0.5 text-[13px] text-grow-black/70">
                {NEXT_ACTIONS[item.status] || 'Decidi avanzamento'} · {distanceLabel(item.scheduled_date, todayKey)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChangeStatus(item.id, item.status === 'pronto' ? 'pubblicato' : 'pronto')}
              className="grow-press min-h-11 shrink-0 rounded-full bg-grow-black px-4 text-sm font-bold text-grow-text shadow-[inset_0_1px_0_rgba(255,255,255,.14),var(--e1)]"
            >
              Avanza
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function AgendaSection({
  title,
  empty,
  items,
  todayKey,
  onChangeStatus,
  onUpdate,
  onRemove,
  danger,
}: {
  title: string
  empty: string
  items: CalItem[]
  todayKey: string
  onChangeStatus: (id: string, status: string) => void
  onUpdate: (id: string, fields: Partial<CalItem>) => void
  onRemove: (id: string) => void
  danger?: boolean
}) {
  return (
    <section>
      <SectionTitle title={title} meta={String(items.length)} />
      {items.length === 0 ? (
        <EmptyLine text={empty} />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <PlanCard
              key={item.id}
              item={item}
              todayKey={todayKey}
              danger={danger}
              onChangeStatus={onChangeStatus}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function PlanCard({
  item,
  todayKey,
  danger,
  onChangeStatus,
  onUpdate,
  onRemove,
}: {
  item: CalItem
  todayKey: string
  danger?: boolean
  onChangeStatus: (id: string, status: string) => void
  onUpdate: (id: string, fields: Partial<CalItem>) => void
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const statusIndex = STATUSES.indexOf(item.status)
  const nextStatus = STATUSES[Math.min(STATUSES.length - 1, Math.max(0, statusIndex + 1))]
  const quickDates = [
    { label: 'Oggi', value: todayKey },
    { label: 'Domani', value: localDateKey(addDays(dateFromKey(todayKey), 1)) },
    { label: '+7', value: localDateKey(addDays(dateFromKey(todayKey), 7)) },
  ]

  return (
    <article
      className={[
        'grow-surface overflow-hidden rounded-[1.4rem]',
        danger ? 'outline outline-1 -outline-offset-1 outline-grow-fix/60' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="grow-press flex w-full items-center gap-3 p-3 text-left"
      >
        <ClientLogo client={item.client} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[17px] font-bold leading-tight text-grow-text">
            {item.title}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-grow-muted">
            <span>{item.client}</span>
            {item.content_type && <span>{item.content_type}</span>}
            <span>{shortDate(item.scheduled_date)}</span>
          </span>
          <span className="mt-1 block text-[13px] text-grow-muted">
            Prossima azione: {NEXT_ACTIONS[item.status] || 'Decidi avanzamento'}
          </span>
        </span>
        <span
          className={[
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
            danger ? 'bg-grow-fix text-grow-black' : 'bg-grow-soft text-grow-text',
          ].join(' ')}
        >
          {distanceLabel(item.scheduled_date, todayKey)}
        </span>
      </button>

      {open && (
        <div className="border-t border-grow-border px-4 py-4">
          <div className="mb-3 flex gap-1">
            {STATUSES.map((status, index) => (
              <span
                key={status}
                className={[
                  'h-1.5 flex-1 rounded-full',
                  index <= statusIndex ? 'bg-grow-yellow' : 'bg-grow-soft',
                ].join(' ')}
              />
            ))}
          </div>
          {item.notes && (
            <p className="mb-3 rounded-[1rem] bg-grow-soft px-3 py-2 text-[13px] leading-relaxed text-grow-text/85">
              {item.notes}
            </p>
          )}
          <div className="mb-3">
            <p className="mb-2 text-[13px] text-grow-muted">
              Piazza nel piano
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickDates.map((date) => (
                <button
                  key={date.label}
                  type="button"
                  onClick={() => onUpdate(item.id, { scheduled_date: date.value })}
                  className={[
                    'grow-press min-h-11 rounded-full px-4 text-sm font-semibold',
                    item.scheduled_date === date.value
                      ? 'grow-object bg-grow-text text-grow-black'
                      : 'bg-grow-soft text-grow-text',
                  ].join(' ')}
                >
                  {date.label}
                </button>
              ))}
              {item.scheduled_date && (
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { scheduled_date: null })}
                  className="grow-press min-h-11 rounded-full bg-grow-soft px-4 text-sm font-semibold text-grow-muted"
                >
                  Togli data
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.status !== 'pubblicato' && (
              <button
                type="button"
                onClick={() => onChangeStatus(item.id, nextStatus)}
                className="grow-press grow-object min-h-11 rounded-full bg-grow-yellow px-4 text-sm font-bold text-grow-black"
              >
                Avanza a {STATUS_LABELS[nextStatus]}
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="grow-press min-h-11 rounded-full px-4 text-sm font-semibold text-grow-fix"
            >
              Elimina
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
