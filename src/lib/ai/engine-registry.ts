import type {
  EngineCapability,
  ProductionAssetType,
  ProductionEngine,
  ProductionPlan,
} from './production-types'

export const ENGINE_REGISTRY: Record<ProductionEngine, EngineCapability> = {
  'grow-ai': {
    engine: 'grow-ai',
    label: 'GROW AI',
    mode: 'text_only',
    access: 'available',
    asset_types: ['copy', 'strategy', 'carousel', 'calendar_plan', 'workflow'],
    strengths: ['Pianificazione', 'Contesto GROW', 'Orchestrazione e prompt'],
    weaknesses: ['Non genera direttamente asset visuali'],
    can_execute_server_side: true,
    requires_local_worker: false,
    requires_manual_action: false,
    url: null,
    cost_mode: 'free-tier',
    quality_tier: 'high',
  },
  gemini: {
    engine: 'gemini',
    label: 'Gemini',
    mode: 'api_free',
    access: 'available',
    asset_types: ['copy', 'strategy', 'carousel', 'reference', 'calendar_plan', 'workflow'],
    strengths: ['Analisi', 'Strategia', 'Prompt strutturati'],
    weaknesses: ['Quota free-tier variabile'],
    can_execute_server_side: true,
    requires_local_worker: false,
    requires_manual_action: false,
    url: 'https://aistudio.google.com/',
    cost_mode: 'free-tier',
    quality_tier: 'high',
  },
  groq: {
    engine: 'groq',
    label: 'Groq',
    mode: 'api_free',
    access: 'available',
    asset_types: ['copy', 'strategy', 'carousel', 'calendar_plan', 'workflow'],
    strengths: ['Risposte rapide', 'Planning e compilazione prompt'],
    weaknesses: ['Non produce immagini o video'],
    can_execute_server_side: true,
    requires_local_worker: false,
    requires_manual_action: false,
    url: 'https://console.groq.com/',
    cost_mode: 'free-tier',
    quality_tier: 'good',
  },
  'openrouter-free': {
    engine: 'openrouter-free',
    label: 'OpenRouter Free',
    mode: 'api_free',
    access: 'available',
    asset_types: ['copy', 'strategy', 'carousel', 'calendar_plan', 'workflow'],
    strengths: ['Fallback multi-modello', 'Costo nullo quando disponibile'],
    weaknesses: ['Disponibilità e limiti dei modelli possono cambiare'],
    can_execute_server_side: true,
    requires_local_worker: false,
    requires_manual_action: false,
    url: 'https://openrouter.ai/',
    cost_mode: 'free',
    quality_tier: 'good',
  },
  'openrouter-cheap': {
    engine: 'openrouter-cheap',
    label: 'OpenRouter Cheap',
    mode: 'api_cheap',
    access: 'future',
    asset_types: ['copy', 'strategy', 'carousel', 'calendar_plan', 'workflow'],
    strengths: ['Routing economico', 'Ampia scelta di modelli'],
    weaknesses: ['Richiede budget API e configurazione'],
    can_execute_server_side: false,
    requires_local_worker: false,
    requires_manual_action: false,
    url: 'https://openrouter.ai/',
    cost_mode: 'cheap',
    quality_tier: 'high',
  },
  comfyui: {
    engine: 'comfyui',
    label: 'ComfyUI',
    mode: 'local_worker',
    access: 'local',
    asset_types: ['image', 'mockup', 'workflow'],
    strengths: ['Controllo workflow', 'FLUX/SDXL locale', 'Inpainting e ControlNet'],
    weaknesses: ['Richiede worker locale configurato e hardware adeguato'],
    can_execute_server_side: false,
    requires_local_worker: true,
    requires_manual_action: false,
    url: 'https://www.comfy.org/',
    cost_mode: 'free',
    quality_tier: 'high',
  },
  'ltx-local': {
    engine: 'ltx-local',
    label: 'LTX Video locale',
    mode: 'local_worker',
    access: 'local',
    asset_types: ['video', 'workflow'],
    strengths: ['Test video locali', 'Nessun costo per generazione'],
    weaknesses: ['Richiede worker locale e scene meno complesse'],
    can_execute_server_side: false,
    requires_local_worker: true,
    requires_manual_action: false,
    url: 'https://github.com/Lightricks/LTX-Video',
    cost_mode: 'free',
    quality_tier: 'good',
  },
  higgsfield: {
    engine: 'higgsfield',
    label: 'Higgsfield',
    mode: 'manual_tool',
    access: 'manual',
    asset_types: ['video'],
    strengths: ['Video social', 'Camera motion', 'Look premium'],
    weaknesses: ['Tool esterno credit-based', 'Possibili deformazioni di logo e testo'],
    can_execute_server_side: false,
    requires_local_worker: false,
    requires_manual_action: true,
    url: 'https://higgsfield.ai/',
    cost_mode: 'premium',
    quality_tier: 'premium',
  },
  luma: {
    engine: 'luma',
    label: 'Luma Dream Machine',
    mode: 'manual_tool',
    access: 'manual',
    asset_types: ['video'],
    strengths: ['Image-to-video', 'Movimenti naturali'],
    weaknesses: ['Tool esterno', 'Testo e loghi possono deformarsi'],
    can_execute_server_side: false,
    requires_local_worker: false,
    requires_manual_action: true,
    url: 'https://lumalabs.ai/dream-machine',
    cost_mode: 'free-tier',
    quality_tier: 'high',
  },
  kling: {
    engine: 'kling',
    label: 'Kling',
    mode: 'manual_tool',
    access: 'manual',
    asset_types: ['video'],
    strengths: ['Video realistico', 'Buona dinamica'],
    weaknesses: ['Tool esterno credit-based', 'Tempi e quote variabili'],
    can_execute_server_side: false,
    requires_local_worker: false,
    requires_manual_action: true,
    url: 'https://klingai.com/',
    cost_mode: 'free-tier',
    quality_tier: 'high',
  },
  runway: {
    engine: 'runway',
    label: 'Runway',
    mode: 'premium_manual',
    access: 'manual',
    asset_types: ['video', 'image'],
    strengths: ['Suite video completa', 'Editing generativo'],
    weaknesses: ['Richiede tool esterno e può costare'],
    can_execute_server_side: false,
    requires_local_worker: false,
    requires_manual_action: true,
    url: 'https://runwayml.com/',
    cost_mode: 'premium',
    quality_tier: 'premium',
  },
  recraft: {
    engine: 'recraft',
    label: 'Recraft',
    mode: 'manual_tool',
    access: 'manual',
    asset_types: ['image', 'mockup', 'carousel'],
    strengths: ['Design system', 'Composizione', 'Grafica'],
    weaknesses: ['Testo e identità reali richiedono controllo manuale'],
    can_execute_server_side: false,
    requires_local_worker: false,
    requires_manual_action: true,
    url: 'https://www.recraft.ai/',
    cost_mode: 'free-tier',
    quality_tier: 'high',
  },
  ideogram: {
    engine: 'ideogram',
    label: 'Ideogram',
    mode: 'manual_tool',
    access: 'manual',
    asset_types: ['image', 'mockup', 'carousel'],
    strengths: ['Headline', 'Tipografia leggibile'],
    weaknesses: ['Non va usato per ricostruire font o loghi reali'],
    can_execute_server_side: false,
    requires_local_worker: false,
    requires_manual_action: true,
    url: 'https://ideogram.ai/',
    cost_mode: 'free-tier',
    quality_tier: 'high',
  },
  photoshop: {
    engine: 'photoshop',
    label: 'Adobe Photoshop',
    mode: 'premium_manual',
    access: 'manual',
    asset_types: ['image', 'mockup', 'carousel'],
    strengths: ['Compositing', 'Precisione etichette e logo', 'Rifinitura'],
    weaknesses: ['Lavoro manuale e licenza richiesta'],
    can_execute_server_side: false,
    requires_local_worker: false,
    requires_manual_action: true,
    url: 'https://photoshop.adobe.com/',
    cost_mode: 'premium',
    quality_tier: 'premium',
  },
  firefly: {
    engine: 'firefly',
    label: 'Adobe Firefly',
    mode: 'premium_manual',
    access: 'manual',
    asset_types: ['image', 'mockup'],
    strengths: ['Generative fill', 'Integrazione Adobe'],
    weaknesses: ['Crediti generativi e controllo manuale richiesti'],
    can_execute_server_side: false,
    requires_local_worker: false,
    requires_manual_action: true,
    url: 'https://firefly.adobe.com/',
    cost_mode: 'premium',
    quality_tier: 'high',
  },
  together: {
    engine: 'together',
    label: 'Together AI',
    mode: 'api_cheap',
    access: 'future',
    asset_types: ['copy', 'strategy', 'image', 'workflow'],
    strengths: ['API economica', 'Modelli open'],
    weaknesses: ['Esecuzione asset non ancora collegata a GROW'],
    can_execute_server_side: false,
    requires_local_worker: false,
    requires_manual_action: false,
    url: 'https://www.together.ai/',
    cost_mode: 'cheap',
    quality_tier: 'good',
  },
  fal: {
    engine: 'fal',
    label: 'fal',
    mode: 'premium_api',
    access: 'future',
    asset_types: ['image', 'video', 'mockup', 'workflow'],
    strengths: ['API media veloce', 'Ampio catalogo modelli'],
    weaknesses: ['Non configurato e a consumo'],
    can_execute_server_side: false,
    requires_local_worker: false,
    requires_manual_action: false,
    url: 'https://fal.ai/',
    cost_mode: 'premium',
    quality_tier: 'high',
  },
  replicate: {
    engine: 'replicate',
    label: 'Replicate',
    mode: 'api_cheap',
    access: 'future',
    asset_types: ['image', 'video', 'mockup', 'workflow'],
    strengths: ['API semplice', 'Modelli versionati'],
    weaknesses: ['Non configurato e costo per esecuzione'],
    can_execute_server_side: false,
    requires_local_worker: false,
    requires_manual_action: false,
    url: 'https://replicate.com/',
    cost_mode: 'cheap',
    quality_tier: 'good',
  },
}

