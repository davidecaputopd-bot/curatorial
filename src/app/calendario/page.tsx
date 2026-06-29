'use client'

import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'

const CLIENTS = ['Tutti', 'ANventitre', 'Exousia', 'Cantina Don Carlo', 'ACI Copertino', 'TRAMA']
const STATUSES = ['idea', 'in_produzione', 'pronto', 'pubblicato', 'da_riciclare']
const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea', in_produzione: 'In produzione', pronto: 'Pronto',
  pubblicato: 'Pubblicato', da_riciclare: 'Da riciclare'
}
const STATUS_COLORS: Record<string, string> = {
  idea: 'bg-grow-soft text-grow-muted',
  in_produzione: 'bg-blue-500/20 text-blue-400',
  pronto: 'bg-green-500/20 text-green-400',
  pubblicato: 'bg-grow-yellow text-grow-text',
  da_riciclare: 'bg-red-500/20 text-red-400'
}
const CONTENT_TYPES = ['reel', 'carosello', 'post', 'storia', 'altro']

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

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export default function CalendarioPage() {
  const [items, setItems] = useState<CalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeClient, setActiveClient] = useState('Tutti')
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [week] = useState(new Date())
  const weekDays = getWeekDays(week)

  const [form, setForm] = useState({
    client: '', title: '', content_type: 'reel',
    status: 'idea', scheduled_date: '', notes: ''
  })

  useEffect(() => { loadItems() }, [activeClient])

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
      body: JSON.stringify({ id, status })
    })
  }

  const addItem = async () => {
    if (!form.client || !form.title) return
    setError('')
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.item) {
        setItems(prev => [data.item, ...prev])
        setShowModal(false)
        setForm({ client: '', title: '', content_type: 'reel', status: 'idea', scheduled_date: '', notes: '' })
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
      body: JSON.stringify({ id })
    })
  }

  const itemsForDay = (day: Date) => items.filter(i => {
    if (!i.scheduled_date) return false
    return i.scheduled_date === day.toISOString().split('T')[0]
  })

  const itemsByStatus = (status: string) => items.filter(i => i.status === status)

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text" style={{ fontFamily: "Inter, 'Helvetica Neue', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-lg px-4 pt-12">
        <header className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>GROW Piano</p>
          <h1 className="text-[28px] font-black uppercase tracking-tight">
            Calendario<span className="text-grow-yellow">.</span>
          </h1>
        </header>

        {/* Client selector */}
        <div className="scrollbar-hide -mx-1 mb-6 flex gap-2 overflow-x-auto px-1">
          {CLIENTS.map(c => (
            <button key={c} onClick={() => setActiveClient(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                activeClient === c ? 'bg-grow-text text-grow-yellow' : 'bg-grow-card border border-grow-border text-grow-muted'
              }`}>
              {c}
            </button>
          ))}
        </div>

        {/* Vista settimana */}
        <div className="mb-6">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>Questa settimana</p>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, i) => {
              const dayItems = itemsForDay(day)
              const isToday = day.toDateString() === new Date().toDateString()
              return (
                <div key={i} className={`rounded-xl p-1.5 ${isToday ? 'bg-grow-yellow/20 border border-grow-yellow' : 'bg-grow-card border border-grow-border'}`}>
                  <p className={`text-center text-[9px] font-bold uppercase ${isToday ? 'text-grow-yellow' : 'text-grow-muted'}`}>{DAY_LABELS[i]}</p>
                  <p className={`text-center text-xs font-black ${isToday ? 'text-grow-yellow' : 'text-grow-text'}`}>{day.getDate()}</p>
                  <div className="mt-1 space-y-0.5">
                    {dayItems.slice(0, 2).map(item => (
                      <div key={item.id} className="rounded bg-grow-yellow/80 px-1 py-0.5">
                        <p className="truncate text-[8px] font-bold text-grow-text">{item.title}</p>
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <p className="text-center text-[8px] text-grow-muted">+{dayItems.length - 2}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pipeline kanban */}
        <div className="mb-6">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted" style={{ fontFamily: 'DM Mono, monospace' }}>Pipeline</p>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-pulse rounded-full bg-grow-yellow" />
            </div>
          ) : (
            <div className="space-y-4">
              {STATUSES.map(status => {
                const statusItems = itemsByStatus(status)
                return (
                  <div key={status}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="text-[10px] text-grow-muted">{statusItems.length}</span>
                    </div>
                    {statusItems.length === 0 ? (
                      <p className="text-xs text-grow-muted px-1">—</p>
                    ) : (
                      <div className="space-y-2">
                        {statusItems.map(item => (
                          <div key={item.id} className="rounded-[1rem] border border-grow-border bg-grow-card px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-grow-text truncate">{item.title}</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-[10px] text-grow-yellow font-bold">{item.client}</span>
                                  {item.content_type && (
                                    <span className="text-[10px] text-grow-muted uppercase" style={{ fontFamily: 'DM Mono, monospace' }}>{item.content_type}</span>
                                  )}
                                </div>
                              </div>
                              <button onClick={() => remove(item.id)} className="text-grow-muted hover:text-red-400 transition-colors shrink-0">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                                </svg>
                              </button>
                            </div>
                            {/* Cambia status */}
                            <div className="mt-2 flex gap-1 flex-wrap">
                              {STATUSES.filter(s => s !== status).map(s => (
                                <button key={s} onClick={() => changeStatus(item.id, s)}
                                  className="rounded-full border border-grow-border px-2 py-0.5 text-[9px] text-grow-muted hover:text-grow-text transition-colors">
                                  → {STATUS_LABELS[s]}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottone + */}
      <button onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-grow-yellow text-grow-text shadow-lg">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      {/* Modal nuovo item */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full rounded-t-[2rem] bg-grow-card p-6 pb-10 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-black uppercase">Nuovo contenuto</h2>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Titolo *" className="w-full rounded-xl border border-grow-border bg-grow-soft px-4 py-2.5 text-sm focus:outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                className="rounded-xl border border-grow-border bg-grow-soft px-3 py-2.5 text-sm focus:outline-none">
                <option value="">Cliente *</option>
                {CLIENTS.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.content_type} onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))}
                className="rounded-xl border border-grow-border bg-grow-soft px-3 py-2.5 text-sm focus:outline-none">
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
              className="w-full rounded-xl border border-grow-border bg-grow-soft px-4 py-2.5 text-sm focus:outline-none" />
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Note..." rows={2}
              className="w-full resize-none rounded-xl border border-grow-border bg-grow-soft px-4 py-2.5 text-sm focus:outline-none" />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-full border border-grow-border py-3 text-sm text-grow-muted">Annulla</button>
              <button onClick={addItem} disabled={!form.client || !form.title}
                className="flex-1 rounded-full bg-grow-yellow py-3 text-sm font-bold text-grow-text disabled:opacity-40">Salva</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
