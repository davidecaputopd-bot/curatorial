export const GROW_SKILL_IDS = [
  'saved-memory',
  'taste-curator',
  'creative-director',
  'content-strategist',
  'research-scout',
  'market-analyst',
  'daily-editor',
] as const

export type GrowSkillId = (typeof GROW_SKILL_IDS)[number]

export type GrowPreferredTool =
  | 'search_saved_content'
  | 'market_forecast'
  | 'get_operational_context'
  | 'web_search'

export type GrowSkill = {
  id: GrowSkillId
  label: string
  description: string
  preferredTool?: GrowPreferredTool
  allowedTools: readonly string[]
  instructions: readonly string[]
  outputContract: readonly string[]
  priority: number
  triggers: readonly RegExp[]
}

const GROW_SKILLS: readonly GrowSkill[] = [
  {
    id: 'saved-memory',
    label: 'Memoria dei salvati',
    description:
      'Ritrova materiali reali nella Inbox, nei salvati social e nell’Archivio senza inventare dettagli visivi.',
    preferredTool: 'search_saved_content',
    allowedTools: ['search_saved_content'],
    instructions: [
      'Cerca prima nella memoria personale reale di Davide, non sul web.',
      'Interpreta la ricerca per concetto, tecnica, atmosfera e intenzione; non limitarti alle parole esatte.',
      'Distingui elementi compresi da elementi con metadati insufficienti.',
      'Non collegare automaticamente un salvato a un cliente.',
    ],
    outputContract: [
      'Restituisci pochi risultati forti e spiega in una riga perché ciascuno è pertinente.',
      'Se non trovi abbastanza materiale, dichiaralo; non sostituirlo silenziosamente con risultati web.',
    ],
    priority: 110,
    triggers: [
      /\b(nei miei|dai miei|tra i miei)\s+(salvat[ioe]|preferit[ioe]|reference|materiali)\b/i,
      /\b(trova|cerca|ritrova|recupera|mostrami)\b.{0,70}\b(salvat[ioe]|archivio|inbox|instagram|tiktok)\b/i,
      /\b(avevo salvato|ho salvato|mi ero salvato|ricordi quella)\b/i,
    ],
  },
  {
    id: 'market-analyst',
    label: 'Analisi di mercato',
    description:
      'Valuta concept e posizionamenti con segnali recenti, scenari e rischio esplicito, senza vendere certezze.',
    preferredTool: 'market_forecast',
    allowedTools: ['market_forecast', 'web_search', 'fetch_webpage'],
    instructions: [
      'Separa fatti trovati, sentiment grezzo, interpretazione e raccomandazione.',
      'Valuta desiderabilità, distintività, credibilità del brand, timing, saturazione e fattibilità produttiva.',
      'Una percentuale è soltanto una stima qualitativa: accompagna sempre con confidenza e limiti.',
      'Cerca segnali contrari all’ipotesi, non soltanto conferme.',
    ],
    outputContract: [
      'Verdetto netto, probabilità qualitativa, due segnali favorevoli, due rischi, una correzione e un test economico.',
      'Cita 2–4 fonti quando viene usata ricerca esterna.',
    ],
    priority: 105,
    triggers: [
      /\b(previsione|prevedi|forecast|probabilit[àa]|successo|insuccesso|flop)\b/i,
      /\b(funzioner[àa]|pu[oò] funzionare|rischio)\b.{0,60}\b(mercato|campagna|lancio|contenuto|reel|brand|prodotto)\b/i,
      /\b(posizionamento|domanda di mercato|saturazione|competitor|target)\b/i,
    ],
  },
  {
    id: 'daily-editor',
    label: 'Editor quotidiano',
    description:
      'Riduce il contesto operativo a una priorità, due mosse e una cosa da ignorare.',
    preferredTool: 'get_operational_context',
    allowedTools: [
      'get_operational_context',
      'list_calendar_items',
      'list_inbox_items',
      'get_monthly_output_summary',
    ],
    instructions: [
      'Leggi lo stato reale prima di consigliare cosa fare.',
      'Proteggi attenzione e capacità produttiva di una persona sola.',
      'Non trasformare tutta la Inbox in una lista di compiti.',
      'Preferisci chiudere, riprogrammare o ignorare prima di aggiungere lavoro.',
    ],
    outputContract: [
      'Una priorità, massimo due azioni utili e una cosa da non fare.',
      'Se proponi una modifica, proponine soltanto una alla volta e lasciala in conferma.',
    ],
    priority: 100,
    triggers: [
      /\b(cosa faccio|che faccio|da dove riparto|priorit[àa]|organizza|riordina)\b/i,
      /\b(oggi|domani|questa settimana|in sospeso|arretrati|da chiudere)\b/i,
      /\b(continua|continuiamo|migliora tutto|situazione|stato del lavoro)\b/i,
    ],
  },
  {
    id: 'research-scout',
    label: 'Ricerca verificata',
    description:
      'Ricerca in inglese su fonti autorevoli, creative e community pubbliche, poi sintetizza in italiano.',
    preferredTool: 'web_search',
    allowedTools: ['web_search', 'fetch_webpage', 'project_radar'],
    instructions: [
      'Formula query precise in inglese, mantenendo nomi propri e contesto italiano quando rilevanti.',
      'Per una ricerca strategica triangola fonti autorevoli, case study creativi e community pubbliche.',
      'Reddit e forum sono sentiment grezzo; Discord vale soltanto quando una pagina è pubblica e indicizzata.',
      'Cerca fonti recenti per fatti instabili e apri la pagina originale quando lo snippet non basta.',
    ],
    outputContract: [
      'Sintetizza il segnale, perché conta per Davide e quale decisione modifica.',
      'Cita 2–4 fonti e segnala conflitti o buchi informativi.',
    ],
    priority: 90,
    triggers: [
      /\b(cerca|ricerca|studia|verifica|indaga|trova)\b.{0,50}\b(online|web|internet|forum|reddit|fonti|trend|campagne|mercato)\b/i,
      /\b(ultim[oaie]|recent[ei]|attuale|aggiornat[oaie]|novit[àa]|trend)\b/i,
      /\b(radar|segnali recenti|community|sentiment)\b/i,
    ],
  },
  {
    id: 'taste-curator',
    label: 'Curatore del gusto',
    description:
      'Legge ricorrenze e tensioni nel gusto di Davide senza ridurle a tag o assegnarle subito a un cliente.',
    preferredTool: 'search_saved_content',
    allowedTools: ['search_saved_content'],
    instructions: [
      'Cerca ricorrenze in luce, colore, composizione, tipografia, ritmo, materia, atmosfera e tecnica.',
      'Mantieni separati gusto personale, nutrimento creativo e utilità lavorativa.',
      'Applica la regola 80% coerenza e 20% caos: il contrasto deve aprire possibilità, non creare rumore casuale.',
      'Non dichiarare di aver visto dettagli che non sono presenti nei dati o nelle immagini realmente fornite.',
    ],
    outputContract: [
      'Nomina il pattern, mostra le prove, individua una tensione interessante e suggerisci un esperimento.',
      'Evita aggettivi generici come bello, premium, elegante se non spieghi attraverso quali scelte visive.',
    ],
    priority: 85,
    triggers: [
      /\b(mio gusto|gusto visivo|profilo visivo|cosa mi piace|estetica|linguaggio visivo)\b/i,
      /\b(pattern|ricorren[zt]|connession[ei]|filo comune|ossession[ei])\b.{0,60}\b(salvat[ioe]|reference|immagini|video)\b/i,
      /\b(80%|ottanta per cento)\b.{0,30}\b(caos|coerenza|gusto)\b/i,
    ],
  },
  {
    id: 'creative-director',
    label: 'Direzione creativa',
    description:
      'Trasforma reference e vincoli in un principio creativo producibile, non in moodboard verbale.',
    allowedTools: [
      'search_saved_content',
      'fetch_webpage',
      'generate_image',
    ],
    instructions: [
      'Parti da obiettivo, pubblico, percezione desiderata e vincoli reali.',
      'Estrai principi trasferibili dalle reference; non copiarne la superficie.',
      'Valuta gerarchia, composizione, tipografia, luce, colore, ritmo e comportamento del brand.',
      'Proteggi loghi, etichette e identità reali: non promettere fedeltà se il modello non può garantirla.',
    ],
    outputContract: [
      'Una direzione centrale, tre regole visive, una cosa da evitare e un prossimo prototipo concreto.',
      'Quando confronti reference, esplicita cosa condividono, dove divergono e cosa conviene trattenere.',
    ],
    priority: 80,
    triggers: [
      /\b(direzione creativa|art direction|concept|moodboard|visual system|identit[àa] visiva)\b/i,
      /\b(confronta|analizza|trasforma|sviluppa)\b.{0,50}\b(reference|immagin[ei]|video|visual|salvat[ioe])\b/i,
      /\b(composizione|tipografia|palette|luce|fotografia|packaging|etichetta|logo)\b/i,
    ],
  },
  {
    id: 'content-strategist',
    label: 'Strategia contenuti',
    description:
      'Progetta contenuti nativi per obiettivo, pubblico, canale e capacità produttiva reale.',
    allowedTools: [
      'get_operational_context',
      'search_saved_content',
      'web_search',
      'create_calendar_item',
    ],
    instructions: [
      'Distingui contenuti che rispondono a una domanda esistente da contenuti condivisibili perché portano una prospettiva originale.',
      'Adatta struttura, apertura, ritmo e CTA al canale; non riciclare lo stesso testo ovunque.',
      'Non creare un piano enorme: considera tempo, budget, materiale disponibile e frequenza sostenibile.',
      'Collega una reference a un progetto soltanto quando Davide lo chiede o il nesso è esplicito.',
    ],
    outputContract: [
      'Obiettivo, insight, formato, apertura, sviluppo, CTA, materiale necessario e metrica da osservare.',
      'Per una serie editoriale proponi massimo tre idee ordinate per impatto e sforzo.',
    ],
    priority: 75,
    triggers: [
      /\b(piano contenuti|strategia contenuti|content strategy|calendario editoriale|rubrica)\b/i,
      /\b(reel|carosello|post|storia|caption|copy|hook|cta|instagram|tiktok)\b/i,
      /\b(cosa pubblicare|idea post|idea contenuto|social strategy)\b/i,
    ],
  },
]

