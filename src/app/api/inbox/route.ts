import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { fetchLinkPreview } from '@/lib/link-preview'

export async function GET(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')

  let query = supabase
    .from('inbox_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  query = source ? query.eq('source', source) : query.neq('source', 'chat')

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.content && !body.url && !body.image_url)
    return NextResponse.json({ error: 'content, url o image_url richiesto' }, { status: 400 })

  // detect URL in content (for chat messages that are pure links)
  const detectedUrl: string | null =
    body.url ||
    (body.content ? (body.content.match(/https?:\/\/[^\s<>"']+/)?.[0] ?? null) : null)

  let content = body.content
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

  if (!content && body.image_url) content = 'Screenshot'

  const { data, error } = await supabase
    .from('inbox_items')
    .insert({
      user_id: user.id,
      content,
      url: detectedUrl,
      image_url: body.image_url || null,
      client: body.client,
      source: body.source || 'manual',
      og_title: ogTitle,
      og_description: ogDescription,
      og_image: ogImage,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  const { error } = await supabase
    .from('inbox_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
