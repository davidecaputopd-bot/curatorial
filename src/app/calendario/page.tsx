'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

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
const CLIENT_COLORS: Record<string, string> = {
  ANventitre: 'bg-amber-400',
  Exousia: 'bg-emerald-500',
  'Cantina Don Carlo': 'bg-purple-400',
  'ACI Copertino': 'bg-sky-400',
  TRAMA: 'bg-rose-400',
}
const CLIENT_TEXT: Record<string, string> = {
  ANventitre: 'text-amber-600',
  Exousia: 'text-emerald-600',
  'Cantina Don Carlo': 'text-purple-600',
  'ACI Copertino': 'text-sky-600',
  TRAMA: 'text-rose-600',
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
type GrowthMood = 'quiet' | 'moving' | 'loaded' | 'bloom'

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
  const growthMood: GrowthMood =
    overdue.length > 0
      ? 'loaded'
      : todayItems.length === 0 && weekCount <= 2
        ? 'quiet'
        : inMotion.length >= 4 || weekCount >= 7
          ? 'bloom'
          : 'moving'

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
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text">
      <div className="mx-auto max-w-lg px-4 pt-9 lg:max-w-5xl">
        <header className="mb-5">
          <div className="flex min-h-[8.5rem] items-start justify-between gap-4 overflow-hidden">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-grow-muted">
                GROW Piano
              </p>
              <h1 className="mt-1 text-[40px] font-black uppercase leading-[0.9] tracking-tighter">
                Piano<span className="text-grow-yellow">.</span>
              </h1>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-grow-muted">
                Non un calendario. Il prossimo lavoro da chiudere.
              </p>
            </div>
            <div className="relative -mr-3 flex w-[8.25rem] shrink-0 flex-col items-end">
              <GrowthMark mood={growthMood} />
              <button
                type="button"
                onClick={() => openModal()}
                className="-mt-2 mr-3 rounded-full bg-grow-yellow px-4 py-3 text-[10px] font-black uppercase text-grow-text shadow-[0_10px_24px_rgba(255,229,0,0.28)] active:scale-[0.98]"
              >
                Nuovo
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 overflow-hidden rounded-[1.35rem] border border-grow-border bg-grow-card">
            <Metric label="oggi" value={todayItems.length} active />
            <Metric label="ritardo" value={overdue.length} warn={overdue.length > 0} />
            <Metric label="settimana" value={weekCount} />
            <Metric label="da piazzare" value={unscheduled.length} />
          </div>
        </header>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {CLIENTS.map((client) => (
            <button
              key={client}
              type="button"
              onClick={() => setActiveClient(client)}
              className={[
                'shrink-0 rounded-full px-3 py-2 text-[10px] font-black',
                activeClient === client
                  ? 'bg-grow-text text-grow-yellow'
                  : 'border border-grow-border bg-grow-card text-grow-muted',
              ].join(' ')}
            >
              {client === 'Tutti' ? (
                'Tutti'
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${CLIENT_COLORS[client] || 'bg-grow-muted'}`} />
                  {client}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-full border border-grow-border bg-grow-card p-1">
          {(['agenda', 'pipeline'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={[
                'rounded-full py-2 text-[10px] font-black uppercase',
                view === item ? 'bg-grow-text text-grow-yellow' : 'text-grow-muted',
              ].join(' ')}
            >
              {item === 'agenda' ? 'Oggi e prossimi' : 'Pipeline'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-[1.35rem] bg-grow-soft" />
            ))}
          </div>
        ) : view === 'agenda' ? (
          <div className="space-y-6">
            <FocusPanel items={focusItems} todayKey={todayKey} onChangeStatus={changeStatus} />

            <section>
              <SectionTitle title="Ritmo settimana" meta={`${weekCount} item`} />
              <div className="grid grid-cols-7 gap-1.5">
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
                        'min-h-24 rounded-[1rem] border p-2 text-left transition active:scale-[0.98]',
                        isToday
                          ? 'border-grow-yellow bg-grow-yellow text-grow-text'
                          : 'border-grow-border bg-grow-card',
                      ].join(' ')}
                    >
                      <span className="block text-[8px] font-black uppercase text-current/55">
                        {DAY_LABELS[index]}
                      </span>
                      <span className="mt-1 block text-lg font-black leading-none">
                        {day.getDate()}
                      </span>
                      <span className="mt-3 block text-[10px] font-black">
                        {dayItems.length}
                      </span>
                      <span className="mt-1 flex gap-0.5">
                        {dayItems.slice(0, 4).map((item) => (
                          <span
                            key={item.id}
                            className={`h-1.5 flex-1 rounded-full ${CLIENT_COLORS[item.client] || 'bg-grow-muted'}`}
                          />
                        ))}
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
              onRemove={remove}
            />
            <AgendaSection
              title="In ritardo"
              empty="Nessun arretrato. Respira."
              items={overdue}
              todayKey={todayKey}
              onChangeStatus={changeStatus}
              onRemove={remove}
              danger
            />
            <AgendaSection
              title="Prossimi"
              empty="Nessun contenuto programmato nei prossimi giorni."
              items={upcoming}
              todayKey={todayKey}
              onChangeStatus={changeStatus}
              onRemove={remove}
            />
            <AgendaSection
              title="Da piazzare"
              empty="Nessuna idea senza data."
              items={unscheduled}
              todayKey={todayKey}
              onChangeStatus={changeStatus}
              onRemove={remove}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-[1.5rem] bg-grow-text p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-grow-yellow">
                Stato produzione
              </p>
              <h2 className="mt-2 text-2xl font-black leading-none tracking-tight">
                {inMotion.length} cose aperte.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
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
          className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full rounded-t-[2rem] bg-grow-card p-5 pb-10 shadow-[0_-20px_60px_rgba(15,15,16,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-grow-muted">
                  Nuovo blocco
                </p>
                <h2 className="text-xl font-black uppercase">Cosa va prodotto?</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-grow-soft text-grow-muted"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Titolo o consegna"
                className="w-full rounded-2xl border border-grow-border bg-grow-soft px-4 py-3 text-sm font-semibold outline-none focus:border-grow-yellow"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.client}
                  onChange={(event) => setForm((current) => ({ ...current, client: event.target.value }))}
                  className="rounded-2xl border border-grow-border bg-grow-soft px-3 py-3 text-sm outline-none"
                >
                  <option value="">Cliente</option>
                  {CLIENTS.slice(1).map((client) => (
                    <option key={client} value={client}>{client}</option>
                  ))}
                </select>
                <select
                  value={form.content_type}
                  onChange={(event) => setForm((current) => ({ ...current, content_type: event.target.value }))}
                  className="rounded-2xl border border-grow-border bg-grow-soft px-3 py-3 text-sm outline-none"
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
                  className="rounded-2xl border border-grow-border bg-grow-soft px-3 py-3 text-sm outline-none"
                />
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  className="rounded-2xl border border-grow-border bg-grow-soft px-3 py-3 text-sm outline-none"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Prossima azione, vincoli, reference mancanti..."
                rows={3}
                className="w-full resize-none rounded-2xl border border-grow-border bg-grow-soft px-4 py-3 text-sm outline-none focus:border-grow-yellow"
              />
            </div>

            {error && <p className="mt-3 text-xs font-bold text-red-500">{error}</p>}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full border border-grow-border py-3 text-sm font-black text-grow-muted"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void addItem()}
                disabled={!form.client || !form.title}
                className="rounded-full bg-grow-yellow py-3 text-sm font-black text-grow-text disabled:opacity-40"
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

function Metric({
  label,
  value,
  active,
  warn,
}: {
  label: string
  value: number
  active?: boolean
  warn?: boolean
}) {
  return (
    <div className={['border-r border-grow-border px-2 py-3 text-center last:border-r-0', active ? 'bg-grow-yellow' : ''].join(' ')}>
      <p className={['text-xl font-black leading-none', warn ? 'text-red-500' : 'text-grow-text'].join(' ')}>
        {value}
      </p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-wide text-grow-muted">
        {label}
      </p>
    </div>
  )
}

function GrowthMark({ mood }: { mood: GrowthMood }) {
  const mark: Record<GrowthMood, { src: string; label: string; className: string }> = {
    quiet: {
      src: '/icon-1.svg',
      label: 'Seme GROW',
      className: 'w-[7rem] translate-y-1',
    },
    moving: {
      src: '/icon-3.svg',
      label: 'Germoglio GROW',
      className: 'w-[7.6rem] translate-x-1 translate-y-2',
    },
    loaded: {
      src: '/icon-2.svg',
      label: 'GROW in movimento',
      className: 'w-[7.3rem] translate-y-1',
    },
    bloom: {
      src: '/icon-5.svg',
      label: 'Fiore GROW',
      className: 'w-[8.2rem] -translate-y-1',
    },
  }
  const current = mark[mood]

  return (
    <div className="relative flex h-[7.4rem] w-[8.25rem] items-center justify-center overflow-visible">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.src}
        alt={current.label}
        className={`${current.className} relative z-10 max-w-none object-contain`}
      />
    </div>
  )
}

function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-2 flex items-end justify-between">
      <h2 className="text-[13px] font-black uppercase tracking-tight text-grow-text">
        {title}
      </h2>
      {meta && <span className="text-[10px] font-black text-grow-muted">{meta}</span>}
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-grow-border bg-grow-card px-4 py-5 text-sm font-semibold text-grow-muted">
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
  return (
    <section className="rounded-[1.7rem] bg-grow-text p-4 text-white shadow-[0_18px_50px_rgba(15,15,16,0.16)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-grow-yellow">
            Focus operativo
          </p>
          <h2 className="mt-2 text-2xl font-black leading-none tracking-tight">
            Prima chiudi questo.
          </h2>
        </div>
        <span className="rounded-full bg-grow-yellow px-3 py-1 text-[9px] font-black uppercase text-grow-text">
          Oggi
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-[1.2rem] bg-white/8 px-4 py-4 text-sm font-semibold text-white/65">
          Nessun incendio. Scegli una cosa da far avanzare e mettila in produzione.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-[1.2rem] bg-white px-3 py-3 text-grow-text">
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-8 w-1 shrink-0 rounded-full ${CLIENT_COLORS[item.client] || 'bg-grow-yellow'}`} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-black leading-tight">{item.title}</p>
                  <p className="mt-1 text-[10px] font-black uppercase text-grow-muted">
                    {item.client} - {distanceLabel(item.scheduled_date, todayKey)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeStatus(item.id, item.status === 'pronto' ? 'pubblicato' : 'pronto')}
                  className="shrink-0 rounded-full bg-grow-yellow px-3 py-2 text-[9px] font-black uppercase text-grow-text"
                >
                  Avanza
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function AgendaSection({
  title,
  empty,
  items,
  todayKey,
  onChangeStatus,
  onRemove,
  danger,
}: {
  title: string
  empty: string
  items: CalItem[]
  todayKey: string
  onChangeStatus: (id: string, status: string) => void
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
  onRemove,
}: {
  item: CalItem
  todayKey: string
  danger?: boolean
  onChangeStatus: (id: string, status: string) => void
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const statusIndex = STATUSES.indexOf(item.status)
  const nextStatus = STATUSES[Math.min(STATUSES.length - 1, Math.max(0, statusIndex + 1))]

  return (
    <article
      className={[
        'overflow-hidden rounded-[1.35rem] border bg-grow-card',
        danger ? 'border-red-300' : 'border-grow-border',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left active:scale-[0.99]"
      >
        <span className={`mt-1 h-10 w-1 shrink-0 rounded-full ${CLIENT_COLORS[item.client] || 'bg-grow-yellow'}`} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[15px] font-black leading-tight text-grow-text">
            {item.title}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase text-grow-muted">
            <span className={CLIENT_TEXT[item.client] || 'text-grow-muted'}>{item.client}</span>
            {item.content_type && <span>{item.content_type}</span>}
            <span>{shortDate(item.scheduled_date)}</span>
          </span>
          <span className="mt-2 block text-xs font-semibold text-grow-muted">
            Prossima azione: {NEXT_ACTIONS[item.status] || 'Decidi avanzamento'}
          </span>
        </span>
        <span
          className={[
            'shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase',
            danger ? 'bg-red-500 text-white' : 'bg-grow-soft text-grow-muted',
          ].join(' ')}
        >
          {distanceLabel(item.scheduled_date, todayKey)}
        </span>
      </button>

      {open && (
        <div className="border-t border-grow-border bg-grow-soft px-4 py-3">
          <div className="mb-3 flex gap-1">
            {STATUSES.map((status, index) => (
              <span
                key={status}
                className={[
                  'h-1.5 flex-1 rounded-full',
                  index <= statusIndex ? 'bg-grow-yellow' : 'bg-grow-border',
                ].join(' ')}
              />
            ))}
          </div>
          {item.notes && (
            <p className="mb-3 rounded-[1rem] bg-grow-card px-3 py-2 text-xs leading-relaxed text-grow-muted">
              {item.notes}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {item.status !== 'pubblicato' && (
              <button
                type="button"
                onClick={() => onChangeStatus(item.id, nextStatus)}
                className="rounded-full bg-grow-yellow px-3 py-2 text-[9px] font-black uppercase text-grow-text"
              >
                Avanza a {STATUS_LABELS[nextStatus]}
              </button>
            )}
            <Link
              href={`/ai?project=${encodeURIComponent(item.client)}&brief=${encodeURIComponent(item.title)}`}
              className="rounded-full bg-grow-text px-3 py-2 text-[9px] font-black uppercase text-grow-yellow"
            >
              Lavora in AI
            </Link>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="rounded-full border border-red-200 px-3 py-2 text-[9px] font-black uppercase text-red-500"
            >
              Elimina
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
