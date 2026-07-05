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
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Cerca informazioni aggiornate sul web con Tavily. Usalo per trend, brand, campagne, notizie e informazioni recenti. Restituisce titolo, URL e contenuto sintetico delle fonti.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Query di ricerca precisa' },
          max_results: { type: 'number', description: 'Numero di risultati, da 1 a 10. Default 5.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_webpage',
      description: 'Legge il testo di una pagina web pubblica. Usalo per analizzare un articolo, una campagna, un sito concorrente o un URL indicato da Davide.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL pubblico completo http/https' },
          max_chars: { type: 'number', description: 'Massimo testo restituito, da 500 a 8000 caratteri. Default 4000.' },
        },
        required: ['url'],
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

    case 'web_search': {
      if (!args.query || typeof args.query !== 'string') return { error: 'query richiesta' }
      const requested = typeof args.max_results === 'number' ? args.max_results : 5
      return webSearch(args.query, Math.min(Math.max(Math.round(requested), 1), 10))
    }

    case 'fetch_webpage': {
      if (!args.url || typeof args.url !== 'string') return { error: 'url richiesto' }
      const requested = typeof args.max_chars === 'number' ? args.max_chars : 4000
      return fetchWebpage(args.url, Math.min(Math.max(Math.round(requested), 500), 8000))
    }

    default:
      return { error: `Tool non riconosciuto: ${name}` }
  }
}

type SearchResult = {
  title: string
  url: string
  snippet: string
}

async function webSearch(
  query: string,
  maxResults: number
): Promise<{ results: SearchResult[] } | { error: string }> {
  const apiKey = process.env.TAVILY_API_KEY || process.env.Tavily
  if (!apiKey) return { error: 'Tavily non configurato: manca TAVILY_API_KEY' }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      return { error: `Tavily HTTP ${response.status}` }
    }

    const data = (await response.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>
    }

    return {
      results: (data.results || []).slice(0, maxResults).map((result) => ({
        title: result.title || '',
        url: result.url || '',
        snippet: result.content || '',
      })),
    }
  } catch (error) {
    return {
      error: `Tavily non disponibile: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.')
  ) {
    return true
  }

  const match172 = host.match(/^172\.(\d{1,3})\./)
  return Boolean(match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31)
}

async function fetchWebpage(
  url: string,
  maxChars: number
): Promise<{ url: string; text: string; truncated: boolean } | { error: string }> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { error: 'URL non valido' }
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || isBlockedHostname(parsed.hostname)) {
    return { error: 'URL non consentito' }
  }

  try {
    const response = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'GROW/1.0 (+https://grow-eight-kappa.vercel.app)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return { error: `HTTP ${response.status}` }

    const contentType = response.headers.get('content-type') || ''
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/json')
    ) {
      return { error: `Contenuto non supportato: ${contentType}` }
    }

    const raw = await response.text()
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()

    return {
      url: response.url,
      text: text.slice(0, maxChars),
      truncated: text.length > maxChars,
    }
  } catch (error) {
    return {
      error: `Pagina non disponibile: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