export function getEngine(engine: ProductionEngine) {
  return ENGINE_REGISTRY[engine]
}

export function getEnginesForAsset(assetType: ProductionAssetType) {
  return Object.values(ENGINE_REGISTRY).filter((engine) =>
    engine.asset_types.includes(assetType)
  )
}

export function rankEnginesForPlan(plan: ProductionPlan) {
  const preferredOrder = [plan.recommended_engine, ...plan.alternatives]

  return getEnginesForAsset(plan.asset_type).sort((a, b) => {
    const preferredA = preferredOrder.indexOf(a.engine)
    const preferredB = preferredOrder.indexOf(b.engine)
    if (preferredA !== -1 || preferredB !== -1) {
      if (preferredA === -1) return 1
      if (preferredB === -1) return -1
      return preferredA - preferredB
    }

    const accessScore = { available: 0, local: 1, manual: 2, future: 3 }
    return accessScore[a.access] - accessScore[b.access]
  })
}

export function explainEngineChoice(engine: ProductionEngine, plan: ProductionPlan) {
  const capability = getEngine(engine)
  const execution = capability.can_execute_server_side
    ? 'Posso eseguirlo ora'
    : capability.requires_local_worker
      ? 'Richiede worker locale'
      : capability.requires_manual_action
        ? 'Richiede tool esterno'
        : 'Integrazione API futura'
  const cost =
    capability.cost_mode === 'free'
      ? 'Free/local'
      : capability.cost_mode === 'free-tier'
        ? 'Free-tier'
        : capability.cost_mode === 'cheap'
          ? 'API economica'
          : 'Costa/premium'

  return `${capability.label}: ${execution}. ${cost}. Scelto per ${plan.asset_type}: ${capability.strengths.join(', ')}.`
}
