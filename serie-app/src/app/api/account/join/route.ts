import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { DEFAULT_ACCENT, isAccent } from '@/lib/accents'

const normalizeCode = (value: unknown) =>
  String(value || '')
    .toLocaleUpperCase('en-US')
    .replace(/[^A-Z0-9]/g, '')

// Crea l'account di un amico partendo da un codice di invito.
// È l'unica via d'ingresso: senza codice valido non nasce nessun profilo,
// e senza profilo il proxy non lascia entrare in Serie.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 })

  const email = String(body.email || '').trim().toLocaleLowerCase('en-US')
  const password = String(body.password || '')
  const displayName = String(body.display_name || '').trim()
  const code = normalizeCode(body.code)
  const accent = isAccent(body.accent) ? body.accent : DEFAULT_ACCENT

  if (!email.includes('@')) return NextResponse.json({ error: 'Email non valida' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'La password deve avere almeno 8 caratteri' }, { status: 400 })
  if (!displayName) return NextResponse.json({ error: 'Manca il nome' }, { status: 400 })
  if (!code) return NextResponse.json({ error: 'Manca il codice di invito' }, { status: 400 })

  const admin = createAdminSupabaseClient()

  const { data: invite } = await admin
    .from('tv_invites')
    .select('code, used_by')
    .eq('code', code)
    .maybeSingle()
  if (!invite || invite.used_by) {
    return NextResponse.json({ error: 'Codice di invito non valido o già usato' }, { status: 400 })
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (createError || !created.user) {
    const taken = createError?.message?.toLocaleLowerCase('en-US').includes('already')
    return NextResponse.json(
      { error: taken ? 'Esiste già un account con questa email' : 'Non è stato possibile creare l’account' },
      { status: 400 }
    )
  }

  // Il codice si consuma solo se è ancora libero: due persone con lo stesso
  // codice non possono entrare entrambe.
  const { data: claimed } = await admin
    .from('tv_invites')
    .update({ used_by: created.user.id, used_at: new Date().toISOString() })
    .eq('code', code)
    .is('used_by', null)
    .select('code')
    .maybeSingle()

  if (!claimed) {
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: 'Codice di invito non valido o già usato' }, { status: 400 })
  }

  const { error: profileError } = await admin
    .from('tv_profiles')
    .insert({ id: created.user.id, display_name: displayName, role: 'member', accent })

  if (profileError) {
    await admin.from('tv_invites').update({ used_by: null, used_at: null }).eq('code', code)
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: 'Non è stato possibile creare il profilo' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
