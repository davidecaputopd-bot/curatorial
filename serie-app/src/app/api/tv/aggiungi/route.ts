import { NextResponse } from 'next/server'
import { getTvSupabase } from '@/lib/supabase/server'

type Scelta = { tvmaze_id: number; title: string; poster?: string | null; network?: string | null }

// Aggiunge in blocco le serie scelte all'ingresso.
// Non scarica gli episodi qui: sarebbe una richiesta a TVmaze per serie e la
// funzione andrebbe in timeout. Restano senza synced_at, e il primo
// caricamento della home li scarica poche serie per volta (/api/tv/sync).
export async function POST(request: Request) {
  const { supabase, user } = await getTvSupabase()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const scelte: Scelta[] = Array.isArray(body?.serie) ? body.serie.slice(0, 200) : []
  if (scelte.length === 0) return NextResponse.json({ aggiunte: 0 })

  const oggi = new Date().toISOString().slice(0, 10)
  const righe = scelte
    .filter((scelta) => Number.isFinite(Number(scelta.tvmaze_id)) && scelta.title)
    .map((scelta) => ({
      user_id: user.id,
      title: String(scelta.title),
      tvmaze_id: Number(scelta.tvmaze_id),
      poster: scelta.poster || null,
      network: scelta.network || null,
      followed: true,
      followed_at: oggi,
      progress_season: null, // posizione da impostare: è il passo dopo
      progress_episode: null,
      imported_from: 'inizio',
    }))

  // Se una serie c'è già (stesso titolo) torna solo a essere seguita.
  const { data, error } = await supabase
    .from('tv_shows')
    .upsert(righe, { onConflict: 'user_id,title' })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ aggiunte: data?.length || 0 })
}
