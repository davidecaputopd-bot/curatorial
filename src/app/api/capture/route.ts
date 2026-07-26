import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { fetchLinkTitle } from '@/lib/link-preview'
import { classifyInboxItem } from '@/lib/inbox/classify'
import {
  isLegacyCaptureToken,
  readCaptureDeviceToken,
} from '@/lib/capture-auth'
import {
  detectCaptureSource,
  extractSharedUrl,
  normalizeSharedUrl,
  parseCaptureInput,
} from '@/lib/capture-input'

function bearerToken(request: Request) {
  const header = request.headers.get('authorization') || ''
  return header.replace(/^Bearer\s+/i, '').trim()
}

async function getOwnerUserId(supabase: ReturnType<typeof createAdminSupabaseClient>) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1 })
  if (error || !data.users.length) return null
  return data.users[0].id
}

async function uploadImage(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  base64: string,
  mime: string
) {
  const buffer = Buffer.from(base64, 'base64')
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
  const path = `capture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage
    .from('inbox-images')
    .upload(path, buffer, { contentType: mime, upsert: false })

  if (error) return null

  const { data } = supabase.storage.from('inbox-images').getPublicUrl(path)
  return data.publicUrl
}

export async function POST(request: Request) {
  const token = bearerToken(request)
  const tokenUserId = readCaptureDeviceToken(token)
  const legacyAuthorized = isLegacyCaptureToken(token)

  if (!tokenUserId && !legacyAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await parseCaptureInput(request)

  if (!body || (!body.content && !body.url && !body.image_base64)) {
    return NextResponse.json({ error: 'content, url o image_base64 richiesto' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()
  const userId = tokenUserId || (await getOwnerUserId(supabase))
  if (!userId) {
    return NextResponse.json({ error: 'Nessun utente GROW trovato' }, { status: 500 })
  }

  const sharedUrl = body.url || extractSharedUrl(body.content || '')
  const normalizedUrl = sharedUrl ? normalizeSharedUrl(sharedUrl) : null
  if (sharedUrl && !normalizedUrl) {
    return NextResponse.json({ error: 'URL non valido' }, { status: 400 })
  }

  if (normalizedUrl) {
    const { data: existing } = await supabase
      .from('inbox_items')
      .select('*')
      .eq('user_id', userId)
      .eq('url', normalizedUrl)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ item: existing, duplicate: true })
    }
  }

  let imageUrl: string | null = null
  if (body.image_base64) {
    if (body.image_base64.length > 11_000_000) {
      return NextResponse.json(
        { error: 'Immagine troppo grande: massimo 8 MB' },
        { status: 413 }
      )
    }
    imageUrl = await uploadImage(supabase, body.image_base64, body.image_mime || 'image/jpeg')
  }

  let content = body.content || null
  if (
    normalizedUrl &&
    (!content || content === sharedUrl || content === normalizedUrl)
  ) {
    content = (await fetchLinkTitle(normalizedUrl)) || normalizedUrl
  }
  if (!content && imageUrl) content = 'Screenshot'

  const noteType = classifyInboxItem({
    content,
    url: normalizedUrl,
    imageUrl,
  })
  const insert = {
    user_id: userId,
    content,
    url: normalizedUrl,
    image_url: imageUrl,
    client: body.client || null,
    source: detectCaptureSource(normalizedUrl, body.source || 'shortcut'),
  }
  let result = await supabase
    .from('inbox_items')
    .insert({ ...insert, note_type: noteType })
    .select()
    .single()

  if (
    result.error?.code === 'PGRST204' ||
    (result.error?.message || '').toLowerCase().includes('note_type')
  ) {
    result = await supabase.from('inbox_items').insert(insert).select().single()
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }
  return NextResponse.json({
    item: result.data ? { ...result.data, note_type: noteType } : null,
    duplicate: false,
  })
}
