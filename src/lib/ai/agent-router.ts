import Groq from 'groq-sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AGENT_TOOLS, executeAgentTool } from './agent-tools'

export type AgentMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: AgentToolCall[]
  tool_call_id?: string
}

type AgentToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type AgentToolChoice =
  | 'auto'
  | { type: 'function'; function: { name: 'web_search' | 'fetch_webpage' } }

type AgentProvider = {
  id: string
  call: (
    messages: AgentMessage[],
    toolChoice: AgentToolChoice
  ) => Promise<{ content: string | null; tool_calls?: AgentToolCall[] }>
}

export type AgentAction = { tool: string; args: unknown; result: unknown }

export type AgentResult = {
  reply: string
  actions: AgentAction[]
  provider: string
  imageUrl?: string
}

function extractImageUrl(actions: AgentAction[]): string | undefined {
  for (let i = actions.length - 1; i >= 0; i--) {
    const result = actions[i].result as { image_url?: string } | undefined
    if (actions[i].tool === 'generate_image' && result?.image_url) return result.image_url
  }
  return undefined
}

function hasKey(value: string | undefined) {
  return Boolean(value && value.trim().length > 0)
}

function extractFailedGeneration(error: unknown): AgentToolCall[] | null {
  const raw = JSON.stringify(error)
  const match = raw.match(/<function=([\w_]+)(\{[^<]*\})<\/function>/)
  if (!match) return null

  try {
    JSON.parse(match[2])
  } catch {
    return null
  }

  return [
    {
      id: `recovered-${Date.now()}`,
      type: 'function',
      function: { name: match[1], arguments: match[2] },
    },
  ]
}

async function callGroqWithTools(
  messages: AgentMessage[],
  toolChoice: AgentToolChoice
): Promise<{
  content: string | null
  tool_calls?: AgentToolCall[]
}> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: messages as never,
      tools: AGENT_TOOLS as never,
      tool_choice: toolChoice as never,
      max_tokens: 1200,
      temperature: 0.4,
    })
    const message = completion.choices[0]?.message
    return {
      content: message?.content || null,
      tool_calls: message?.tool_calls as AgentToolCall[] | undefined,
    }
  } catch (error) {
    const recovered = extractFailedGeneration(error)
    if (recovered) return { content: null, tool_calls: recovered }
    throw error
  }
}

async function callOpenRouterWithTools(
  messages: AgentMessage[],
  toolChoice: AgentToolChoice
): Promise<{
  content: string | null
  tool_calls?: AgentToolCall[]
}> {
  const model = process.env.OPENROUTER_CLAUDE_MODEL || 'anthropic/claude-sonnet-4'
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://grow-eight-kappa.vercel.app',
    },
    body: JSON.stringify({
      model,
      messages,
      tools: AGENT_TOOLS,
      tool_choice: toolChoice,
      max_tokens: 1200,
      temperature: 0.4,
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const message = data.choices?.[0]?.message
  return { content: message?.content || null, tool_calls: message?.tool_calls }
}

function getProviders(): AgentProvider[] {
  const providers: AgentProvider[] = []
  if (hasKey(process.env.OPENROUTER_API_KEY)) {
    providers.push({ id: 'openrouter-claude', call: callOpenRouterWithTools })
  }
  if (hasKey(process.env.GROQ_API_KEY)) {
    providers.push({ id: 'groq', call: callGroqWithTools })
  }
  return providers
}

function firstToolFor(message: string): AgentToolChoice {
  const trimmed = message.trim()
  const asksToReadUrl =
    /^https?:\/\/[^\s<>"']+$/i.test(trimmed) ||
    /\b(leggi|analizza|apri|visita|guarda|riassumi)\b.{0,80}https?:\/\/[^\s<>"']+/i.test(message)

  if (asksToReadUrl) {
    return { type: 'function', function: { name: 'fetch_webpage' } }
  }

  const needsFreshResearch =
    /\b(cerca|ricerca|trova)\b.{0,40}\b(web|online|internet|trend|notizi[ae]|campagn[ae]|reference|fonti)\b/i.test(message) ||
    /\b(ultim[oaie]|recent[ei]|attuale|aggiornat[oaie]|oggi|adesso|novità|trend|notizi[ae])\b/i.test(message) ||
    /\b(quanto costa|prezzo attuale|chi è oggi|nel 2026)\b/i.test(message)

  return needsFreshResearch
    ? { type: 'function', function: { name: 'web_search' } }
    : 'auto'
}

const MAX_HOPS = 5

export type AgentCallbacks = {
  onTool?: (tool: string, result: unknown) => void
  onToken?: (token: string) => void
}

export async function runAgent(
  system: string,
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  supabase: SupabaseClient,
  userId: string,
  callbacks?: AgentCallbacks
): Promise<AgentResult> {
  const providers = getProviders()
  if (!providers.length) {
    throw new Error('Nessun provider AI con function calling configurato (serve GROQ_API_KEY o OPENROUTER_API_KEY)')
  }

  const messages: AgentMessage[] = [
    { role: 'system', content: system },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const actions: AgentAction[] = []
  let activeProvider = providers[0]
  const initialToolChoice = firstToolFor(userMessage)

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let result: { content: string | null; tool_calls?: AgentToolCall[] } | null = null
    let lastError: unknown
    const orderedProviders = [
      activeProvider,
      ...providers.filter((provider) => provider.id !== activeProvider.id),
    ]

    for (const provider of orderedProviders) {
      try {
        result = await provider.call(
          messages,
          hop === 0 ? initialToolChoice : 'auto'
        )
        activeProvider = provider
        break
      } catch (error) {
        lastError = error
      }
    }

    if (!result) {
      return {
        reply:
          'I provider AI non hanno completato la richiesta. Riprova tra poco. Dettaglio: ' +
          (lastError instanceof Error ? lastError.message.slice(0, 160) : String(lastError)),
        actions,
        provider: activeProvider.id,
      }
    }

    if (!result.tool_calls?.length) {
      const reply = result.content || 'Nessuna risposta.'
      callbacks?.onToken?.(reply)
      return { reply, actions, provider: activeProvider.id, imageUrl: extractImageUrl(actions) }
    }

    messages.push({ role: 'assistant', content: result.content || '', tool_calls: result.tool_calls })

    for (const call of result.tool_calls) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(call.function.arguments || '{}')
      } catch {
        args = {}
      }

      const toolResult = await executeAgentTool(call.function.name, args, supabase, userId)
      actions.push({ tool: call.function.name, args, result: toolResult })
      callbacks?.onTool?.(call.function.name, toolResult)

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(toolResult),
      })
    }
  }

  return {
    reply: 'Ho eseguito alcune azioni ma non sono riuscito a concludere il ragionamento. Chiedimi di nuovo per continuare.',
    actions,
    provider: activeProvider.id,
    imageUrl: extractImageUrl(actions),
  }
}
