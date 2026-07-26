import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import {
  detectCaptureSource,
  normalizeSharedUrl,
} from '@/lib/capture-input'
import { classifyInboxItem } from '@/lib/inbox/classify'

type ImportCandidate = {
  url?: string
  content?: string
  source?: string
}

function missingNoteTypeColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false
  return (
    error.code === 'PGRST204' ||
    (error.message || '').toLowerCase().includes('note_type')
  )
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    items?: ImportCandidate[]
  } | null
  const candidates = Array.isArray(body?.items) ? body.items.slice(0, 1000) : []

  const unique = new Map<string, ImportCandidate>()
  for (const candidate of candidates) {
    if (!candidate?.url) continue
    const url = normalizeSharedUrl(candidate.url)
    if (!url || unique.has(url)) continue
    unique.set(url, { ...candidate, url })
  }

  const urls = [...unique.keys()]
  if (!urls.length) {
    return NextResponse.json(
      { error: 'Nessun link Instagram o TikTok trovato' },
      { status: 400 }
    )
  }

  const existingUrls = new Set<string>()
  for (let index = 0; index < urls.length; index += 150) {
    const { data, error } = await supabase
      .from('inbox_items')
      .select('url')
      .eq('user_id', user.id)
      .in('url', urls.slice(index, index + 150))

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    for (const row of data || []) {
      if (row.url) existingUrls.add(row.url)
    }
  }

  const inserts = urls
    .filter((url) => !existingUrls.has(url))
    .map((url) => {
      const candidate = unique.get(url)!
      const source = detectCaptureSource(url, candidate.source)
      const content =
        candidate.content?.trim() ||
        (source === 'instagram'
          ? 'Salvato da Instagram'
          : source === 'tiktok'
            ? 'Salvato da TikTok'
            : 'Contenuto salvato')

      return {
        user_id: user.id,
        content,
        url,
        image_url: null,
        client: null,
        source,
        note_type: classifyInboxItem({ content, url }),
      }
    })

  if (!inserts.length) {
    return NextResponse.json({
      imported: 0,
      duplicates: urls.length,
      total: urls.length,
    })
  }

  let result = await supabase.from('inbox_items').insert(inserts).select('id')
  if (missingNoteTypeColumn(result.error)) {
    result = await supabase
      .from('inbox_items')
      .insert(
        inserts.map((item) => ({
          user_id: item.user_id,
          content: item.content,
          url: item.url,
          image_url: item.image_url,
          client: item.client,
          source: item.source,
        }))
      )
      .select('id')
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({
    imported: result.data?.length || 0,
    duplicates: existingUrls.size,
    total: urls.length,
  })
}
