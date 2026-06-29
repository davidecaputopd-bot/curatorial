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

export type AgentAction = { tool: string; args: unknown; result: unknown }

export type AgentResult = {
  reply: string
  actions: AgentAction[]
  provider: string
}

function hasKey(value: string | undefined) {
  return Boolean(value && value.trim().length > 0)
}

async function callGroqWithTools(messages: AgentMessage[]): Promise<{
  content: string | null
  tool_calls?: AgentToolCall[]
}> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: messages as never,
    tools: AGENT_TOOLS as never,
    tool_choice: 'auto',
    max_tokens: 1200,
    temperature: 0.4,
  })
  const message = completion.choices[0]?.message
  return {
    content: message?.content || null,
    tool_calls: message?.tool_calls as AgentToolCall[] | undefined,
  }
}

async function callOpenRouterWithTools(messages: AgentMessage[]): Promise<{
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
      tool_choice: 'auto',
      max_tokens: 1200,
      temperature: 0.4,
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const message = data.choices?.[0]?.message
  return { content: message?.content || null, tool_calls: message?.tool_calls }
}

function pickProvider(): { id: string; call: typeof callGroqWithTools } | null {
  if (hasKey(process.env.OPENROUTER_API_KEY)) return { id: 'openrouter-claude', call: callOpenRouterWithTools }
  if (hasKey(process.env.GROQ_API_KEY)) return { id: 'groq', call: callGroqWithTools }
  return null
}

const MAX_HOPS = 5

export async function runAgent(
  system: string,
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  supabase: SupabaseClient,
  userId: string
): Promise<AgentResult> {
  const provider = pickProvider()
  if (!provider) {
    throw new Error('Nessun provider AI con function calling configurato (serve GROQ_API_KEY o OPENROUTER_API_KEY)')
  }

  const messages: AgentMessage[] = [
    { role: 'system', content: system },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const actions: AgentAction[] = []

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const result = await provider.call(messages)

    if (!result.tool_calls?.length) {
      return { reply: result.content || 'Nessuna risposta.', actions, provider: provider.id }
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
    provider: provider.id,
  }
}
