import type { SupabaseClient } from '@supabase/supabase-js'

export const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_operational_context',
      description: 'Legge lo stato operativo reale di GROW: calendario, contenuti in ritardo, lavoro di oggi, inbox recente, reference salvate e output pubblicati nel mese. Usalo prima di rispondere a richieste vaghe o operative.',
      parameters: {
        type: 'object',
        properties: {
          client: { type: 'string', description: 'Cliente opzionale da filtrare, es. ANventitre, Exousia, TRAMA' },
        },
      },
    },
  },
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
      description: 'Cerca in modo intelligente tra le reference dell’Archivio usando titolo, sintesi, tag, categoria, autore e concetti affini.',
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
      name: 'project_radar',
      description: 'Trova segnali, campagne, trend e opportunità recenti pertinenti a uno specifico cliente GROW.',
      parameters: {
        type: 'object',
        properties: {
          project: { type: 'string', description: 'Cliente o progetto, es. ANventitre, Exousia, Cantina Don Carlo, ACI Copertino, TRAMA' },
          topic: { type: 'string', description: 'Tema opzionale da approfondire' },
        },
        required: ['project'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'market_forecast',
      description: 'Analizza probabilita di successo/insuccesso di un concept, campagna, brand, contenuto social o scelta creativa usando ricerche recenti, segnali di mercato e contesto cliente. Non restituisce certezze: restituisce scenari, rischi, segnali e raccomandazione.',
      parameters: {
        type: 'object',
        properties: {
          project: { type: 'string', description: 'Cliente/progetto opzionale, es. ANventitre, Exousia, TRAMA' },
          idea: { type: 'string', description: 'Idea, concept, campagna, prodotto o contenuto da valutare' },
          market: { type: 'string', description: 'Mercato/settore opzionale, es. vino naturale, retail vintage, consulenza PMI, social locale' },
          audience: { type: 'string', description: 'Target opzionale' },
        },
        required: ['idea'],
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
      name: 'create_memory',
      description: 'Propone di ricordare una preferenza, regola cliente, decisione o informazione stabile indicata esplicitamente da Davide.',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Ricordo autosufficiente e sintetico, includendo il progetto quando pertinente.',
          },
        },
        required: ['content'],
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

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
}

function compactCalendarItem(item: Record<string, unknown>) {
  return {
    id: item.id,
    client: item.client,
    title: item.title,
    type: item.content_type,
    status: item.status,
    date: item.scheduled_date,
    notes: item.notes,
  }
}

function compactInboxItem(item: Record<string, unknown>) {
  return {
    id: item.id,
    content: String(item.content || item.url || '').slice(0, 220),
    url: item.url,
    type: item.note_type,
    client: item.client,
    created_at: item.created_at,
  }
}

function compactReference(item: Record<string, unknown>) {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    artist: item.artist_name,
    platform: item.platform,
    url: item.url,
  }
}

