import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import {
  buildDailyBrainBrief,
  type CalendarSignal,
  type DiscoverySignal,
} from '@/lib/brain/daily-brief'
import type { PersonalBrainItem } from '@/lib/brain/retrieval'
import { discoveryQualityScore } from '@/lib/discovery-quality'

type InteractionRow = {
  content_id: string
  action: string
  created_at?: string | null
}

type BrainFeedbackRow = {
  content: string
  created_at?: string | null
}

const NOT_NOW_COOLDOWN_MS = 7 * 86_400_000

function feedbackIdentity(row: BrainFeedbackRow) {
  const sourceType = row.content.match(/\bsource_type=([^\s]+)/)?.[1]
  const sourceId = row.content.match(/\bsource_id=([^\s]+)/)?.[1]
  return sourceType && sourceId ? `${sourceType}:${sourceId}` : null
}

function feedbackKey(row: BrainFeedbackRow) {
  const sourceType = row.content.match(/\bsource_type=([^\s]+)/)?.[1]
  const sourceId = row.content.match(/\bsource_id=([^\s]+)/)?.[1]
  const signal = row.content.match(/\bsignal=([^\s]+)/)?.[1]
  if (!sourceType || !sourceId || !signal) return null
  const permanent = ['personal', 'not_for_me', 'used'].includes(signal)
  const createdAt = Date.parse(row.created_at || '')
  const coolingDown =
    signal === 'not_now' &&
    Number.isFinite(createdAt) &&
    Date.now() - createdAt < NOT_NOW_COOLDOWN_MS
  if (!permanent && !coolingDown) return null
  return `${sourceType}:${sourceId}`
}

function positiveFeedback(row: BrainFeedbackRow) {
  const sourceType = row.content.match(/\bsource_type=([^\s]+)/)?.[1]
  const sourceId = row.content.match(/\bsource_id=([^\s]+)/)?.[1]
  const signal = row.content.match(/\bsignal=([^\s]+)/)?.[1]
  if (!sourceType || !sourceId || !signal) return null
  const weight =
    signal === 'useful_now'
      ? 5
      : signal === 'nourishment'
        ? 2.5
        : signal === 'keep'
          ? 1.5
          : 0
  return weight ? { key: `${sourceType}:${sourceId}`, weight } : null
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [
    calendarResult,
    inboxResult,
    interactionsResult,
    discoveryResult,
    feedbackResult,
  ] = await Promise.all([
    supabase
      .from('calendar_items')
      .select('id, title, client, status, scheduled_date, notes')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true, nullsFirst: false })
      .limit(120),
    supabase
      .from('inbox_items')
      .select(
        'id, content, url, image_url, og_title, og_description, source, note_type, created_at',
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .neq('source', 'chat')
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('interactions')
      .select('content_id, action, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(700),
    supabase
      .from('content_items')
      .select(
        'id, title, summary, category, tags, artist_name, platform, url, image_url, published_at, created_at'
      )
      .eq('type', 'image')
      .eq('platform', 'arena')
      .not('image_url', 'is', null)
      .order('published_at', { ascending: false })
      .limit(180),
    supabase
      .from('memories')
      .select('content, created_at')
      .eq('user_id', user.id)
      .like('content', '[GROW_BRAIN_FEEDBACK]%')
      .order('created_at', { ascending: false })
      .limit(160),
  ])

  const warnings = [
    calendarResult.error?.message,
    inboxResult.error?.message,
    interactionsResult.error?.message,
    discoveryResult.error?.message,
    feedbackResult.error?.message,
  ].filter((warning): warning is string => Boolean(warning))

  const interactions = (interactionsResult.data || []) as InteractionRow[]
  const savedAt = new Map<string, string>()
  const negativeContentIds = new Set<string>()
  for (const interaction of interactions) {
    if (
      interaction.action === 'save' &&
      interaction.content_id &&
      !savedAt.has(interaction.content_id)
    ) {
      savedAt.set(interaction.content_id, interaction.created_at || '')
    }
    if (
      interaction.action === 'less_like_this' ||
      interaction.action === 'skip'
    ) {
      negativeContentIds.add(interaction.content_id)
    }
  }

  const savedIds = [...savedAt.keys()]
  const archiveResult = savedIds.length
    ? await supabase
        .from('content_items')
        .select(
          'id, title, summary, category, tags, artist_name, platform, url, image_url, dominant_color'
        )
        .in('id', savedIds)
    : { data: [], error: null }

  if (archiveResult.error) warnings.push(archiveResult.error.message)

  const inboxItems: PersonalBrainItem[] = (inboxResult.data || []).map(
    (item) => ({
      id: `inbox:${item.id}`,
      origin: 'inbox',
      content: item.content,
      title: item.og_title || item.content,
      description: item.og_description,
      source: item.source,
      url: item.url,
      image_url: item.image_url,
      created_at: item.created_at,
      note_type: item.note_type,
    })
  )
  const archiveItems: PersonalBrainItem[] = (archiveResult.data || []).map(
    (item) => ({
      id: `archive:${item.id}`,
      content_id: item.id,
      origin: 'archive',
      title: item.title,
      description: item.summary,
      category: item.category,
      tags: item.tags,
      artist: item.artist_name,
      source: item.platform,
      url: item.url,
      image_url: item.image_url,
      dominant_color: item.dominant_color,
      saved_at: savedAt.get(item.id),
    })
  )

  const latestFeedback: BrainFeedbackRow[] = []
  const seenFeedback = new Set<string>()
  for (const row of (feedbackResult.data || []) as BrainFeedbackRow[]) {
    const key = feedbackIdentity(row)
    if (!key || seenFeedback.has(key)) continue
    seenFeedback.add(key)
    latestFeedback.push(row)
  }
  const suppressed = new Set(
    latestFeedback
      .map(feedbackKey)
      .filter((key): key is string => Boolean(key))
  )
  const feedbackWeights = new Map<string, number>()
  for (const row of latestFeedback) {
    const feedback = positiveFeedback(row)
    if (!feedback || feedbackWeights.has(feedback.key)) continue
    feedbackWeights.set(feedback.key, feedback.weight)
  }
  const discovery: DiscoverySignal[] = (discoveryResult.data || []).map(
    (item) => ({
      ...item,
      quality_score: discoveryQualityScore(item),
    })
  )
  const brief = buildDailyBrainBrief({
    calendar: (calendarResult.data || []) as CalendarSignal[],
    personalItems: [...inboxItems, ...archiveItems],
    discovery,
    inboxTotal: inboxResult.count || inboxItems.length,
    archiveTotal: savedIds.length,
    suppressed,
    feedbackWeights,
    negativeContentIds,
  })

  return NextResponse.json({
    ok: true,
    brief,
    source: 'grounded',
    warnings: warnings.length ? warnings : undefined,
  })
}
