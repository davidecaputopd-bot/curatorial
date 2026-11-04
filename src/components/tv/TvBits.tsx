'use client'

// Elementi ricorrenti della sezione Serie, nello stile di TV Time:
// poster verticali, codice episodio "S1 · E2", check rotondo, barra di avanzamento.

export type TvShow = {
  id: number
  title: string
  poster: string | null
  network: string | null
  show_status: string | null
  followed: boolean
  tvtime_status: string | null
  progress_season: number | null
  progress_episode: number | null
  last_watched_at: string | null
  followed_at: string | null
  favorite: boolean
  for_later: boolean
  favorite_position: number | null
  notify: boolean
  synced_at: string | null
  tvmaze_id: number | null
  next_episode_id: number | null
  next_season: number | null
  next_number: number | null
  next_name: string | null
  next_airstamp: string | null
  aired_count: number
  unwatched_count: number
  watched_minutes: number
  upcoming_airstamp: string | null
  return_season?: number | null
  return_date?: string | null
}

export const episodeCode = (season: number, number: number) =>
  `S${season} · E${number}`

export function Poster({ src, title, className = '' }: { src: string | null; title: string; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={title} loading="lazy" className={`object-cover outline outline-1 -outline-offset-1 outline-white/10 ${className}`} />
  ) : (
    <div className={`grow-surface flex items-end p-2 ${className}`}>
      <span className="font-display text-sm leading-[0.95] text-grow-text">{title}</span>
    </div>
  )
}

// Stato della barra sotto il poster, come nella griglia "Serie" di TV Time.
export function progressState(show: TvShow) {
  if (show.progress_season === null) return { tone: 'unknown', ratio: 0, label: 'Da impostare' }
  const watched = Math.max(show.aired_count - show.unwatched_count, 0)
  const ratio = show.aired_count ? watched / show.aired_count : 0
  if (show.aired_count && show.unwatched_count === 0) {
    return show.show_status === 'Ended'
      ? { tone: 'done', ratio: 1, label: 'Completata' }
      : { tone: 'uptodate', ratio: 1, label: 'Al passo' }
  }
  if (watched === 0) return { tone: 'new', ratio: 0, label: 'Non iniziata' }
  return { tone: 'progress', ratio, label: `${show.unwatched_count} da vedere` }
}

const TONES: Record<string, string> = {
  done: 'bg-grow-done',
  uptodate: 'bg-grow-ok',
  progress: 'bg-grow-yellow',
  new: 'bg-grow-border',
  unknown: 'bg-grow-border',
}

export function ProgressBar({ show, className = '' }: { show: TvShow; className?: string }) {
  const state = progressState(show)
  return (
    <div className={`h-1.5 w-full bg-grow-soft ${className}`}>
      <div className={`h-full ${TONES[state.tone]}`} style={{ width: `${Math.round(state.ratio * 100)}%` }} />
    </div>
  )
}

export function CheckButton({
  checked,
  busy,
  onClick,
  label,
}: {
  checked: boolean
  busy?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={checked}
      className={[
        'grow-press flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
        checked
          ? 'grow-object grow-draw scale-105 bg-grow-yellow text-grow-black'
          : 'grow-socket text-grow-muted hover:text-grow-text',
        busy ? 'opacity-50' : '',
      ].join(' ')}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </button>
  )
}

export function airLabel(airstamp: string) {
  const date = new Date(airstamp)
  const today = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(date) - startOf(today)) / 86_400_000)
  if (days === 0) return 'Oggi'
  if (days === 1) return 'Domani'
  if (days === -1) return 'Ieri'
  return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function airTime(airstamp: string) {
  return new Date(airstamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function longDate(airstamp: string) {
  return new Date(airstamp).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function monthYear(airstamp: string) {
  return new Date(airstamp).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

// Da quanto tempo, a parole: "3 mesi", "1 anno e 2 mesi".
export function sinceLabel(airstamp: string, now = Date.now()) {
  const months = Math.max(Math.floor((now - new Date(airstamp).getTime()) / (30.44 * 86_400_000)), 0)
  if (months < 1) return 'meno di un mese'
  const years = Math.floor(months / 12)
  const rest = months % 12
  const y = years === 1 ? '1 anno' : `${years} anni`
  const m = rest === 1 ? '1 mese' : `${rest} mesi`
  return years === 0 ? m : rest === 0 ? y : `${y} e ${m}`
}

export type ReturnFacts = {
  status: string | null
  next: { season: number; number: number; airstamp: string } | null
  last_aired: string | null
  tba_season: number | null
}

export type ReturnKind = 'airing' | 'dated' | 'announced' | 'waiting' | 'uncertain' | 'development' | 'ended'

// Quando torna una serie, dagli stati di TVmaze e dagli episodi già noti.
// Running senza date vuol dire che per TVmaze non è stata chiusa: la diamo "in lavorazione".
export function returnState(facts: ReturnFacts, now = Date.now()): { kind: ReturnKind; label: string; detail: string | null } {
  const stopped = facts.last_aired ? `Ferma da ${sinceLabel(facts.last_aired, now)}` : null
  if (facts.status === 'Ended') {
    return { kind: 'ended', label: 'Conclusa', detail: facts.last_aired ? `Ultima puntata ${monthYear(facts.last_aired)}` : null }
  }
  if (facts.next) {
    const recent = facts.last_aired && now - new Date(facts.last_aired).getTime() < 21 * 86_400_000
    if (recent && facts.next.number !== 1) {
      return { kind: 'airing', label: 'In onda', detail: `Prossima puntata ${airLabel(facts.next.airstamp).toLowerCase()}` }
    }
    return {
      kind: 'dated',
      label: `${facts.next.number === 1 ? 'Torna' : 'Riprende'} il ${longDate(facts.next.airstamp)}`,
      detail: [`Stagione ${facts.next.season}`, stopped].filter(Boolean).join(' · '),
    }
  }
  if (facts.tba_season) {
    return { kind: 'announced', label: `Stagione ${facts.tba_season} annunciata`, detail: ['Senza data', stopped].filter(Boolean).join(' · ') }
  }
  if (facts.status === 'To Be Determined') {
    return { kind: 'uncertain', label: 'Futuro incerto', detail: stopped || 'Rinnovo non deciso' }
  }
  if (facts.status === 'In Development') {
    return { kind: 'development', label: 'In sviluppo', detail: 'Non ancora uscita' }
  }
  return { kind: 'waiting', label: 'In lavorazione', detail: stopped || 'Nessuna data annunciata' }
}

export const RETURN_TONE: Record<ReturnKind, string> = {
  airing: 'bg-grow-ok',
  dated: 'bg-grow-time',
  announced: 'bg-grow-time',
  waiting: 'bg-grow-yellow',
  uncertain: 'bg-grow-fix',
  development: 'bg-grow-ring',
  ended: 'bg-grow-done',
}
