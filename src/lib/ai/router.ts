import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

export type AIChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AIRouterResult = {
  reply: string
  provider: string
  model: string
  attempts: {
    provider: string
    model: string
    ok: boolean
    error?: string
  }[]
}

type RouterInput = {
  system: string
  message: string
  history?: AIChatMessage[]
  temperature?: number
  maxTokens?: number
}

function cleanError(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 500)
  return String(error).slice(0, 500)
}

function hasKey(value: string | undefined) {
  return Boolean(value && value.trim().length > 0)
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function openAiMessages(system: string, history: AIChatMessage[], message: string) {
  return [
    { role: 'system', content: system },
    ...history.slice(-10).map((item) => ({
      role: item.role,
      content: item.content,
    })),
    { role: 'user', content: message },
  ]
}

async function callGemini(input: RouterInput, modelName: string) {
  if (!hasKey(process.env.GEMINI_API_KEY)) {
    throw new Error('GEMINI_API_KEY missing')
  }

  const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
  const model = gemini.getGenerativeModel({
    model: modelName,
    systemInstruction: input.system,
  })

  const chat = model.startChat({
    history: (input.history || []).slice(-10).map((item) => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.content }],
    })),
  })

  const result = await chat.sendMessage(input.message)
  const text = result.response.text().trim()

  if (!text) throw new Error('Gemini empty response')

  return text
}

async function callGroq(input: RouterInput, modelName: string) {
  if (!hasKey(process.env.GROQ_API_KEY)) {
    throw new Error('GROQ_API_KEY missing')
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const completion = await groq.chat.completions.create({
    model: modelName,
    messages: openAiMessages(input.system, input.history || [], input.message) as any,
    max_tokens: input.maxTokens || 1200,
    temperature: input.temperature ?? 0.75,
  })

  const text = completion.choices[0]?.message?.content?.trim()

  if (!text) throw new Error('Groq empty response')

  return text
}

async function callOpenRouter(input: RouterInput, modelName: string) {
  if (!hasKey(process.env.OPENROUTER_API_KEY)) {
    throw new Error('OPENROUTER_API_KEY missing')
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://grow-eight-kappa.vercel.app',
      'X-OpenRouter-Title': 'GROW',
    },
    body: JSON.stringify({
      model: modelName,
      messages: openAiMessages(input.system, input.history || [], input.message),
      temperature: input.temperature ?? 0.75,
      max_tokens: input.maxTokens || 1200,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${JSON.stringify(data).slice(0, 400)}`)
  }

  const text = data?.choices?.[0]?.message?.content?.trim()

  if (!text) throw new Error('OpenRouter empty response')

  return text
}

async function callTogether(input: RouterInput, modelName: string) {
  if (!hasKey(process.env.TOGETHER_API_KEY)) {
    throw new Error('TOGETHER_API_KEY missing')
  }

  const res = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      messages: openAiMessages(input.system, input.history || [], input.message),
      temperature: input.temperature ?? 0.75,
      max_tokens: input.maxTokens || 1200,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(`Together ${res.status}: ${JSON.stringify(data).slice(0, 400)}`)
  }

  const text = data?.choices?.[0]?.message?.content?.trim()

  if (!text) throw new Error('Together empty response')

  return text
}

export async function routeAI(input: RouterInput): Promise<AIRouterResult> {
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

  const openRouterModels = unique([
    process.env.OPENROUTER_MODEL || '',
    '~anthropic/claude-sonnet-latest',
    '~openai/gpt-latest',
  ])

  const togetherModels = unique([
    process.env.TOGETHER_MODEL || '',
  ])

  const providers: {
    provider: string
    model: string
    enabled: boolean
    call: () => Promise<string>
  }[] = [
    {
      provider: 'gemini',
      model: geminiModel,
      enabled: hasKey(process.env.GEMINI_API_KEY),
      call: () => callGemini(input, geminiModel),
    },
    {
      provider: 'groq',
      model: groqModel,
      enabled: hasKey(process.env.GROQ_API_KEY),
      call: () => callGroq(input, groqModel),
    },
    ...openRouterModels.map((model) => ({
      provider: 'openrouter',
      model,
      enabled: hasKey(process.env.OPENROUTER_API_KEY),
      call: () => callOpenRouter(input, model),
    })),
    ...togetherModels.map((model) => ({
      provider: 'together',
      model,
      enabled: hasKey(process.env.TOGETHER_API_KEY) && hasKey(model),
      call: () => callTogether(input, model),
    })),
  ]

  const attempts: AIRouterResult['attempts'] = []

  for (const provider of providers) {
    if (!provider.enabled) {
      attempts.push({
        provider: provider.provider,
        model: provider.model,
        ok: false,
        error: 'disabled or missing key',
      })
      continue
    }

    try {
      const reply = await provider.call()

      attempts.push({
        provider: provider.provider,
        model: provider.model,
        ok: true,
      })

      return {
        reply,
        provider: provider.provider,
        model: provider.model,
        attempts,
      }
    } catch (error) {
      attempts.push({
        provider: provider.provider,
        model: provider.model,
        ok: false,
        error: cleanError(error),
      })
    }
  }

  throw new Error(
    'All AI providers failed: ' +
      attempts
        .map((attempt) => `${attempt.provider}/${attempt.model}: ${attempt.error || 'failed'}`)
        .join(' | ')
  )
}
