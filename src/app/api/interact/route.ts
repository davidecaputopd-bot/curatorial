import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const { content_id, action, read_seconds } = await request.json()

  try {
    await supabase.from('interactions').insert({
      content_id,
      action,
      read_seconds: read_seconds || null
    })

    // Aggiorna i pesi del profilo in base all'azione
    if (action === 'like' || action === 'save') {
      const { data: item } = await supabase
        .from('content_items')
        .select('category')
        .eq('id', content_id)
        .single()

      if (item?.category) {
        const { data: profile } = await supabase
          .from('user_profile')
          .select('category_weights')
          .single()

        const weights = profile?.category_weights || {}
        weights[item.category] = (weights[item.category] || 0.1) + 0.02

        // Normalizza i pesi
        const total = Object.values(weights).reduce((a: any, b: any) => a + b, 0)
        Object.keys(weights).forEach(k => weights[k] = weights[k] / (total as number))

        await supabase
          .from('user_profile')
          .update({ category_weights: weights, updated_at: new Date().toISOString() })
          .eq('name', 'Davide')
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}