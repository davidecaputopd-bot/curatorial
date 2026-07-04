'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

const CLIENTS = ['Tutti', 'ANventitre', 'Exousia', 'Cantina Don Carlo', 'ACI Copertino', 'TRAMA']
const STATUSES = ['idea', 'in_produzione', 'pronto', 'pubblicato', 'da_riciclare']
const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  in_produzione: 'In produzione',
  pronto: 'Pronto',
  pubblicato: 'Pubblicato',
  da_riciclare: 'Da riciclare',
}
const STATUS_COLORS: Record<string, string> = {
  idea: 'bg-grow-soft text-grow-muted border-grow-border',
  in_produzione: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  pronto: 'bg-green-500/15 text-green-400 border-green-500/20',
  pubblicato: 'bg-grow-yellow/20 text-grow-yellow border-grow-yellow/30',
  da_riciclare: 'bg-red-500/15 text-red-400 border-red-500/20',
}
const STATUS_DOT: Record<string, string> = {
  idea: 'bg-grow-muted',
  in_produzione: 'bg-blue-400',
  pronto: 'bg-green-400',
  pubblicato: 'bg-grow-yellow',
  da_riciclare: 'bg-red-400',
}
const STATUS_ICONS: Record<string, string> = {
  idea: '/icon-1.svg',
  in_produzione: '/icon-3.svg',
  pronto: '/icon-4.svg',
  pubblicato: '/icon-5.svg',
  da_riciclare: '/icon-2.svg',
}
const CLIENT_COLORS: Record<string, string> = {
  ANventitre: 'bg-amber-400',
  Exousia: 'bg-emerald-500',
  'Cantina Don Carlo': 'bg-purple-400',
  'ACI Copertino': 'bg-sky-400',
  TRAMA: 'bg-rose-400',
}
const CLIENT_TEXT: Record<string, string> = {
  ANventitre: 'text-amber-400',
  Exousia: 'text-emerald-400',
  'Cantina Don Carlo': 'text-purple-400',
  'ACI Copertino': 'text-sky-400',
  TRAMA: 'text-rose-400',
}
const CONTENT_TYPES = ['reel', 'carosello', 'post', 'storia', 'altro']
const CONTENT_ICONS: Record<string, string> = {
  reel: '▶',
  carosello: '◫',
  post: '□',
  storia: '◻',
  altro: '·',
}
const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const DAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

type CalItem = {
  id: string
  client: string
  title: string
  content_type?: string
  status: string
  scheduled_date?: string
  notes?: string
}

