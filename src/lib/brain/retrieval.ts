import {
  analyzeContentSignal,
  contentSignalText,
  type ContentIntelligence,
  type ContentSignalInput,
} from '@/lib/brain/content-intelligence'

export type PersonalBrainOrigin = 'inbox' | 'archive'

export type PersonalBrainItem = ContentSignalInput & {
  id: string
  origin: PersonalBrainOrigin
  created_at?: string | null
  image_url?: string | null
  saved_at?: string | null
  intelligence?: ContentIntelligence
  [key: string]: unknown
}

export type RankedPersonalBrainItem = PersonalBrainItem & {
  intelligence: ContentIntelligence
  relevance_score: number
}

const STOP_WORDS = new Set([
  'alla',
  'alle',
  'anche',
  'come',
  'dalla',
  'delle',
  'dello',
  'dove',
  'from',
  'into',
  'nella',
  'nelle',
  'perche',
  'questa',
  'questo',
  'that',
  'this',
  'with',
])

const QUERY_EXPANSIONS: Record<string, string[]> = {
  bottiglia: ['bottle', 'packaging', 'etichetta', 'label', 'wine'],
  carosello: ['carousel', 'social', 'layout', 'editorial'],
  colore: ['color', 'colour', 'palette', 'gradient', 'cromia'],
  etichetta: ['label', 'packaging', 'bottle', 'wine'],
  foto: ['photo', 'photography', 'shot', 'camera', 'fotografia'],
  luce: ['light', 'lighting', 'flash', 'illuminazione'],
  montaggio: ['editing', 'edit', 'davinci', 'premiere', 'transition'],
  poster: ['typography', 'layout', 'graphic', 'print'],
  reel: ['video', 'editing', 'camera', 'social', 'tiktok'],
  tipografia: ['typography', 'typeface', 'font', 'lettering'],
}

function words(value: string) {
  return value
    .toLocaleLowerCase('it-IT')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
}

function queryWords(value: string) {
  const base = words(value)
  return new Set([
    ...base,
    ...base.flatMap((word) => QUERY_EXPANSIONS[word] || []),
  ])
}

function daysSince(value?: string | null) {
  if (!value) return 365
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 365
  return Math.max(0, (Date.now() - timestamp) / 86_400_000)
}

function scoreItem(item: PersonalBrainItem, query: string) {
  const intelligence =
    item.intelligence ||
    analyzeContentSignal({
      content: item.content,
      title: item.title,
      description: item.description,
      tags: item.tags,
      category: item.category,
      artist: item.artist,
      source: item.source,
      url: item.url,
    })
  const wanted = queryWords(query)
  const titleText = String(item.title || item.content || '')
  const titleWords = new Set(words(titleText))
  const allText = contentSignalText(item)
  const allWords = new Set(words(allText))
  const normalizedQuery = query.toLocaleLowerCase('it-IT').trim()
  let score = 0

  if (normalizedQuery && allText.includes(normalizedQuery)) score += 9
  for (const word of wanted) {
    if (titleWords.has(word)) score += 4
    if (allWords.has(word)) score += 1.8
    if (
      intelligence.craft_tags.some((tag) =>
        tag.replaceAll('_', ' ').includes(word)
      )
    ) {
      score += 2.4
    }
  }

  if (!wanted.size) {
    score += Math.max(0, 2.4 - daysSince(item.saved_at || item.created_at) / 45)
  }
  if (intelligence.role === 'work_direct') score += 0.7
  if (intelligence.role === 'creative_nourishment') score += 0.35
  if (intelligence.understood) score += 0.45
  score += intelligence.confidence * 0.4

  return { intelligence, score }
}

export function rankPersonalBrainItems(
  items: PersonalBrainItem[],
  query: string,
  limit = 20
): RankedPersonalBrainItem[] {
  return items
    .map((item) => {
      const { intelligence, score } = scoreItem(item, query)
      return {
        ...item,
        intelligence,
        relevance_score: Number(score.toFixed(2)),
      }
    })
    .filter((item) => !query.trim() || item.relevance_score > 0.5)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit)
}
