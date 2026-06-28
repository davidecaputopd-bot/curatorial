import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'

const JOB_FIELDS = [
  'title',
  'project',
  'job_type',
  'engine',
  'status',
  'brief',
  'reference',
  'format',
  'prompts',
  'checklist',
  'settings',
  'result',
  'cost_mode',
  'quality_score',
] as const

function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false
  const message = error.message?.toLowerCase() || ''
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    message.includes('studio_jobs') &&
      (message.includes('does not exist') || message.includes('schema cache'))
  )
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedSupabase()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('studio_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (isMissingTable(error)) {
      return NextResponse.json({
        ok: true,
        jobs: [],
        warning: 'Studio jobs table not configured yet',
      })
    }
    if (error) throw error

    return NextResponse.json({ ok: true, jobs: data || [] })
  } catch (error) {
    console.warn(
      '[STUDIO JOBS GET]',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { ok: false, error: 'Unable to load Studio jobs' },
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
    if (typeof body.title !== 'string' || typeof body.brief !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'title and brief are required' },
        { status: 400 }
      )
    }

    const job = Object.fromEntries(
      JOB_FIELDS.filter((field) => body[field] !== undefined).map((field) => [
        field,
        body[field],
      ])
    )
    const { data, error } = await supabase
      .from('studio_jobs')
      .insert({ ...job, user_id: user.id })
      .select('*')
      .single()

    if (isMissingTable(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Studio jobs table not configured yet',
          sql_hint: 'create studio_jobs table',
        },
        { status: 501 }
      )
    }
    if (error) throw error

    return NextResponse.json({ ok: true, job: data }, { status: 201 })
  } catch (error) {
    console.warn(
      '[STUDIO JOBS POST]',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { ok: false, error: 'Unable to create Studio job' },
      { status: 500 }
    )
  }
}
