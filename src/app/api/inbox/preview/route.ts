import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { fetchLinkPreview } from '@/lib/link-preview'
import { fetchTikTokPreview } from '@/lib/tiktok'

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string
  } | null
  if (!body?.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  }

  const { data: item, error } = await supabase
    .from('inbox_items')
    .select('id, url, content, og_title, og_description, og_image')
    .eq('id', body.id)
    .eq('user_id', user.id)
    .single()

  if (error || !item?.url) {
    return NextResponse.json({ error: 'Elemento non trovato' }, { status: 404 })
  }

  if (item.og_title || item.og_image) {
    return NextResponse.json({
      preview: {
        title: item.og_title,
        description: item.og_description,
        image: item.og_image,
      },
    })
  }

  const preview =
    (await fetchTikTokPreview(item.url)) ||
    (await fetchLinkPreview(item.url))

  if (!preview || (!preview.title && !preview.image)) {
    return NextResponse.json({ preview: null })
  }

  const { error: updateError } = await supabase
    .from('inbox_items')
    .update({
      content:
        preview.title &&
        ['Mi piace su TikTok', 'Video preferito su TikTok', 'Salvato da TikTok'].includes(
          item.content || ''
        )
          ? preview.title
          : item.content,
      og_title: preview.title,
      og_description: preview.description,
      og_image: preview.image,
      updated_at: new Date().toISOString(),
    })
    .eq('id', item.id)
    .eq('user_id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    preview: {
      title: preview.title,
      description: preview.description,
      image: preview.image,
    },
  })
}
