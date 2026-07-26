import {
  analyzeContentSignal,
  CRAFT_TAG_LABELS,
  type CraftTag,
} from '@/lib/brain/content-intelligence'
import type { PersonalBrainItem } from '@/lib/brain/retrieval'

export const BRAIN_FEEDBACK_SIGNALS = [
  'useful_now',
  'nourishment',
  'personal',
  'keep',
  'not_now',
  'not_for_me',
  'used',
] as const

export type BrainFeedbackSignal = (typeof BRAIN_FEEDBACK_SIGNALS)[number]
export type BrainCardKind = 'dont_miss' | 'resume' | 'possibility'
export type BrainCardSource = 'calendar' | 'inbox' | 'archive' | 'discovery'

export type DailyBrainCard = {
  id: string
  kind: BrainCardKind
  eyebrow: string
  title: string
  summary: string
  reason: string
  evidence: string[]
  confidence: number
  action_label: string
  href: string
  project: string | null
  source_type: BrainCardSource
  source_id: string
  content_id?: string | null
  image_url?: string | null
  outside_bubble?: boolean
}

export type DailyBrainBrief = {
  generated_at: string
  cards: DailyBrainCard[]
  counts: {
    inbox_total: number
    archive_total: number
    understood_sample: number
    active_calendar: number
  }
}

export type CalendarSignal = {
  id: string
  client: string
  title: string
  status: string
  scheduled_date?: string | null
  notes?: string | null
}

export type DiscoverySignal = {
  id: string
  title?: string | null
  summary?: string | null
  category?: string | null
  tags?: string[] | string | null
  artist_name?: string | null
  platform?: string | null
  url?: string | null
  image_url?: string | null
  published_at?: string | null
  created_at?: string | null
  quality_score?: number
}

type BuildDailyBrainInput = {
  calendar: CalendarSignal[]
  personalItems: PersonalBrainItem[]
  discovery: DiscoverySignal[]
  inboxTotal: number
  archiveTotal: number
  suppressed: Set<string>
  negativeContentIds: Set<string>
  now?: Date
}

const PROJECT_CRAFT: Record<string, CraftTag[]> = {
  anventitre: [
    'packaging',
    'photography',
    'lighting',
    'art_direction',
    'social_format',
  ],
  an23: [
    'packaging',
    'photography',
    'lighting',
    'art_direction',
    'social_format',
  ],
  'cantina don carlo': [
    'packaging',
    'photography',
    'food_styling',
    'art_direction',
    'typography',
  ],
  exousia: [
    'brand_identity',
    'typography',
    'composition',
    'social_format',
  ],
  'aci copertino': [
    'brand_identity',
    'photography',
    'social_format',
    'composition',
  ],
  trama: [
    'fashion',
    'art_direction',
    'interiors',
    'photography',
    'brand_identity',
  ],
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function dayNumber(date: Date) {
  return Math.floor(date.getTime() / 86_400_000)
}

function truncate(value: string | null | undefined, length: number) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= length) return clean
  return `${clean.slice(0, Math.max(1, length - 1)).trim()}…`
}

function ageLabel(value?: string | null) {
  if (!value) return 'in passato'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'in passato'
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000))
  if (days === 0) return 'oggi'
  if (days === 1) return 'ieri'
  if (days < 7) return `${days} giorni fa`
  if (days < 35) return `${Math.max(1, Math.floor(days / 7))} settimane fa`
  return `${Math.max(1, Math.floor(days / 30))} mesi fa`
}

function internalAiHref(project: string | null, brief: string) {
  const params = new URLSearchParams()
  if (project) params.set('project', project)
  params.set('brief', brief)
  return `/ai?${params.toString()}`
}

