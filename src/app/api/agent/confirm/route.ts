import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import { executeAgentTool } from '@/lib/ai/agent-tools'

const CONFIRMABLE_TOOLS = new Set([
  'create_calendar_item',
  'update_calendar_status',
  'create_inbox_item',
  'create_memory',
])

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const tool = typeof body.tool === 'string' ? body.tool : ''
  const args =
    body.args && typeof body.args === 'object' && !Array.isArray(body.args)
      ? body.args
      : {}

  if (!CONFIRMABLE_TOOLS.has(tool)) {
    return NextResponse.json(
      { error: 'Azione non confermabile' },
      { status: 400 }
    )
  }

  const result = await executeAgentTool(tool, args, supabase, user.id)
  const failed =
    result &&
    typeof result === 'object' &&
    'error' in result &&
    Boolean(result.error)

  return NextResponse.json(
    failed ? { ok: false, result } : { ok: true, result },
    { status: failed ? 422 : 200 }
  )
}
