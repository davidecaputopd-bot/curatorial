import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { buildRadarQuery, searchWeb } from '@/lib/ai/agent-tools'

const PROJECTS = [
  'ANventitre',
  'Exousia',
  'Cantina Don Carlo',
  'ACI Copertino',
  'TRAMA',
]

function projectForToday() {
  const day = Math.floor(Date.now() / 86_400_000)
  return PROJECTS[day % PROJECTS.length]
}

export async function GET(request: Request) {
  const { user } = await getAuthenticatedSupabase()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const requested = url.searchParams.get('project')?.trim()
  const project = requested && PROJECTS.includes(requested)
    ? requested
    : projectForToday()
  const result = await searchWeb(buildRadarQuery(project), 3)

  if ('error' in result) {
    return NextResponse.json({
      ok: true,
      project,
      signals: [],
      warning: result.error,
    })
  }

  return NextResponse.json({
    ok: true,
    project,
    signals: result.results.filter((item) => item.title && item.url),
  })
}
