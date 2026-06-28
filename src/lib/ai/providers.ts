export type AITaskType =
  | 'text'
  | 'prompt'
  | 'code'
  | 'strategy'
  | 'vision'
  | 'image'

export type ProviderMode = 'free' | 'cheap' | 'premium'

export type AIProviderConfig = {
  id: string
  label: string
  mode: ProviderMode
  model: string
  enabled: boolean
  priority: number
  taskTypes: AITaskType[]
}

function hasKey(value: string | undefined) {
  return Boolean(value && value.trim().length > 0)
}

export function getAIProviders(taskType: AITaskType = 'text'): AIProviderConfig[] {
  const mode = process.env.AI_ROUTER_MODE || 'free-first'

  const providers: AIProviderConfig[] = [
    {
      id: 'gemini',
      label: 'Gemini',
      mode: 'free',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      enabled: hasKey(process.env.GEMINI_API_KEY),
      priority: 10,
      taskTypes: ['text', 'prompt', 'code', 'strategy', 'vision'],
    },
    {
      id: 'groq',
      label: 'Groq',
      mode: 'free',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      enabled: hasKey(process.env.GROQ_API_KEY),
      priority: 20,
      taskTypes: ['text', 'prompt', 'code', 'strategy'],
    },
    {
      id: 'openrouter-free',
      label: 'OpenRouter Free',
      mode: 'free',
      model: process.env.OPENROUTER_FREE_MODEL || 'openrouter/free',
      enabled: hasKey(process.env.OPENROUTER_API_KEY),
      priority: 30,
      taskTypes: ['text', 'prompt', 'code', 'strategy'],
    },
    {
      id: 'openrouter-claude',
      label: 'OpenRouter Claude',
      mode: 'cheap',
      model: process.env.OPENROUTER_CLAUDE_MODEL || 'anthropic/claude-sonnet-4',
      enabled: hasKey(process.env.OPENROUTER_API_KEY),
      priority: 80,
      taskTypes: ['text', 'prompt', 'code', 'strategy', 'vision'],
    },
    {
      id: 'openrouter-gpt',
      label: 'OpenRouter GPT',
      mode: 'cheap',
      model: process.env.OPENROUTER_GPT_MODEL || 'openai/gpt-4.1-mini',
      enabled: hasKey(process.env.OPENROUTER_API_KEY),
      priority: 90,
      taskTypes: ['text', 'prompt', 'code', 'strategy', 'vision'],
    },
    {
      id: 'together',
      label: 'Together',
      mode: 'cheap',
      model: process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      enabled: hasKey(process.env.TOGETHER_API_KEY),
      priority: 100,
      taskTypes: ['text', 'prompt', 'code', 'strategy'],
    },
  ]

  return providers
    .filter((provider) => provider.enabled)
    .filter((provider) => provider.taskTypes.includes(taskType))
    .filter((provider) => {
      if (mode === 'free-only') return provider.mode === 'free'
      if (mode === 'free-first') return provider.mode === 'free' || provider.mode === 'cheap'
      if (mode === 'premium') return true
      return provider.mode === 'free'
    })
    .sort((a, b) => a.priority - b.priority)
}
