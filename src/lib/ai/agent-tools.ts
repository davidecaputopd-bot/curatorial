import type { SupabaseClient } from '@supabase/supabase-js'

export const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_calendar_items',
      description: 'Elenca i contenuti del calendario editoriale, opzionalmente filtrati per cliente o stato.',
      parameters: {
        type: 'object',
        properties: {
          client: { type: 'string', description: 'Nome cliente esatto, es. ANventitre, Exousia, TRAMA' },
          status: { type: 'string', enum: ['idea', 'in_produzione', 'pronto', 'pubblicato', 'da_riciclare'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_item',
      description: 'Crea un nuovo contenuto nel calendario editoriale.',
      parameters: {
        type: 'object',
        properties: {
          client: { type: 'string' },
          title: { type: 'string' },
          content_type: { type: 'string', enum: ['reel', 'carosello', 'post', 'storia', 'altro'] },
          status: { type: 'string', enum: ['idea', 'in_produzione', 'pronto', 'pubblicato', 'da_riciclare'] },
          scheduled_date: { type: 'string', description: 'Formato YYYY-MM-DD' },
          notes: { type: 'string' },
        },
        required: ['client', 'title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_calendar_status',
      description: 'Cambia lo stato di uno o piu contenuti calendario trovati per titolo (anche parziale) e opzionalmente cliente.',
      parameters: {
        type: 'object',
        properties: {
          title_contains: { type: 'string', description: 'Testo da cercare nel titolo, case-insensitive' },
          client: { type: 'string' },
          new_status: { type: 'string', enum: ['idea', 'in_produzione', 'pronto', 'pubblicato', 'da_riciclare'] },
        },
        required: ['title_contains', 'new_status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_inbox_items',
      description: 'Elenca le idee/link/note salvate in Inbox, opzionalmente filtrate per cliente.',
      parameters: {
        type: 'object',
        properties: {
          client: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_inbox_item',
      description: 'Salva una nuova idea, nota o link in Inbox.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          url: { type: 'string' },
          client: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_saved_content',
      description: 'Cerca tra le reference salvate in Archivio per titolo o categoria.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Testo da cercare nel titolo' },
          category: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_monthly_output_summary',
      description: 'Riassume quanti contenuti sono stati pubblicati questo mese, raggruppati per cliente.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Genera un\'immagine a partire da una descrizione. Usa questo quando Davide chiede di creare/generare/disegnare un\'immagine, mockup visivo o illustrazione.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Descrizione visiva dettagliata in inglese, pronta per un modello text-to-image' },
        },
        required: ['prompt'],
      },
    },
  },
] as const

function buildImageUrl(prompt: string): string {
  const params = new URLSearchParams({
    model: 'flux',
    width: '1024',
    height: '1024',
    nologo: 'true',
    seed: String(Math.floor(Math.random() * 999_999_999)),
  })
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`
}

type ToolArgs = Record<string, unknown>

export async function executeAgentTool(
  name: string,
  args: ToolArgs,
  supabase: SupabaseClient,
  userId: string
): Promise<unknown> {
  switch (name) {
    case 'list_calendar_items': {
      let query = supabase.from('calendar_items').select('*').eq('user_id', userId).order('scheduled_date', { ascending: true })
      if (args.client) query = query.eq('client', args.client)
      if (args.status) query = query.eq('status', args.status)
      const { data, error } = await query.limit(50)
      if (error) return { error: error.message }
      return { items: data }
    }

    case 'create_calendar_item': {
      if (!args.client || !args.title) return { error: 'client e title richiesti' }
      const { data, error } = await supabase
        .from('calendar_items')
        .insert({
          user_id: userId,
          client: args.client,
          title: args.title,
          content_type: args.content_type || 'altro',
          status: args.status || 'idea',
          scheduled_date: args.scheduled_date || null,
          notes: args.notes || null,
        })
        .select()
        .single()
      if (error) return { error: error.message }
      return { created: data }
    }

    case 'update_calendar_status': {
      if (!args.title_contains || !args.new_status) return { error: 'title_contains e new_status richiesti' }
      let query = supabase
        .from('calendar_items')
        .select('id, title, client')
        .eq('user_id', userId)
        .ilike('title', `%${args.title_contains}%`)
      if (args.client) query = query.eq('client', args.client)
      const { data: matches, error: findError } = await query
      if (findError) return { error: findError.message }
      if (!matches?.length) return { error: 'Nessun contenuto trovato con quel titolo' }

      const ids = matches.map((m) => m.id)
      const { error: updateError } = await supabase
        .from('calendar_items')
        .update({ status: args.new_status, updated_at: new Date().toISOString() })
        .in('id', ids)
      if (updateError) return { error: updateError.message }
      return { updated: matches }
    }

    case 'list_inbox_items': {
      let query = supabase.from('inbox_items').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (args.client) query = query.eq('client', args.client)
      const { data, error } = await query.limit(typeof args.limit === 'number' ? args.limit : 30)
      if (error) return { error: error.message }
      return { items: data }
    }

    case 'create_inbox_item': {
      if (!args.content && !args.url) return { error: 'content o url richiesto' }
      const { data, error } = await supabase
        .from('inbox_items')
        .insert({ user_id: userId, content: args.content || args.url, url: args.url || null, client: args.client || null, source: 'agent' })
        .select()
        .single()
      if (error) return { error: error.message }
      return { created: data }
    }

    case 'search_saved_content': {
      let query = supabase.from('content_items').select('id, title, category, url, image_url')
      if (args.query) query = query.ilike('title', `%${args.query}%`)
      if (args.category) query = query.eq('category', args.category)
      const { data, error } = await query.limit(20)
      if (error) return { error: error.message }
      return { items: data }
    }

    case 'get_monthly_output_summary': {
      const now = new Date()
      const { data, error } = await supabase
        .from('calendar_items')
        .select('client, status, scheduled_date')
        .eq('user_id', userId)
        .eq('status', 'pubblicato')
      if (error) return { error: error.message }
      const counts: Record<string, number> = {}
      for (const item of data || []) {
        if (!item.scheduled_date) continue
        const date = new Date(item.scheduled_date)
        if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
          counts[item.client] = (counts[item.client] || 0) + 1
        }
      }
      return { published_this_month: counts }
    }

    case 'generate_image': {
      if (!args.prompt || typeof args.prompt !== 'string') return { error: 'prompt richiesto' }
      return { image_url: buildImageUrl(args.prompt), prompt: args.prompt }
    }

    default:
      return { error: `Tool non riconosciuto: ${name}` }
  }
}