function getWeekDays(date: Date) {
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7 // make Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export default function CalendarioPage() {
  const [items, setItems] = useState<CalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeClient, setActiveClient] = useState('Tutti')
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'settimana' | 'pipeline'>('settimana')
  const [error, setError] = useState('')
  const [week, setWeek] = useState(new Date())
  const weekDays = getWeekDays(week)

  const today = new Date()
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [calYear, setCalYear] = useState(today.getFullYear())
  const monthDays = getMonthDays(calYear, calMonth)

  const prevWeek = () => setWeek(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextWeek = () => setWeek(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  const isCurrentWeek = getWeekDays(today)[0].toDateString() === weekDays[0].toDateString()

  const emptyForm = { client: '', title: '', content_type: 'reel', status: 'idea', scheduled_date: '', notes: '' }
  const [form, setForm] = useState(emptyForm)

  const openModalForDay = (day: Date) => {
    setForm({ ...emptyForm, scheduled_date: isoDate(day) })
    setShowModal(true)
  }

  useEffect(() => { void loadItems() }, [activeClient])

  const loadItems = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeClient !== 'Tutti') params.set('client', activeClient)
      const res = await fetch(`/api/calendar?${params}`)
      const data = await res.json()
      setItems(data.items || [])
    } catch {}
    setLoading(false)
  }

  const changeStatus = async (id: string, status: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    await fetch('/api/calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
  }

  const addItem = async () => {
    if (!form.client || !form.title) return
    setError('')
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.item) {
        setItems(prev => [data.item, ...prev])
        setShowModal(false)
        setForm(emptyForm)
      } else {
        setError(data.error || 'Salvataggio non riuscito.')
      }
    } catch {
      setError('Errore di rete. Riprova.')
    }
  }

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch('/api/calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  const itemsForDay = (day: Date) =>
    items.filter(i => i.scheduled_date === isoDate(day))

  const itemsByStatus = (status: string) =>
    items.filter(i => i.status === status)

  const scheduledDates = new Set(items.map(i => i.scheduled_date).filter(Boolean))

  // Stats
  const statsThisWeek = weekDays.flatMap(d => itemsForDay(d)).length
  const statsUnscheduled = items.filter(i => !i.scheduled_date).length

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text">
      <div className="mx-auto max-w-lg px-4 pt-10">

        {/* Header */}
        <header className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>GROW Piano</p>
            <h1 className="text-[28px] font-black uppercase leading-tight tracking-tight">
              Calendario<span className="text-grow-yellow">.</span>
            </h1>
          </div>
          <div className="flex gap-2 text-right">
            <div className="rounded-2xl border border-grow-border bg-grow-card px-3 py-2 text-center">
              <p className="text-[18px] font-black leading-none text-grow-text">{statsThisWeek}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase text-grow-muted">settimana</p>
            </div>
            <div className="rounded-2xl border border-grow-border bg-grow-card px-3 py-2 text-center">
              <p className="text-[18px] font-black leading-none text-grow-text">{items.length}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase text-grow-muted">totale</p>
            </div>
            {statsUnscheduled > 0 && (
              <div className="rounded-2xl border border-grow-yellow/30 bg-grow-yellow/10 px-3 py-2 text-center">
                <p className="text-[18px] font-black leading-none text-grow-yellow">{statsUnscheduled}</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase text-grow-yellow/70">no data</p>
              </div>
            )}
          </div>
        </header>

        {/* Client filter */}
        <div className="scrollbar-hide -mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
          {CLIENTS.map(c => (
            <button key={c} onClick={() => setActiveClient(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                activeClient === c
                  ? 'bg-grow-text text-grow-yellow shadow-sm'
                  : 'border border-grow-border bg-grow-card text-grow-muted hover:text-grow-text'
              }`}>
              {c === 'Tutti' ? 'Tutti' : (
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${CLIENT_COLORS[c] || 'bg-grow-muted'}`} />
                  {c}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="mb-5 flex rounded-2xl border border-grow-border bg-grow-card p-1">
          {(['settimana', 'pipeline'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold uppercase tracking-tight transition-colors ${
                activeTab === tab ? 'bg-grow-text text-grow-yellow' : 'text-grow-muted'
              }`}>
              {tab === 'settimana' ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              )}
              {tab === 'settimana' ? 'Settimana' : 'Pipeline'}
            </button>
          ))}
        </div>

        {activeTab === 'settimana' && (
          <>
            {/* Mini month calendar */}
            <div className="mb-5 overflow-hidden rounded-[1.5rem] border border-[#D9C968] bg-grow-butter">
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <button onClick={() => {
                  const d = new Date(calYear, calMonth - 1, 1)
                  setCalMonth(d.getMonth()); setCalYear(d.getFullYear())
                }} className="flex h-7 w-7 items-center justify-center rounded-full text-grow-muted hover:text-grow-text">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round"/></svg>
                </button>
                <p className="text-xs font-black uppercase tracking-wider text-grow-text">
                  {MONTH_LABELS[calMonth]} {calYear}
                </p>
                <button onClick={() => {
                  const d = new Date(calYear, calMonth + 1, 1)
                  setCalMonth(d.getMonth()); setCalYear(d.getFullYear())
                }} className="flex h-7 w-7 items-center justify-center rounded-full text-grow-muted hover:text-grow-text">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
                </button>
              </div>
              {/* Day headers */}
              <div className="grid grid-cols-7 border-t border-grow-border">
                {DAY_LABELS.map((l, i) => (
                  <p key={i} className="py-1.5 text-center text-[9px] font-bold uppercase text-grow-muted">{l}</p>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7">
                {monthDays.map((day, i) => {
                  if (!day) return <div key={i} />
                  const iso = isoDate(day)
                  const hasDot = scheduledDates.has(iso)
                  const isToday = iso === isoDate(today)
                  const inWeek = weekDays.some(d => isoDate(d) === iso)
                  return (
                    <button key={i} onClick={() => {
                      setWeek(day)
                      setCalMonth(day.getMonth())
                      setCalYear(day.getFullYear())
                    }}
                      className={`relative flex flex-col items-center py-1.5 transition-colors ${
                        isToday ? 'font-black text-grow-yellow' :
                        inWeek ? 'font-bold text-grow-text' : 'text-grow-muted hover:text-grow-text'
                      }`}>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                        isToday ? 'bg-grow-yellow text-grow-text' :
                        inWeek ? 'bg-grow-soft' : ''
                      }`}>{day.getDate()}</span>
                      {hasDot && (
                        <span className={`mt-0.5 h-1 w-1 rounded-full ${isToday ? 'bg-grow-text' : 'bg-grow-yellow'}`} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Week strip */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>
                {isCurrentWeek
                  ? 'Questa settimana'
                  : `${weekDays[0].getDate()} ${MONTH_LABELS[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTH_LABELS[weekDays[6].getMonth()]}`}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={prevWeek} className="flex h-7 w-7 items-center justify-center rounded-full border border-grow-border text-grow-muted hover:text-grow-text">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round"/></svg>
                </button>
                {!isCurrentWeek && (
                  <button onClick={() => { setWeek(today); setCalMonth(today.getMonth()); setCalYear(today.getFullYear()) }}
                    className="rounded-full bg-grow-yellow px-2.5 py-0.5 text-[9px] font-bold text-grow-text">oggi</button>
                )}
                <button onClick={nextWeek} className="flex h-7 w-7 items-center justify-center rounded-full border border-grow-border text-grow-muted hover:text-grow-text">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>

            {/* Week day columns */}
            <div className="mb-6 grid grid-cols-7 gap-1.5">
              {weekDays.map((day, i) => {
                const dayItems = itemsForDay(day)
                const isToday = isoDate(day) === isoDate(today)
                return (
                  <div key={i}
                    onClick={() => openModalForDay(day)}
                    className={`cursor-pointer rounded-2xl p-2 transition-colors ${
                      isToday
                        ? 'border border-grow-yellow bg-grow-yellow/10'
                        : 'border border-grow-border bg-grow-card hover:border-grow-yellow/30 hover:bg-grow-yellow/5'
                    }`}>
                    <p className={`text-center text-[9px] font-bold uppercase tracking-wide ${isToday ? 'text-grow-yellow' : 'text-grow-muted'}`}>
                      {DAY_LABELS[i]}
                    </p>
                    <p className={`text-center text-sm font-black ${isToday ? 'text-grow-yellow' : 'text-grow-text'}`}>
                      {day.getDate()}
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {dayItems.slice(0, 3).map(item => (
                        <div key={item.id}
                          onClick={e => { e.stopPropagation(); setExpandedId(expandedId === item.id ? null : item.id) }}
                          className="group relative">
                          <div className={`overflow-hidden rounded-md ${CLIENT_COLORS[item.client] || 'bg-grow-yellow'} p-1`}>
                            <p className="truncate text-[7px] font-bold leading-tight text-white/90">{item.title}</p>
                            <p className="mt-0.5 text-[6px] uppercase text-white/60">{item.content_type}</p>
                          </div>
                        </div>
                      ))}
                      {dayItems.length > 3 && (
                        <p className="text-center text-[8px] font-bold text-grow-muted">+{dayItems.length - 3}</p>
                      )}
                      {dayItems.length === 0 && (
                        <div className="flex h-6 items-center justify-center">
                          <span className="text-[10px] text-grow-border">+</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Items scheduled this week — full detail */}
            {weekDays.flatMap(d => itemsForDay(d)).length > 0 && (
              <div className="mb-6">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>
                  Contenuti della settimana
                </p>
                <div className="space-y-2">
                  {weekDays.flatMap(day =>
                    itemsForDay(day).map(item => (
                      <WeekItem key={item.id} item={item} onChangeStatus={changeStatus} onRemove={remove} />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Unscheduled */}
            {items.filter(i => !i.scheduled_date).length > 0 && (
              <div className="mb-6">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>
                  Non schedulati
                </p>
                <div className="space-y-2">
                  {items.filter(i => !i.scheduled_date).map(item => (
                    <WeekItem key={item.id} item={item} onChangeStatus={changeStatus} onRemove={remove} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'pipeline' && (
          <div className="mb-6">
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-grow-soft" />)}
              </div>
            ) : (
              <>
                {/* Status flow overview bar */}
                <div className="mb-5 flex overflow-hidden rounded-2xl border border-grow-border">
                  {STATUSES.map((s, i) => {
                    const count = itemsByStatus(s).length
                    const pct = items.length ? Math.round((count / items.length) * 100) : 0
                    return (
                      <div key={s} className={`relative flex-1 py-3 text-center ${i < STATUSES.length - 1 ? 'border-r border-grow-border' : ''}`}>
                        <span className="relative mx-auto mb-1 flex h-7 w-8 items-end justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={STATUS_ICONS[s]}
                            alt=""
                            className="absolute bottom-0 w-6 max-w-none object-contain"
                          />
                        </span>
                        <p className="text-[15px] font-black text-grow-text">{count}</p>
                        <p className="text-[8px] font-bold uppercase text-grow-muted">{STATUS_LABELS[s].split(' ')[0]}</p>
                        {pct > 0 && (
                          <div className={`absolute bottom-0 left-0 h-0.5 ${STATUS_DOT[s]}`} style={{ width: `${pct}%` }} />
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-6">
                  {STATUSES.map(status => {
                    const statusItems = itemsByStatus(status)
                    return (
                      <div key={status}>
                        <div className="mb-2 flex min-h-9 items-end gap-2">
                          <span className="relative flex h-8 w-9 shrink-0 items-end justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={STATUS_ICONS[status]}
                              alt=""
                              className="absolute bottom-0 w-7 max-w-none object-contain"
                            />
                          </span>
                          <span className="text-xs font-black uppercase tracking-tight text-grow-text">
                            {STATUS_LABELS[status]}
                          </span>
                          <span className="text-[10px] text-grow-muted">{statusItems.length}</span>
                        </div>
                        {statusItems.length === 0 ? (
                          <p className="pl-4 text-xs text-grow-border">—</p>
                        ) : (
                          <div className="space-y-2">
                            {statusItems.map(item => (
                              <PipelineItem key={item.id} item={item} onChangeStatus={changeStatus} onRemove={remove} />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => { setForm(emptyForm); setShowModal(true) }}
        className="fixed bottom-24 right-4 flex h-13 w-13 items-center justify-center rounded-full bg-grow-yellow text-grow-text shadow-[0_8px_24px_rgba(255,229,0,0.4)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm"
          onClick={() => setShowModal(false)}>
          <div className="w-full space-y-3 rounded-t-[2rem] bg-grow-card p-6 pb-10"
            onClick={e => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-black uppercase">Nuovo contenuto</h2>
              <button onClick={() => setShowModal(false)} className="text-grow-muted">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>

            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') void addItem() }}
              placeholder="Titolo contenuto *"
              className="w-full rounded-2xl border border-grow-border bg-grow-soft px-4 py-3 text-sm focus:outline-none focus:border-grow-yellow" />

            <div className="grid grid-cols-2 gap-2">
              <select value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                className="rounded-2xl border border-grow-border bg-grow-soft px-3 py-3 text-sm focus:outline-none">
                <option value="">Cliente *</option>
                {CLIENTS.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.content_type} onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))}
                className="rounded-2xl border border-grow-border bg-grow-soft px-3 py-3 text-sm focus:outline-none">
                {CONTENT_TYPES.map(t => (
                  <option key={t} value={t}>{CONTENT_ICONS[t]} {t}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={form.scheduled_date}
                onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                className="rounded-2xl border border-grow-border bg-grow-soft px-3 py-3 text-sm focus:outline-none" />
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="rounded-2xl border border-grow-border bg-grow-soft px-3 py-3 text-sm focus:outline-none">
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>

            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Note opzionali..." rows={2}
              className="w-full resize-none rounded-2xl border border-grow-border bg-grow-soft px-4 py-3 text-sm focus:outline-none" />

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-full border border-grow-border py-3.5 text-sm font-semibold text-grow-muted">
                Annulla
              </button>
              <button onClick={() => void addItem()} disabled={!form.client || !form.title}
                className="flex-1 rounded-full bg-grow-yellow py-3.5 text-sm font-black text-grow-text disabled:opacity-40">
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

function WeekItem({ item, onChangeStatus, onRemove }: {
  item: CalItem
  onChangeStatus: (id: string, s: string) => void
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-2xl border border-grow-border bg-grow-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`h-2.5 w-1 shrink-0 rounded-full ${CLIENT_COLORS[item.client] || 'bg-grow-muted'}`} />
        <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
          <p className="truncate text-sm font-semibold text-grow-text">{item.title}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className={`text-[10px] font-bold ${CLIENT_TEXT[item.client] || 'text-grow-muted'}`}>{item.client}</span>
            {item.content_type && (
              <span className="text-[10px] text-grow-muted">{CONTENT_ICONS[item.content_type]} {item.content_type}</span>
            )}
            {item.scheduled_date && (
              <span className="text-[10px] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>
                {new Date(item.scheduled_date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </button>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${STATUS_COLORS[item.status]}`}>
          {STATUS_LABELS[item.status]}
        </span>
        <button onClick={() => onRemove(item.id)} className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full text-grow-muted hover:bg-red-500/10 hover:text-red-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-grow-border bg-grow-soft px-4 py-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {STATUSES.filter(s => s !== item.status).map(s => (
              <button key={s} onClick={() => onChangeStatus(item.id, s)}
                className={`rounded-full border px-2.5 py-1 text-[9px] font-bold transition-colors ${STATUS_COLORS[s]}`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <Link href={`/ai?project=${encodeURIComponent(item.client)}&brief=${encodeURIComponent(item.title)}`}
            className="inline-flex items-center gap-1 rounded-full bg-grow-black px-3 py-1.5 text-[9px] font-bold uppercase text-grow-yellow">
            Lavora in AI →
          </Link>
        </div>
      )}
    </div>
  )
}

function PipelineItem({ item, onChangeStatus, onRemove }: {
  item: CalItem
  onChangeStatus: (id: string, s: string) => void
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const statusIdx = STATUSES.indexOf(item.status)

  return (
    <div className="overflow-hidden rounded-2xl border border-grow-border bg-grow-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`h-8 w-1 shrink-0 rounded-full ${CLIENT_COLORS[item.client] || 'bg-grow-muted'}`} />
        <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
          <p className="truncate text-sm font-semibold text-grow-text">{item.title}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-[10px] font-bold ${CLIENT_TEXT[item.client] || 'text-grow-muted'}`}>{item.client}</span>
            {item.content_type && (
              <span className="text-[10px] text-grow-muted">{CONTENT_ICONS[item.content_type]} {item.content_type}</span>
            )}
            {item.scheduled_date && (
              <span className="text-[10px] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>
                {new Date(item.scheduled_date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          {/* Linear-style progress bar */}
          <div className="mt-2 flex gap-0.5">
            {STATUSES.map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= statusIdx ? STATUS_DOT[item.status] : 'bg-grow-border'}`} />
            ))}
          </div>
        </button>
        <button onClick={() => onRemove(item.id)} className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full text-grow-muted hover:bg-red-500/10 hover:text-red-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-grow-border bg-grow-soft px-4 py-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {STATUSES.filter(s => s !== item.status).map(s => (
              <button key={s} onClick={() => onChangeStatus(item.id, s)}
                className={`rounded-full border px-2.5 py-1 text-[9px] font-bold transition-colors ${STATUS_COLORS[s]}`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {item.notes && <p className="mb-2 text-xs text-grow-muted">{item.notes}</p>}
          <Link href={`/ai?project=${encodeURIComponent(item.client)}&brief=${encodeURIComponent(item.title)}`}
            className="inline-flex items-center gap-1 rounded-full bg-grow-black px-3 py-1.5 text-[9px] font-bold uppercase text-grow-yellow">
            Lavora in AI →
          </Link>
        </div>
      )}
    </div>
  )
}