function scoreSkill(skill: GrowSkill, message: string) {
  const hits = skill.triggers.reduce(
    (count, trigger) => count + (trigger.test(message) ? 1 : 0),
    0
  )
  return hits ? skill.priority + hits * 20 : 0
}

export function selectGrowSkills(message: string, limit = 2) {
  return GROW_SKILLS.map((skill) => ({
    skill,
    score: scoreSkill(skill, message),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit))
    .map((entry) => entry.skill)
}

export function buildGrowSkillsPrompt(skills: readonly GrowSkill[]) {
  if (!skills.length) return ''

  return [
    'SKILL ATTIVE PER QUESTA RICHIESTA:',
    'Usa solo le istruzioni pertinenti qui sotto. Le skill guidano il ragionamento ma non autorizzano azioni o strumenti diversi da quelli elencati.',
    ...skills.map((skill) =>
      [
        `\n## ${skill.label} [${skill.id}]`,
        skill.description,
        `Strumenti consentiti: ${skill.allowedTools.join(', ') || 'nessuno'}.`,
        'Metodo:',
        ...skill.instructions.map((instruction) => `- ${instruction}`),
        'Contratto di risposta:',
        ...skill.outputContract.map((rule) => `- ${rule}`),
      ].join('\n')
    ),
  ].join('\n')
}

export function listGrowSkills() {
  return GROW_SKILLS.map(
    ({ id, label, description, preferredTool, allowedTools }) => ({
    id,
    label,
    description,
    preferredTool,
    allowedTools,
    })
  )
}
