import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getOwnerSupabase } from '@/lib/supabase/server'
import { getIndexPage } from '@/lib/tv/tvmaze'
import { isAuthorizedCron } from '@/lib/cron-auth'

export const maxDuration = 60

// Sotto questo peso sono serie che nessuno cerca: restano comunque
// raggiungibili dalla ricerca, che interroga TVmaze in diretta.
const PESO_MINIMO = 85
const TEMPO = 40_000
const PAUSA = 120 // TVmaze regge ~20 richieste ogni 10 secondi

// Percorre l'indice TVmaze una pagina alla volta e riempie il catalogo.
// È ripartibile: ogni passaggio riprende da dove si era fermato, e quando
// arriva in fondo ricomincia, così i pesi restano aggiornati.
export async function GET(request: Request) {
  const autorizzato =
    isAuthorizedCron(request) || Boolean((await getOwnerSupabase()).user)
  if (!autorizzato) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data: stato } = await admin
    .from('tv_catalog_state')
    .select('next_page, shows')
    .eq('id', true)
    .single()

  let pagina = stato?.next_page ?? 0
  let aggiunte = 0
  let completato = false
  const scadenza = Date.now() + TEMPO

  while (Date.now() < scadenza) {
    const serie = await getIndexPage(pagina)

    // Oltre l'ultima pagina TVmaze risponde 404: giro finito, si riparte da capo.
    if (!serie || serie.length === 0) {
      completato = true
      pagina = 0
      break
    }

    const righe = serie
      .filter((show) => (show.weight ?? 0) >= PESO_MINIMO)
      .map((show) => ({
        tvmaze_id: show.id,
        title: show.name,
        poster: show.image?.medium || null,
        network: show.network?.name || show.webChannel?.name || null,
        show_status: show.status,
        premiered: show.premiered || null,
        weight: show.weight ?? 0,
        genres: show.genres || [],
        updated_at: new Date().toISOString(),
      }))

    if (righe.length > 0) {
      const { error } = await admin.from('tv_catalog').upsert(righe, { onConflict: 'tvmaze_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      aggiunte += righe.length
    }

    pagina += 1
    await new Promise((resolve) => setTimeout(resolve, PAUSA))
  }

  const { count } = await admin
    .from('tv_catalog')
    .select('tvmaze_id', { count: 'exact', head: true })

  await admin
    .from('tv_catalog_state')
    .update({
      next_page: pagina,
      shows: count || 0,
      updated_at: new Date().toISOString(),
      ...(completato ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', true)

  return NextResponse.json({
    pagina_successiva: pagina,
    aggiunte,
    in_catalogo: count || 0,
    giro_completato: completato,
  })
}
