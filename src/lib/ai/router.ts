import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { getAIProviders, type AITaskType, type AIProviderConfig } from './providers'

export type AIChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AIRouterResult = {
  reply: string
  provider: string
  providerLabel: string
  model: string
  mode: string
  attempts: ProviderAttempt[]
}

export type ProviderAttempt = {
  provider: string
  model: string
  ok: boolean
  error?: string
  status?: number
  retryAfter?: number
  remainingRequests?: number
  remainingTokens?: number
}

export type RouterInput = {
  system: string
  message: string
  history?: AIChatMessage[]
  temperature?: number
  maxTokens?: number
  taskType?: AITaskType
  providerId?: string
  bypassCooldown?: boolean
}

const PROVIDER_COOLDOWN_MS = 3 * 60 * 1000
const providerCooldowns = new Map<string, number>()

class ProviderHttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type OpenAIChatResponse = {
  choices?: { message?: { content?: string } }[]
}

function cleanError(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 700)
  return String(error).slice(0, 700)
}

function openAiMessages(
  system: string,
  history: AIChatMessage[],
  message: string
): OpenAIMessage[] {
  return [
    { role: 'system', content: system },
    ...history.slice(-10).map((item) => ({
      role: item.role,
      content: item.content,
    })),
    { role: 'user', content: message },
  ]
}

function errorStatus(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status
  }
  return undefined
}

function geminiHistory(history: AIChatMessage[]) {
  const normalized: AIChatMessage[] = []

  for (const item of history.slice(-10)) {
    if (!normalized.length && item.role !== 'user') continue
    const previous = normalized.at(-1)

    if (previous?.role === item.role) {
      previous.content = `${previous.content}\n\n${item.content}`
    } else {
      normalized.push({ role: item.role, content: item.content })
    }
  }

  return normalized
}

function isQuotaLikeError(error: unknown) {
  const text = cleanError(error).toLowerCase()

  return (
    text.includes('429') ||
    text.includes('rate limit') ||
    text.includes('quota') ||
    text.includes('credit') ||
    text.includes('billing') ||
    text.includes('insufficient') ||
    text.includes('too many requests')
  )
}

async function callGemini(input: RouterInput, provider: AIProviderConfig) {
  const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

  const model = gemini.getGenerativeModel({
    model: provider.model,
    systemInstruction: input.system,
    generationConfig: {
      temperature: input.temperature ?? 0.75,
      maxOutputTokens: input.maxTokens || 1200,
    },
  })

  const chat = model.startChat({
    history: geminiHistory(input.history || []).map((item) => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.content }],
    })),
  })

  const result = await chat.sendMessage(input.message)
  const text = result.response.text().trim()

  if (!text) throw new Error('Gemini empty response')

  return text
}

async function callGroq(input: RouterInput, provider: AIProviderConfig) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const completion = await groq.chat.completions.create({
    model: provider.model,
    messages: openAiMessages(input.system, input.history || [], input.message),
    max_tokens: input.maxTokens || 1200,
    temperature: input.temperature ?? 0.75,
  })

  const text = completion.choices[0]?.message?.content?.trim()

  if (!text) throw new Error('Groq empty response')

  return text
}

async function callOpenRouter(input: RouterInput, provider: AIProviderConfig) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://grow-eight-kappa.vercel.app',
      'X-OpenRouter-Title': 'GROW',
    },
    body: JSON.stringify({
      model: provider.model,
      messages: openAiMessages(input.system, input.history || [], input.message),
      temperature: input.temperature ?? 0.75,
      max_tokens: input.maxTokens || 1200,
    }),
  })

  const data = (await res.json().catch(() => null)) as OpenAIChatResponse | null

  if (!res.ok) {
    throw new ProviderHttpError(
      `OpenRouter ${res.status}: ${JSON.stringify(data).slice(0, 500)}`,
      res.status
    )
  }

  const text = data?.choices?.[0]?.message?.content?.trim()

  if (!text) throw new Error('OpenRouter empty response')

  return text
}

async function callTogether(input: RouterInput, provider: AIProviderConfig) {
  const res = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      messages: openAiMessages(input.system, input.history || [], input.message),
      temperature: input.temperature ?? 0.75,
      max_tokens: input.maxTokens || 1200,
    }),
  })

  const data = (await res.json().catch(() => null)) as OpenAIChatResponse | null

  if (!res.ok) {
    throw new ProviderHttpError(
      `Together ${res.status}: ${JSON.stringify(data).slice(0, 500)}`,
      res.status
    )
  }

  const text = data?.choices?.[0]?.message?.content?.trim()

  if (!text) throw new Error('Together empty response')

  return text
}

async function callProvider(input: RouterInput, provider: AIProviderConfig) {
  if (provider.id === 'gemini') return callGemini(input, provider)
  if (provider.id === 'groq') return callGroq(input, provider)
  if (provider.id.startsWith('openrouter')) return callOpenRouter(input, provider)
  if (provider.id === 'together') return callTogether(input, provider)

  throw new Error(`Provider non supportato: ${provider.id}`)
}

export async function routeAI(input: RouterInput): Promise<AIRouterResult> {
  const taskType = input.taskType || 'text'
  const providers = getAIProviders(taskType).filter(
    (provider) => !input.providerId || provider.id === input.providerId
  )

  const attempts: AIRouterResult['attempts'] = []

  if (!providers.length) {
    throw new Error(`Nessun provider AI disponibile per taskType=${taskType}`)
  }

  for (const provider of providers) {
    const cooldownUntil = providerCooldowns.get(provider.id) || 0
    if (!input.bypassCooldown && cooldownUntil > Date.now()) {
      attempts.push({
        provider: provider.id,
        model: provider.model,
        ok: false,
        status: 429,
        retryAfter: Math.ceil((cooldownUntil - Date.now()) / 1000),
        error: 'Provider in cooldown after rate limit',
      })
      continue
    }

    if (cooldownUntil) providerCooldowns.delete(provider.id)

    try {
      const reply = await callProvider(input, provider)

      attempts.push({
        provider: provider.id,
        model: provider.model,
        ok: true,
      })

      return {
        reply,
        provider: provider.id,
        providerLabel: provider.label,
        model: provider.model,
        mode: provider.mode,
        attempts,
      }
    } catch (error) {
      const status = errorStatus(error)
      const quotaLike = isQuotaLikeError(error)

      if (quotaLike || status === 429) {
        providerCooldowns.set(provider.id, Date.now() + PROVIDER_COOLDOWN_MS)
      }

      attempts.push({
        provider: provider.id,
        model: provider.model,
        ok: false,
        status,
        error: cleanError(error),
      })

      console.warn('[AI ROUTER FALLBACK]', {
        provider: provider.id,
        model: provider.model,
        quotaLike,
        error: cleanError(error),
      })
    }
  }

  throw new Error(
    'Tutti i provider AI hanno fallito: ' +
      attempts
        .map((attempt) => `${attempt.provider}/${attempt.model}: ${attempt.error || 'failed'}`)
        .join(' | ')
  )
}
