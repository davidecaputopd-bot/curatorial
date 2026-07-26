import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { fetchLinkPreview } from '@/lib/link-preview'
import { classifyInboxItem } from '@/lib/inbox/classify'
import {
  analyzeContentSignal,
  CONTENT_ROLES,
  type ContentRole,
} from '@/lib/brain/content-intelligence'
import {
  inboxImageStoragePath,
  signedInboxImageUrl,
} from '@/lib/inbox/images'

function missingNoteTypeColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false
  return (
    error.code === 'PGRST204' ||
    (error.message || '').toLowerCase().includes('note_type')
  )
}

const CONTENT_ROLE_SET = new Set<string>(CONTENT_ROLES)

export async function GET(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')
  const lane = searchParams.get('lane')
  const requestedRole = searchParams.get('role')
  const role =
    requestedRole && CONTENT_ROLE_SET.has(requestedRole)
      ? (requestedRole as ContentRole)
      : null
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get('limit')) || 100)
  )
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0)

  if (lane === 'social' && role) {
    const { data, error, count } = await supabase
      .from('inbox_items')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .in('source', ['instagram', 'tiktok'])
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const classified = (data || [])
      .map((item) => ({
        item,
        intelligence: analyzeContentSignal({
          content: item.content,
          title: item.og_title,
          description: item.og_description,
          source: item.source,
          url: item.url,
        }),
      }))
      .filter((entry) => entry.intelligence.role === role)
    const page = classified.slice(offset, offset + limit)
    const items = await Promise.all(
      page.map(async ({ item, intelligence }) => ({
        ...item,
        image_url: await signedInboxImageUrl(supabase, item.image_url),
        note_type:
          item.note_type ||
          classifyInboxItem({
            content: item.content,
            url: item.url,
            imageUrl: item.image_url,
          }),
        intelligence,
      }))
    )

    return NextResponse.json({
      items,
      total: classified.length,
      all_total: count ?? data?.length ?? 0,
      has_more: offset + items.length < classified.length,
      classification_sampled: (count || 0) > (data?.length || 0),
    })
  }

  let query = supabase
    .from('inbox_items')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (source) {
    query = query.eq('source', source)
  } else if (lane === 'social') {
    query = query.in('source', ['instagram', 'tiktok'])
  } else if (lane === 'notes') {
    query = query.not('source', 'in', '("instagram","tiktok","chat")')
  } else {
    query = query.neq('source', 'chat')
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const items = await Promise.all(
    (data || []).map(async (item) => {
      const noteType =
        item.note_type ||
        classifyInboxItem({
          content: item.content,
          url: item.url,
          imageUrl: item.image_url,
        })
      return {
        ...item,
        image_url: await signedInboxImageUrl(supabase, item.image_url),
        note_type: noteType,
        intelligence: analyzeContentSignal({
          content: item.content,
          title: item.og_title,
          description: item.og_description,
          source: item.source,
          url: item.url,
        }),
      }
    })
  )

  return NextResponse.json({
    items,
    total: count || 0,
    all_total: count || 0,
    has_more: offset + items.length < (count || 0),
  })
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })

  if (!body.content && !body.url && !body.image_url)
    return NextResponse.json({ error: 'content, url o image_url richiesto' }, { status: 400 })

  const contentInput =
    typeof body.content === 'string' ? body.content.trim().slice(0, 20_000) : ''
  const urlInput =
    typeof body.url === 'string' ? body.url.trim().slice(0, 4_000) : ''
  const imagePath =
    typeof body.image_url === 'string'
      ? inboxImageStoragePath(body.image_url.trim())
      : null

  if (body.image_url && !imagePath)
    return NextResponse.json({ error: 'Immagine non valida' }, { status: 400 })

  if (imagePath?.includes('/') && !imagePath.startsWith(`${user.id}/`))
    return NextResponse.json({ error: 'Immagine non autorizzata' }, { status: 403 })

  // detect URL in content (for chat messages that are pure links)
  const detectedUrl: string | null =
    urlInput ||
    (contentInput ? (contentInput.match(/https?:\/\/[^\s<>"']+/)?.[0] ?? null) : null)

  let content = contentInput
  let ogTitle: string | null = null
  let ogDescription: string | null = null
  let ogImage: string | null = null

  if (detectedUrl) {
    const og = await fetchLinkPreview(detectedUrl)
    if (og) {
      ogTitle = og.title
      ogDescription = og.description
      ogImage = og.image
      // if content is just the raw URL with no title, use OG title
      if (!content || content === detectedUrl) {
        content = og.title || detectedUrl
      }
    }
  }

  if (!content && imagePath) content = 'Screenshot'

  const noteType = classifyInboxItem({
    content,
    url: detectedUrl,
    imageUrl: imagePath,
  })
  const insert = {
    user_id: user.id,
    content,
    url: detectedUrl,
    image_url: imagePath,
    client: typeof body.client === 'string' ? body.client.slice(0, 100) : null,
    source: typeof body.source === 'string' ? body.source.slice(0, 40) : 'manual',
    og_title: ogTitle,
    og_description: ogDescription,
    og_image: ogImage,
  }

  let result = await supabase
    .from('inbox_items')
    .insert({ ...insert, note_type: noteType })
    .select()
    .single()

  if (missingNoteTypeColumn(result.error)) {
    result = await supabase.from('inbox_items').insert(insert).select().single()
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }
  return NextResponse.json({
    item: result.data
      ? {
          ...result.data,
          image_url: await signedInboxImageUrl(supabase, result.data.image_url),
          note_type: noteType,
          intelligence: analyzeContentSignal({
            content: result.data.content,
            title: result.data.og_title,
            description: result.data.og_description,
            source: result.data.source,
            url: result.data.url,
          }),
        }
      : null,
  })
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json().catch(() => ({ id: null }))
  if (typeof id !== 'string')
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  const { error } = await supabase
    .from('inbox_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
