import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { AccentId } from '@/lib/accents'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components cannot write cookies. Route Handlers and proxy can.
          }
        },
      },
    }
  )
}

export type Profile = {
  id: string
  display_name: string
  role: 'owner' | 'member'
  accent: AccentId
}

// Un account vale solo se ha un profilo: i profili nascono da un invito.
export async function getSession() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, profile: null as Profile | null }

  const { data: profile } = await supabase
    .from('tv_profiles')
    .select('id, display_name, role, accent')
    .eq('id', user.id)
    .maybeSingle<Profile>()

  return { supabase, user: profile ? user : null, profile: profile ?? null }
}

export async function getTvSupabase() {
  const { supabase, user } = await getSession()
  return { supabase, user }
}

// Solo chi ha ruolo owner: serve per creare i codici di invito.
export async function getOwnerSupabase() {
  const { supabase, user, profile } = await getSession()
  return { supabase, user: profile?.role === 'owner' ? user : null }
}
