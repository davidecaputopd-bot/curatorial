// Le cinque scelte di colore. I valori CSS stanno in globals.css ([data-accent]),
// qui ci sono solo etichetta e campione per la schermata di ingresso.
export const ACCENTS = [
  { id: 'ghiaccio', label: 'Ghiaccio', swatch: '#5BD6E6' },
  { id: 'lime', label: 'Lime', swatch: '#B8E62E' },
  { id: 'arancio', label: 'Arancio', swatch: '#FF7A33' },
  { id: 'fucsia', label: 'Fucsia', swatch: '#FF5D9E' },
  { id: 'lavanda', label: 'Lavanda', swatch: '#B79DFF' },
] as const

export type AccentId = (typeof ACCENTS)[number]['id']

export const DEFAULT_ACCENT: AccentId = 'ghiaccio'

export function isAccent(value: unknown): value is AccentId {
  return ACCENTS.some((accent) => accent.id === value)
}

// "Marco" -> "Marco's Time". Il nome dell'app è di chi la usa.
export function appName(displayName?: string | null) {
  const first = (displayName || '').trim().split(/\s+/)[0]
  return first ? `${first}'s Time` : 'Time'
}
