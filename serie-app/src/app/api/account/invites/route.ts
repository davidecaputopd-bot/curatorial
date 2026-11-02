import { NextResponse } from 'next/server'
import { getOwnerSupabase } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// Senza vocali e senza caratteri ambigui: un codice si detta al telefono.
const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY3479'

function newCode() {
  const pick = () =>
    Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')
  return `${pick()}${pick()}`
}

// Solo il proprietario crea e vede i codici di invito.
export async function GET() {
  const { user } = await getOwnerSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('tv_invites')
    .select('code, note, created_at, used_at, used_by')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invites: data || [] })
}

export async function POST(request: Request) {
  const { user } = await getOwnerSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const note = String(body?.note || '').trim() || null

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('tv_invites')
    .insert({ code: newCode(), note })
    .select('code, note, created_at, used_at, used_by')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invite: data })
}
