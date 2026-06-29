import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { fetchLinkTitle } from '@/lib/link-preview'

function isAuthorized(request: Request) {
  const header = request.headers.get('authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '')
  const expected = process.env.CAPTURE_TOKEN
  return Boolean(expected) && token === expected
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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    content?: string
    url?: string
    image_base64?: string
    image_mime?: string
    client?: string
  } | null

  if (!body || (!body.content && !body.url && !body.image_base64)) {
    return NextResponse.json({ error: 'content, url o image_base64 richiesto' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()
  const userId = await getOwnerUserId(supabase)
  if (!userId) {
    return NextResponse.json({ error: 'Nessun utente GROW trovato' }, { status: 500 })
  }

  let imageUrl: string | null = null
  if (body.image_base64) {
    imageUrl = await uploadImage(supabase, body.image_base64, body.image_mime || 'image/jpeg')
  }

  let content = body.content || null
  if (body.url && (!content || content === body.url)) {
    content = (await fetchLinkTitle(body.url)) || body.url
  }
  if (!content && imageUrl) content = 'Screenshot'

  const { data, error } = await supabase
    .from('inbox_items')
    .insert({
      user_id: userId,
      content,
      url: body.url || null,
      image_url: imageUrl,
      client: body.client || null,
      source: 'shortcut',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
