import { NextResponse } from 'next/server'
import { getAuthenticatedSupabase } from '@/lib/supabase/server'
import {
  captureIsConfigured,
  createCaptureDeviceToken,
} from '@/lib/capture-auth'

export async function GET() {
  const { user } = await getAuthenticatedSupabase()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!captureIsConfigured()) {
    return NextResponse.json(
      { error: 'Cattura da telefono non configurata' },
      { status: 503 }
    )
  }

  return NextResponse.json({
    token: createCaptureDeviceToken(user.id),
    endpoint: '/api/capture',
  })
}
