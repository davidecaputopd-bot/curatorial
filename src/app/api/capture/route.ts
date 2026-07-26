import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { fetchLinkTitle } from '@/lib/link-preview'
import { classifyInboxItem } from '@/lib/inbox/classify'
import { readCaptureDeviceToken } from '@/lib/capture-auth'
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

async function uploadImage(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  base64: string,
  mime: string
) {
  const buffer = Buffer.from(base64, 'base64')
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
  const path = `${userId}/capture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage
    .from('inbox-images')
    .upload(path, buffer, { contentType: mime, upsert: false })

  if (error) return null

  return path
}

export async function POST(request: Request) {
  const token = bearerToken(request)
  const tokenUserId = readCaptureDeviceToken(token)

  if (!tokenUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await parseCaptureInput(request)

  if (!body || (!body.content && !body.url && !body.image_base64)) {
    return NextResponse.json({ error: 'content, url o image_base64 richiesto' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()
  const userId = tokenUserId

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
    const supportedMime = ['image/jpeg', 'image/png', 'image/webp']
    const mime = body.image_mime || 'image/jpeg'
    if (
      !supportedMime.includes(mime) ||
      body.image_base64.length > 11_000_000 ||
      Buffer.byteLength(body.image_base64, 'base64') > 8_000_000
    ) {
      return NextResponse.json(
        { error: 'Immagine non valida o troppo grande: massimo 8 MB' },
        { status: 413 }
      )
    }
    imageUrl = await uploadImage(supabase, userId, body.image_base64, mime)
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
