import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

const ASSET_FIELDS = [
  'title',
  'project',
  'asset_type',
  'engine',
  'prompt',
  'negative_prompt',
  'format',
  'url',
  'output_text',
  'quality_score',
  'usable_for_client',
  'notes',
  'watermark',
  'reuse_score',
] as const

function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false
  const message = error.message?.toLowerCase() || ''
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    (message.includes('studio_assets') &&
      (message.includes('does not exist') || message.includes('schema cache')))
  )
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('studio_assets')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (isMissingTable(error)) {
      return NextResponse.json({
        ok: true,
        assets: [],
        warning: 'Studio assets table not configured yet',
      })
    }
    if (error) throw error

    return NextResponse.json({ ok: true, assets: data || [] })
  } catch (error) {
    console.warn(
      '[STUDIO ASSETS GET]',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { ok: false, error: 'Unable to load Studio assets' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as Record<string, unknown>
    if (
      typeof body.title !== 'string' ||
      typeof body.project !== 'string' ||
      typeof body.asset_type !== 'string' ||
      typeof body.engine !== 'string' ||
      typeof body.prompt !== 'string' ||
      (!body.url && !body.output_text)
    ) {
      return NextResponse.json(
        { ok: false, error: 'Invalid generated asset' },
        { status: 400 }
      )
    }

    const asset = Object.fromEntries(
      ASSET_FIELDS.filter((field) => body[field] !== undefined).map((field) => [
        field,
        body[field],
      ])
    )
    const { data, error } = await supabase
      .from('studio_assets')
      .insert({ ...asset, user_id: user.id })
      .select('*')
      .single()

    if (isMissingTable(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Studio assets table not configured yet',
          sql_hint: 'apply the studio_assets migration',
        },
        { status: 501 }
      )
    }
    if (error) throw error

    return NextResponse.json({ ok: true, asset: data }, { status: 201 })
  } catch (error) {
    console.warn(
      '[STUDIO ASSETS POST]',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { ok: false, error: 'Unable to save generated asset' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { id?: unknown }
    if (typeof body.id !== 'string') {
      return NextResponse.json({ ok: false, error: 'Asset id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('studio_assets')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .eq('user_id', user.id)

    if (isMissingTable(error)) {
      return NextResponse.json(
        { ok: false, error: 'Studio assets table not configured yet' },
        { status: 501 }
      )
    }
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.warn(
      '[STUDIO ASSETS DELETE]',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { ok: false, error: 'Unable to archive generated asset' },
      { status: 500 }
    )
  }
}
