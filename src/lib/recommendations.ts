type InteractionRow = {
  content_id: string
  action: string
  read_seconds?: number | null
  created_at?: string | null
}

type SignalItem = {
  id: string
  category?: string | null
  platform?: string | null
  title?: string | null
  summary?: string | null
  artist_name?: string | null
}

export type TasteProfile = {
  categories: Record<string, number>
  platforms: Record<string, number>
  artists: Record<string, number>
  terms: Record<string, number>
  negativeIds: Set<string>
  savedIds: Set<string>
}

const STOP_WORDS = new Set([
  'della', 'delle', 'degli', 'dello', 'dalla', 'dalle', 'with', 'from',
  'that', 'this', 'design', 'image', 'untitled', 'project', 'studio',
])

function terms(value: string) {
  return value
    .toLocaleLowerCase('it-IT')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
    .slice(0, 18)
}

type ReferenceFeatures = {
  category?: string | null
  platform?: string | null
  title?: string | null
  summary?: string | null
  artist_name?: string | null
  dominant_color?: string | null
  tags?: string[] | string | null
}

export function referenceSimilarity(
  reference: ReferenceFeatures,
  candidate: ReferenceFeatures
) {
  let score = 0
  if (reference.category && reference.category === candidate.category) score += 5
  if (reference.artist_name && reference.artist_name === candidate.artist_name) score += 3.5
  if (
    reference.dominant_color &&
    reference.dominant_color === candidate.dominant_color
  ) {
    score += 2
  }
  if (reference.platform && reference.platform === candidate.platform) score += 0.25

  const referenceTerms = new Set(
    terms(
      `${reference.title || ''} ${reference.summary || ''} ${
        Array.isArray(reference.tags) ? reference.tags.join(' ') : reference.tags || ''
      }`
    )
  )
  const candidateTerms = new Set(
    terms(
      `${candidate.title || ''} ${candidate.summary || ''} ${
        Array.isArray(candidate.tags) ? candidate.tags.join(' ') : candidate.tags || ''
      }`
    )
  )
  let overlap = 0
  for (const term of referenceTerms) {
    if (candidateTerms.has(term)) overlap++
  }
  score += Math.min(6, overlap * 1.5)
  return score
}

function actionValue(action: string, seconds = 0) {
  if (action === 'more_like_this') return 6
  if (action === 'save') return 5
  if (action === 'like') return 4
  if (action === 'open') return 2.5
  if (action === 'dwell') return Math.min(3, Math.max(0, seconds - 2) / 5)
  if (action === 'skip') return -2
  if (action === 'less_like_this') return -6
  return 0
}

function add(target: Record<string, number>, key: string | null | undefined, value: number) {
  if (!key) return
  target[key] = (target[key] || 0) + value
}

export function buildTasteProfile(
  interactions: InteractionRow[],
  items: SignalItem[]
): TasteProfile {
  const byId = new Map(items.map((item) => [item.id, item]))
  const profile: TasteProfile = {
    categories: {},
    platforms: {},
    artists: {},
    terms: {},
    negativeIds: new Set(),
    savedIds: new Set(),
  }

  interactions.forEach((interaction, index) => {
    const item = byId.get(interaction.content_id)
    if (!item) return
    const recency = Math.max(0.25, 1 - index / Math.max(220, interactions.length))
    const value = actionValue(
      interaction.action,
      Number(interaction.read_seconds || 0)
    ) * recency
    if (!value) return

    if (interaction.action === 'less_like_this' || interaction.action === 'skip') {
      profile.negativeIds.add(interaction.content_id)
    }
    if (interaction.action === 'save') profile.savedIds.add(interaction.content_id)

    add(profile.categories, item.category, value)
    add(profile.platforms, item.platform, value * 0.55)
    add(profile.artists, item.artist_name, value * 0.7)
    for (const term of terms(`${item.title || ''} ${item.summary || ''}`)) {
      add(profile.terms, term, value * 0.22)
    }
  })

  return profile
}

export function tasteBoost(item: SignalItem, taste: TasteProfile) {
  if (taste.negativeIds.has(item.id)) return -8

  let boost = 0
  boost += Math.max(-1.2, Math.min(1.2, (taste.categories[item.category || ''] || 0) / 18))
  boost += Math.max(-0.5, Math.min(0.5, (taste.platforms[item.platform || ''] || 0) / 22))
  boost += Math.max(-0.7, Math.min(0.7, (taste.artists[item.artist_name || ''] || 0) / 14))

  const itemTerms = new Set(terms(`${item.title || ''} ${item.summary || ''}`))
  let termScore = 0
  for (const term of itemTerms) termScore += taste.terms[term] || 0
  boost += Math.max(-0.8, Math.min(0.8, termScore / 16))

  // Un contenuto già salvato resta recuperabile in Archivio e lascia spazio a novità.
  if (taste.savedIds.has(item.id)) boost -= 1.5
  return boost
}

export function deterministicJitter(id: string, seed: number) {
  let hash = seed >>> 0
  for (let index = 0; index < id.length; index++) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 2654435761) >>> 0
  }
  return (hash % 1000) / 1000
}