function calendarCard(
  calendar: CalendarSignal[],
  today: string
): DailyBrainCard | null {
  const open = calendar
    .filter((item) => item.status !== 'pubblicato')
    .sort((a, b) =>
      String(a.scheduled_date || '9999').localeCompare(
        String(b.scheduled_date || '9999')
      )
    )
  const overdue = open.find(
    (item) => item.scheduled_date && item.scheduled_date < today
  )
  const todayItem = open.find((item) => item.scheduled_date === today)
  const moving = open.find(
    (item) => item.status === 'in_produzione' || item.status === 'pronto'
  )
  const selected = overdue || todayItem || moving || open[0]
  if (!selected) return null

  const timing = overdue
    ? `La data prevista era ${selected.scheduled_date}.`
    : todayItem
      ? 'È previsto per oggi.'
      : selected.status === 'pronto'
        ? 'È pronto ma non ancora chiuso.'
        : selected.status === 'in_produzione'
          ? 'È già in produzione: conviene finirlo prima di aprire altro.'
          : 'È il primo lavoro aperto nel Piano.'

  return {
    id: `calendar:${selected.id}`,
    kind: 'dont_miss',
    eyebrow: overdue ? 'Non perdere · In ritardo' : 'Non perdere',
    title: truncate(`${selected.title} · ${selected.client}`, 92),
    summary: timing,
    reason: 'Arriva dal tuo Piano, non da una previsione dell’AI.',
    evidence: [
      `Stato: ${selected.status.replaceAll('_', ' ')}`,
      selected.scheduled_date ? `Data: ${selected.scheduled_date}` : 'Senza data',
    ],
    confidence: 1,
    action_label: 'Apri il Piano',
    href: '/calendario',
    project: selected.client,
    source_type: 'calendar',
    source_id: selected.id,
  }
}

function personalCard(
  personalItems: PersonalBrainItem[],
  activeProject: string | null,
  suppressed: Set<string>
): DailyBrainCard | null {
  const ranked = personalItems
    .map((item) => {
      const intelligence = analyzeContentSignal(item)
      const sourceKey = `${item.origin}:${String(item.id).replace(/^(inbox|archive):/, '')}`
      const roleScore =
        intelligence.role === 'work_direct'
          ? 4
          : intelligence.role === 'creative_nourishment'
            ? 2.5
            : intelligence.role === 'personal'
              ? -4
              : -1
      const timestamp = Date.parse(item.saved_at || item.created_at || '')
      const recency = Number.isFinite(timestamp)
        ? Math.max(0, 1.8 - (Date.now() - timestamp) / 86_400_000 / 60)
        : 0
      return {
        item,
        intelligence,
        sourceKey,
        score:
          roleScore +
          intelligence.confidence * 2 +
          intelligence.craft_tags.length * 0.35 +
          recency,
      }
    })
    .filter(
      (candidate) =>
        candidate.intelligence.understood &&
        !suppressed.has(candidate.sourceKey)
    )
    .sort((a, b) => b.score - a.score)

  const selected = ranked[0]
  if (!selected) return null

  const item = selected.item
  const intelligence = selected.intelligence
  const title = truncate(
    String(item.title || item.content || item.description || 'Reference salvata'),
    92
  )
  const craft = intelligence.craft_tags
    .slice(0, 3)
    .map((tag) => CRAFT_TAG_LABELS[tag])
  const sourceId = String(item.id).replace(/^(inbox|archive):/, '')
  const savedWhen = ageLabel(item.saved_at || item.created_at)
  const projectInstruction = activeProject
    ? `Valuta se può essere utile a ${activeProject}, senza forzare il collegamento.`
    : 'Dimmi in quale tipo di lavoro potrebbe essere utile, senza assegnarla automaticamente a un cliente.'

  return {
    id: `${item.origin}:${sourceId}`,
    kind: 'resume',
    eyebrow: 'Riprendi',
    title,
    summary: craft.length
      ? `Può servirti per ${craft.join(' · ').toLocaleLowerCase('it-IT')}.`
      : 'È uno dei materiali più comprensibili nella tua Raccolta.',
    reason: `L’hai salvato ${savedWhen}; GROW riconosce ${craft.slice(0, 2).join(' e ').toLocaleLowerCase('it-IT') || 'un possibile uso creativo'}.`,
    evidence: [
      intelligence.role_label,
      `${Math.round(intelligence.confidence * 100)}% confidenza`,
    ],
    confidence: intelligence.confidence,
    action_label: 'Usa con AI',
    href: internalAiHref(
      activeProject,
      `Lavora su questa reference concreta: ${title}. ${item.url || ''} ${projectInstruction}`
    ),
    project: intelligence.explicit_project || null,
    source_type: item.origin,
    source_id: sourceId,
    content_id:
      item.origin === 'archive' ? String(item.content_id || sourceId) : null,
    image_url: item.image_url,
  }
}

