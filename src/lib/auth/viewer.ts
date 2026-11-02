import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isGrowOwner } from '@/lib/auth/owner'

// owner: GROW intera. member: solo Serie. null: nessun accesso.
export type ViewerRole = 'owner' | 'member'

export async function getViewerRole(): Promise<ViewerRole | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null
  if (isGrowOwner(user)) return 'owner'

  const { data: profile } = await supabase
    .from('tv_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  return profile ? 'member' : null
}
