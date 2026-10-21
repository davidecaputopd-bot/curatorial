'use client'

// Elementi ricorrenti della sezione Serie, nello stile di TV Time:
// poster verticali, codice episodio "S01 | E02", check rotondo, barra di avanzamento.

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
}

export const episodeCode = (season: number, number: number) =>
  `S${String(season).padStart(2, '0')} | E${String(number).padStart(2, '0')}`

export function Poster({ src, title, className = '' }: { src: string | null; title: string; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={title} loading="lazy" className={`object-cover ${className}`} />
  ) : (
    <div className={`flex items-center justify-center bg-grow-black p-2 text-center ${className}`}>
      <span className="text-lg leading-none text-grow-yellow font-[family-name:var(--font-tv-display)] font-normal uppercase tracking-[0.01em]">{title}</span>
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
  done: 'bg-[#7C3AED]',
  uptodate: 'bg-[#22C55E]',
  progress: 'bg-grow-yellow',
  new: 'bg-black/15',
  unknown: 'bg-black/15',
}

export function ProgressBar({ show, className = '' }: { show: TvShow; className?: string }) {
  const state = progressState(show)
  return (
    <div className={`h-1.5 w-full bg-black/10 ${className}`}>
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
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 active:scale-90 motion-reduce:active:scale-100',
        checked
          ? 'border-grow-yellow bg-grow-yellow text-grow-black'
          : 'border-grow-black/40 text-grow-black/55 hover:border-grow-black hover:text-grow-black',
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