export async function executeAgentTool(
  name: string,
  args: ToolArgs,
  supabase: SupabaseClient,
  userId: string
): Promise<unknown> {
  switch (name) {
    case 'get_operational_context': {
      const today = new Date()
      const todayKey = localDateKey(today)
      const next14Key = localDateKey(addDays(today, 14))
      const client = typeof args.client === 'string' && args.client.trim() ? args.client.trim() : ''

      let calendarQuery = supabase
        .from('calendar_items')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_date', { ascending: true })
        .limit(120)
      if (client) calendarQuery = calendarQuery.eq('client', client)

      let inboxQuery = supabase
        .from('inbox_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(18)
      if (client) inboxQuery = inboxQuery.eq('client', client)

      const [calendarResult, inboxResult, savesResult] = await Promise.all([
        calendarQuery,
        inboxQuery,
        supabase
          .from('interactions')
          .select('content_id, created_at')
          .eq('user_id', userId)
          .eq('action', 'save')
          .order('created_at', { ascending: false })
          .limit(12),
      ])

      if (calendarResult.error) return { error: calendarResult.error.message }
      if (inboxResult.error) return { error: inboxResult.error.message }
      if (savesResult.error) return { error: savesResult.error.message }

      const calendar = (calendarResult.data || []) as Record<string, unknown>[]
      const inbox = (inboxResult.data || []) as Record<string, unknown>[]
      const savedIds = [...new Set((savesResult.data || []).map((item) => item.content_id).filter(Boolean))]
      const savedResult = savedIds.length
        ? await supabase
            .from('content_items')
            .select('id, title, category, artist_name, platform, url')
            .in('id', savedIds)
        : { data: [], error: null }

      if (savedResult.error) return { error: savedResult.error.message }

      const active = calendar.filter((item) => item.status !== 'pubblicato')
      const overdue = active.filter((item) => item.scheduled_date && String(item.scheduled_date) < todayKey)
      const todayItems = active.filter((item) => item.scheduled_date === todayKey)
      const next14 = active.filter((item) => {
        const date = String(item.scheduled_date || '')
        return date > todayKey && date <= next14Key
      })
      const readyUnscheduled = active.filter((item) => item.status === 'pronto' && !item.scheduled_date)
      const production = active.filter((item) => item.status === 'in_produzione' || item.status === 'pronto')
      const publishedThisMonth = calendar.filter((item) => {
        if (item.status !== 'pubblicato' || !item.scheduled_date) return false
        const date = new Date(`${item.scheduled_date}T12:00:00`)
        return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
      })
      const outputByClient = publishedThisMonth.reduce<Record<string, number>>((acc, item) => {
        const key = String(item.client || 'Altro')
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})

      return {
        today: todayKey,
        client_filter: client || null,
        counts: {
          active_calendar_items: active.length,
          overdue: overdue.length,
          today: todayItems.length,
          next_14_days: next14.length,
          ready_without_date: readyUnscheduled.length,
          in_motion: production.length,
          recent_inbox: inbox.length,
          saved_references_sample: savedIds.length,
        },
        calendar: {
          overdue: overdue.slice(0, 8).map(compactCalendarItem),
          today: todayItems.slice(0, 8).map(compactCalendarItem),
          next_14_days: next14.slice(0, 12).map(compactCalendarItem),
          ready_without_date: readyUnscheduled.slice(0, 8).map(compactCalendarItem),
          in_motion: production.slice(0, 10).map(compactCalendarItem),
        },
        inbox_recent: inbox.slice(0, 12).map(compactInboxItem),
        saved_references_recent: ((savedResult.data || []) as Record<string, unknown>[]).map(compactReference),
        published_this_month: outputByClient,
        suggested_lens: [
          overdue.length ? 'Prima elimina o riprogramma gli arretrati.' : '',
          readyUnscheduled.length ? 'Ci sono contenuti pronti ma non piazzati in calendario.' : '',
          todayItems.length ? 'Oggi ha gia materiale operativo.' : 'Oggi e scarico: proponi una sola azione utile.',
          inbox.length ? 'Usa la inbox recente come serbatoio, non come lista da svuotare tutta.' : '',
        ].filter(Boolean),
      }
    }

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
      let query = supabase
        .from('content_items')
        .select('id, title, summary, category, tags, artist_name, platform, url, image_url, dominant_color')
      if (args.category) query = query.eq('category', args.category)
      const { data, error } = await query.limit(120)
      if (error) return { error: error.message }
      const search = typeof args.query === 'string' ? args.query : ''
      return { items: rankArchiveItems(data || [], search).slice(0, 20), search_mode: 'hybrid' }
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

    case 'create_memory': {
      if (!args.content || typeof args.content !== 'string') {
        return { error: 'content richiesto' }
      }
      const content = args.content.trim().slice(0, 1200)
      if (!content) return { error: 'memoria vuota' }
      const { data, error } = await supabase
        .from('memories')
        .insert({ user_id: userId, content })
        .select('id, content, created_at')
        .single()
      if (error) return { error: error.message }
      return { created: data }
    }

    case 'web_search': {
      if (!args.query || typeof args.query !== 'string') return { error: 'query richiesta' }
      const requested = typeof args.max_results === 'number' ? args.max_results : 5
      return webSearch(args.query, Math.min(Math.max(Math.round(requested), 1), 10))
    }

    case 'project_radar': {
      if (!args.project || typeof args.project !== 'string') return { error: 'project richiesto' }
      const topic = typeof args.topic === 'string' ? args.topic.trim() : ''
      return searchWeb(buildRadarQuery(args.project, topic), 5)
    }

    case 'market_forecast': {
      if (!args.idea || typeof args.idea !== 'string') return { error: 'idea richiesta' }
      const queries = buildForecastQueries(args)
      const searches = await Promise.all(
        queries.map(async (query) => ({
          query,
          result: await searchWeb(query, 4),
        }))
      )

      const allResults = searches.flatMap((search) =>
        'results' in search.result
          ? search.result.results.map((result) => ({ ...result, query: search.query }))
          : []
      )
      const errors = searches.flatMap((search) =>
        'error' in search.result ? [{ query: search.query, error: search.result.error }] : []
      )

      const sourceCount = allResults.length
      const confidence =
        sourceCount >= 9 ? 'media' :
        sourceCount >= 4 ? 'bassa-media' :
        'bassa'

      return {
        idea: args.idea,
        project: args.project || null,
        market: args.market || null,
        audience: args.audience || null,
        confidence,
        limitation:
          'Forecast qualitativo basato su segnali recenti e fonti web. Non e una previsione garantita ne una stima statistica.',
        searches,
        signals: allResults.slice(0, 10),
        errors,
        forecast_framework: {
          evaluate: [
            'desiderabilita: qualcuno lo vuole davvero?',
            'distintivita: si distingue dal rumore visivo/social?',
            'credibilita: il brand puo permettersi questa promessa?',
            'timing: il mercato e pronto o saturo?',
            'produzione: Davide puo produrlo bene con risorse realistiche?',
            'rischio: cosa puo farlo sembrare cheap, confuso o fuori tempo?',
          ],
          output_required:
            'Dai percentuale indicativa solo come stima qualitativa, spiega perche, indica segnali pro/contro e una modifica per aumentare le chance.',
        },
      }
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

const ARCHIVE_SYNONYMS: Record<string, string[]> = {
  lusso: ['premium', 'luxury', 'elegante', 'editoriale'],
  vino: ['wine', 'bottiglia', 'cantina', 'etichetta', 'vigneto'],
  moda: ['fashion', 'editorial', 'lookbook', 'abbigliamento'],
  grafica: ['graphic', 'branding', 'poster', 'tipografia', 'layout'],
  social: ['instagram', 'reel', 'carosello', 'post', 'story'],
  interni: ['interior', 'architettura', 'spazio', 'retail'],
  mediterraneo: ['mediterranean', 'salento', 'puglia', 'naturale'],
}

function archiveWords(value: string) {
  const words = value
    .toLocaleLowerCase('it-IT')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
  const expanded = new Set(words)
  for (const word of words) {
    for (const synonym of ARCHIVE_SYNONYMS[word] || []) expanded.add(synonym)
  }
  return expanded
}

function rankArchiveItems(items: Record<string, unknown>[], search: string) {
  const wanted = archiveWords(search)
  if (!wanted.size) return items

  return items
    .map((item) => {
      const title = String(item.title || '')
      const metadata = [
        item.summary,
        item.category,
        Array.isArray(item.tags) ? item.tags.join(' ') : item.tags,
        item.artist_name,
        item.platform,
        item.dominant_color,
      ].join(' ')
      const titleWords = archiveWords(title)
      const metadataWords = archiveWords(metadata)
      let score = 0
      for (const word of wanted) {
        if (titleWords.has(word)) score += 5
        if (metadataWords.has(word)) score += 2
        if (title.toLocaleLowerCase('it-IT').includes(word)) score += 2
      }
      return { ...item, relevance_score: score }
    })
    .filter((item) => item.relevance_score > 0)
    .sort((a, b) => b.relevance_score - a.relevance_score)
}

const RADAR_CONTEXT: Record<string, string> = {
  anventitre: 'premium Mediterranean wine branding hospitality social campaigns',
  an23: 'premium Mediterranean wine branding hospitality social campaigns',
  'cantina don carlo': 'Italian wine branding packaging hospitality Mediterranean campaigns',
  exousia: 'Italian SME consulting training grants local business communication',
  'aci copertino': 'Italian local mobility automotive public communication campaigns',
  trama: 'contemporary vintage fashion retail store launch campaigns',
}

export function buildRadarQuery(project: string, topic = '') {
  const context = RADAR_CONTEXT[project.toLocaleLowerCase('it-IT')] || 'creative brand communication'
  return [project, context, topic, 'recent campaign trend case study 2026'].filter(Boolean).join(' ')
}

function projectMarketContext(project: string) {
  return RADAR_CONTEXT[project.toLocaleLowerCase('it-IT')] || 'creative brand communication social marketing'
}

function buildForecastQueries(args: ToolArgs) {
  const idea = String(args.idea || '').trim()
  const project = String(args.project || '').trim()
  const market = String(args.market || '').trim()
  const audience = String(args.audience || '').trim()
  const context = project ? projectMarketContext(project) : ''
  const base = [idea, project, market, audience, context].filter(Boolean).join(' ')

  return [
    `${base} consumer trend 2026 marketing social media`,
    `${base} successful campaign case study brand strategy`,
    `${base} failure risk audience insight creative campaign`,
  ].map((query) => query.replace(/\s+/g, ' ').trim())
}

export async function searchWeb(
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

const webSearch = searchWeb

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