function possibilityCard(
  discovery: DiscoverySignal[],
  personalItems: PersonalBrainItem[],
  activeProject: string | null,
  suppressed: Set<string>,
  negativeContentIds: Set<string>,
  outsideBubble: boolean
): DailyBrainCard | null {
  const preferredCraft = new Set(
    personalItems
      .slice(0, 80)
      .flatMap((item) => analyzeContentSignal(item).craft_tags)
  )
  const projectCraft = new Set(
    PROJECT_CRAFT[(activeProject || '').toLocaleLowerCase('it-IT')] || []
  )

  const ranked = discovery
    .map((item) => {
      const intelligence = analyzeContentSignal({
        title: item.title,
        description: item.summary,
        tags: item.tags,
        category: item.category,
        artist: item.artist_name,
        source: item.platform,
        url: item.url,
      })
      const familiar = intelligence.craft_tags.filter((tag) =>
        preferredCraft.has(tag)
      ).length
      const projectFit = intelligence.craft_tags.filter((tag) =>
        projectCraft.has(tag)
      ).length
      const sourceScore = item.platform === 'arena' ? 2 : -1
      const explorationScore = outsideBubble ? -familiar * 0.7 : familiar * 0.45
      return {
        item,
        intelligence,
        score:
          Number(item.quality_score || 0) +
          sourceScore +
          projectFit * 0.8 +
          explorationScore +
          intelligence.confidence,
      }
    })
    .filter(
      ({ item, intelligence }) =>
        intelligence.understood &&
        !negativeContentIds.has(item.id) &&
        !suppressed.has(`discovery:${item.id}`)
    )
    .sort((a, b) => b.score - a.score)

  const selected = ranked[0]
  if (!selected) return null

  const item = selected.item
  const intelligence = selected.intelligence
  const title = truncate(item.title || 'Nuova reference visiva', 92)
  const craft = intelligence.craft_tags
    .slice(0, 3)
    .map((tag) => CRAFT_TAG_LABELS[tag])
  const projectText = activeProject
    ? `Potrebbe aprire una direzione per ${activeProject}, ma devi confermarla tu.`
    : 'È una deviazione visiva da valutare, non un lavoro già deciso.'

  return {
    id: `discovery:${item.id}`,
    kind: 'possibility',
    eyebrow: outsideBubble ? 'Possibilità · Fuori bolla' : 'Possibilità',
    title,
    summary: projectText,
    reason: outsideBubble
      ? `È il 20% esplorativo: fonte curatoriale e caratteristiche meno presenti nei tuoi salvataggi.`
      : `Combacia con ${craft.slice(0, 2).join(' e ').toLocaleLowerCase('it-IT') || 'il tuo gusto visivo'} senza essere già salvata.`,
    evidence: [
      item.artist_name || 'Fonte curatoriale',
      craft.slice(0, 2).join(' · ') || intelligence.role_label,
    ],
    confidence: intelligence.confidence,
    action_label: 'Sviluppa',
    href: internalAiHref(
      activeProject,
      `Analizza questa reference visiva e proponi un solo uso concreto: ${title}. ${item.url || ''}`
    ),
    project: activeProject,
    source_type: 'discovery',
    source_id: item.id,
    content_id: item.id,
    image_url: item.image_url,
    outside_bubble: outsideBubble,
  }
}

export function buildDailyBrainBrief({
  calendar,
  personalItems,
  discovery,
  inboxTotal,
  archiveTotal,
  suppressed,
  negativeContentIds,
  now = new Date(),
}: BuildDailyBrainInput): DailyBrainBrief {
  const today = dateKey(now)
  const active = calendar.filter((item) => item.status !== 'pubblicato')
  const activeProject =
    active.find(
      (item) =>
        item.scheduled_date &&
        item.scheduled_date <= today &&
        item.client
    )?.client ||
    active.find(
      (item) =>
        (item.status === 'in_produzione' || item.status === 'pronto') &&
        item.client
    )?.client ||
    null
  const outsideBubble = dayNumber(now) % 5 === 4

  const cards = [
    calendarCard(calendar, today),
    personalCard(personalItems, activeProject, suppressed),
    possibilityCard(
      discovery,
      personalItems,
      activeProject,
      suppressed,
      negativeContentIds,
      outsideBubble
    ),
  ].filter((card): card is DailyBrainCard => Boolean(card))

  return {
    generated_at: now.toISOString(),
    cards,
    counts: {
      inbox_total: inboxTotal,
      archive_total: archiveTotal,
      understood_sample: personalItems.filter(
        (item) => analyzeContentSignal(item).understood
      ).length,
      active_calendar: active.length,
    },
  }
}
