import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabaseClient(persistSession = true) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        flowType: 'pkce',
        persistSession,
        // "Resta connesso" off -> tokens live only in sessionStorage (gone on browser close)
        storage: typeof window !== 'undefined' && !persistSession ? window.sessionStorage : undefined,
      },
    }
  )
}
