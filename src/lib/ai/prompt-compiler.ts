import { explainEngineChoice, getEngine } from './engine-registry'
import { projectRules } from './production-planner'
import type {
  ProductionEngine,
  ProductionPlan,
} from './production-types'

export type PromptCompilerInput = {
  plan: ProductionPlan
  brief: string
  reference?: string
  format?: string
}

export type CompiledPrompt = {
  engine: ProductionEngine
  title: string
  access: 'manual' | 'local' | 'api'
  url: string | null
  why_this_engine: string
  prompt: string
  negative_prompt?: string
  workflow_note?: string
  checklist: string[]
  copy_button_label: string
  open_button_label: string
}

export type PromptCompilerOutput = {
  prompts: CompiledPrompt[]
}

type PromptParts = Pick<
  CompiledPrompt,
  'title' | 'prompt' | 'negative_prompt' | 'workflow_note' | 'checklist'
>

function clean(value: string | undefined, fallback: string) {
  return value?.trim() || fallback
}

function accessFor(engine: ProductionEngine): CompiledPrompt['access'] {
  const capability = getEngine(engine)
  if (capability.requires_local_worker) return 'local'
  if (capability.requires_manual_action) return 'manual'
  return 'api'
}

function commonContext(input: PromptCompilerInput) {
  return {
    project: input.plan.project,
    assetType: input.plan.asset_type,
    brief: clean(input.brief, input.plan.title),
    reference: clean(
      input.reference,
      input.plan.needs_reference
        ? 'REFERENCE REQUIRED — select an approved asset before generation.'
        : 'No additional reference supplied.'
    ),
    format: clean(
      input.format,
      input.plan.asset_type === 'video' ? '9:16 vertical social video' : '4:5 social asset'
    ),
    rules: projectRules(input.plan.project).map((rule) => `- ${rule}`).join('\n'),
  }
}

function compileForEngine(
  engine: ProductionEngine,
  input: PromptCompilerInput
): PromptParts {
  const { project, assetType, brief, reference, format, rules } = commonContext(input)

  if (engine === 'pollinations') {
    return {
      title: 'GROW FLUX · generazione interna',
      prompt: `
Create a client-ready ${assetType} for ${project}, formatted as ${format}.

SUBJECT AND OBJECTIVE
${brief}

REFERENCE AND CONSTRAINTS
${reference}

ART DIRECTION
Premium editorial composition, intentional negative space, realistic materials, controlled natural light, coherent perspective, refined Mediterranean color palette, tactile detail, clean commercial finish. Preserve the subject proportions and leave protected space for original brand assets.

PROJECT RULES
${rules}
`.trim(),
      negative_prompt:
        'invented logo, fake label, unreadable text, warped typography, deformed product, duplicate objects, plastic materials, generic stock photo, clutter, watermark, low resolution, AI artifacts',
      workflow_note:
        'GROW esegue questo prompt internamente con FLUX. Verifica sempre testo, logo ed etichette prima dell’uso cliente.',
      checklist: [
        'Composizione specifica e non generica.',
        'Prodotto e materiali credibili.',
        'Nessun marchio o testo inventato usato come definitivo.',
        'Output adatto al formato richiesto.',
      ],
    }
  }

  if (engine === 'higgsfield') {
    return {
      title: 'Higgsfield · social video',
      prompt: `
Create a premium social video for ${project}.

FORMAT
${format || '9:16 vertical social video'}

PRODUCTION BRIEF
${brief}

APPROVED REFERENCE
${reference}

DIRECTION
Preserve the exact identity and proportions of the main subject throughout the clip. Premium Mediterranean art direction, natural cinematic light, refined editorial pacing, controlled camera motion and a physically plausible environment.

CAMERA
Use one deliberate movement only: a slow push-in, subtle orbit or smooth tracking shot. Stable framing, coherent perspective and continuous subject geometry.

ENDING
Finish with a clean brand moment. Hold the final composition long enough for a separate, accurate logo overlay in post-production. Do not invent or redraw brand typography.

PROJECT RULES
${rules}
`.trim(),
      negative_prompt:
        'flicker, morphing, subject replacement, bottle deformation, label deformation, logo distortion, invented text, unreadable typography, extra objects, chaotic camera, jump cuts, plastic surfaces, cheap advertising look, watermark, AI artifacts',
      workflow_note:
        'Genera nel tool esterno. Per loghi ed etichette usa un finale pulito e applica l’asset originale in post-produzione.',
      checklist: [
        'Soggetto stabile dall’inizio alla fine.',
        'Una sola camera move leggibile.',
        'Nessuna deformazione di logo, bottiglia o etichetta.',
        'Finale brand pulito e montabile.',
        'Formato 9:16 e output senza watermark.',
      ],
    }
  }

  if (engine === 'luma') {
    return {
      title: 'Luma · image-to-video',
      prompt: `
Animate the approved reference into a refined image-to-video shot for ${project}.

FORMAT
${format}

REFERENCE
${reference}

MOTION BRIEF
${brief}

Use a slow cinematic push-in with subtle natural parallax. Keep the main subject locked, stable and faithful to the source image. Add only physically plausible secondary motion such as soft light changes, restrained foliage movement or gentle reflections. Preserve composition, materials, color palette and product proportions.

PROJECT RULES
${rules}
`.trim(),
      negative_prompt:
        'logo warping, text warping, label changes, subject drift, morphing, flicker, camera shake, dramatic zoom, scene replacement, surreal motion, duplicated objects, watermark',
      workflow_note:
        'Carica prima una reference già approvata. Luma deve animarla, non ridisegnare il prodotto.',
      checklist: [
        'Reference rispettata nella prima e ultima frame.',
        'Movimento naturale e non invasivo.',
        'Soggetto e marchio non cambiano forma.',
        'Clip utilizzabile nel montaggio reale.',
      ],
    }
  }

  if (engine === 'ltx-local') {
    return {
      title: 'LTX locale · test video',
      prompt: `
Short ${format} video for ${project}. ${brief}

One clear subject. One simple action. One slow camera push-in. Stable composition, realistic light, restrained premium editorial mood, natural movement, consistent subject, clean final frame.

Reference direction: ${reference}

${rules}
`.trim(),
      negative_prompt:
        'complex crowd, multiple actions, fast cuts, text, detailed logo generation, flicker, morphing, deformed product, unstable camera, watermark',
      workflow_note:
        'Riduci la scena a soggetto + azione + movimento camera. Esegui varianti brevi sul worker locale; testo e logo complessi vanno aggiunti in post.',
      checklist: [
        'Scena abbastanza semplice per un test locale.',
        'Durata breve e movimento unico.',
        'Nessun testo o logo affidato al modello.',
        'Worker locale configurato prima dell’esecuzione.',
      ],
    }
  }

  if (engine === 'comfyui') {
    return {
      title: 'ComfyUI · FLUX/SDXL',
      prompt: `
Professional ${assetType} production for ${project}, ${format}.

POSITIVE PROMPT
${brief}. Use the approved reference for identity, proportions, materials and art direction: ${reference}. Premium editorial composition, controlled realistic lighting, accurate surfaces, deliberate negative space, client-ready detail, coherent perspective, clean edges, natural color separation.

PROJECT RULES
${rules}
`.trim(),
      negative_prompt:
        'invented logo, fake label, unreadable text, warped typography, deformed bottle, duplicate product, bad reflections, plastic texture, cheap stock photography, clutter, low resolution, watermark, oversharpening, AI artifacts',
      workflow_note:
        'Workflow template required: txt2img, img2img, inpainting, controlnet or product mockup. Use img2img/ControlNet for geometry; inpaint only masked areas; composite real label/logo after generation.',
      checklist: [
        'Workflow scelto in base al tipo di controllo necessario.',
        'Reference e asset originali collegati ai nodi corretti.',
        'Seed e impostazioni salvati per la riproducibilità.',
        'Logo ed etichetta verificati al 100%.',
        'Worker locale disponibile.',
      ],
    }
  }

  if (engine === 'recraft') {
    return {
      title: 'Recraft · design system',
      prompt: `
Create a refined ${assetType} visual system for ${project}.

BRIEF
${brief}

FORMAT
${format}

REFERENCE AND CONSTRAINTS
${reference}

Build a controlled composition with clear hierarchy, intentional negative space, premium editorial balance, a restrained color system and reusable graphic logic. Treat the reference as art direction, not material to copy. Keep brand assets as protected placeholders and leave space for accurate manual placement.

PROJECT RULES
${rules}
`.trim(),
      negative_prompt:
        'generic template, invented brand marks, fake typography, unreadable copy, random icons, excessive gradients, visual clutter, cheap social media style, watermark',
      workflow_note:
        'Usa Recraft per composizione e sistema visuale. Controlla testo, font e marchi manualmente prima della consegna.',
      checklist: [
        'Gerarchia visiva chiara.',
        'Sistema riusabile su più formati.',
        'Testo verificato e corretto manualmente.',
        'Logo originale applicato senza reinterpretazioni.',
      ],
    }
  }

  if (engine === 'ideogram') {
    return {
      title: 'Ideogram · typography',
      prompt: `
Design a ${format} ${assetType} for ${project} where readable typography is the primary requirement.

EXACT HEADLINE OR COPY
${brief}

ART DIRECTION
${reference}

Create a strong editorial hierarchy, generous spacing, controlled contrast and a premium contemporary composition. Keep the supplied wording exact. Reserve a clean protected area for the original logo; do not recreate it.

PROJECT RULES
${rules}
`.trim(),
      negative_prompt:
        'misspelled words, extra text, invented logo, fake font, illegible letters, decorative clutter, generic AI poster, watermark',
      workflow_note:
        'Ideogram è utile quando la leggibilità è centrale. Font proprietari e loghi reali devono comunque essere sostituiti con gli originali.',
      checklist: [
        'Headline identica al testo approvato.',
        'Nessuna parola aggiunta.',
        'Font e logo sostituiti con asset reali se necessario.',
        'Layout leggibile nel formato finale.',
      ],
    }
  }

  if (engine === 'photoshop' || engine === 'firefly') {
    return {
      title: `${engine === 'photoshop' ? 'Photoshop' : 'Firefly'} · rifinitura`,
      prompt: `
COMPOSITING BRIEF — ${project}

OUTPUT
${format} ${assetType}

OBJECTIVE
${brief}

SOURCE / REFERENCE
${reference}

Preserve the original product geometry, approved label, logo, typography and brand colors exactly. Use generative fill only for background extension, controlled cleanup or non-brand environmental details. Match perspective, grain, depth of field, light direction, reflections and contact shadows.

PROJECT RULES
${rules}
`.trim(),
      negative_prompt:
        'redesigned label, regenerated logo, altered typography, changed product proportions, mismatched perspective, floating object, inconsistent shadow, plastic material, watermark',
      workflow_note:
        'Maschera e compositing manuale. Logo, label e typography devono provenire dai file originali, non dalla generazione.',
      checklist: [
        'Label e logo sono asset originali.',
        'Prospettiva, luce e ombre coincidono.',
        'Bordi e riflessi reggono al 100% di zoom.',
        'File finale organizzato e modificabile.',
      ],
    }
  }

  if (engine === 'kling' || engine === 'runway') {
    return {
      title: `${getEngine(engine).label} · video`,
      prompt: `
Produce a premium ${format} video for ${project}.

BRIEF
${brief}

APPROVED REFERENCE
${reference}

Keep one stable subject, physically plausible motion, controlled cinematic lighting and a refined editorial pace. Use a single smooth camera movement. Preserve product proportions and end on a clean composition ready for accurate brand graphics in post.

PROJECT RULES
${rules}
`.trim(),
      negative_prompt:
        'flicker, morphing, logo distortion, label changes, invented text, unstable subject, chaotic motion, random cuts, watermark, AI artifacts',
      workflow_note:
        'Esecuzione nel tool esterno. Non affidare logo o testo finale al modello.',
      checklist: [
        'Reference rispettata.',
        'Movimento coerente.',
        'Finale adatto al compositing del brand.',
        'Costo confermato prima della generazione.',
      ],
    }
  }

  return {
    title: `${getEngine(engine).label} · production brief`,
    prompt: `
PROJECT: ${project}
ASSET: ${assetType}
FORMAT: ${format}

OBJECTIVE
${brief}

SELECTED REFERENCE
${reference}

Build a concrete, production-ready response with explicit deliverables, constraints, assumptions and quality checks. Do not promise media generation unless the configured engine can execute it.

PROJECT RULES
${rules}
`.trim(),
    workflow_note:
      'Output API eseguibile da GROW per testo e pianificazione; gli asset media restano su tool o worker dedicati.',
    checklist: [
      'Output aderente al brief.',
      'Vincoli progetto applicati.',
      'Nessuna capacità tecnica inventata.',
      'Prossimo passo esplicito.',
    ],
  }
}

export function compileProductionPrompts(
  input: PromptCompilerInput
): PromptCompilerOutput {
  const requestedEngines = input.plan.prompts_to_compile.length
    ? input.plan.prompts_to_compile
    : [input.plan.recommended_engine, ...input.plan.alternatives.slice(0, 2)]
  const uniqueEngines = [...new Set(requestedEngines)]

  return {
    prompts: uniqueEngines.map((engine) => {
      const capability = getEngine(engine)
      const compiled = compileForEngine(engine, input)

      return {
        engine,
        ...compiled,
        access: accessFor(engine),
        url: capability.url,
        why_this_engine: explainEngineChoice(engine, input.plan),
        copy_button_label: 'Copia prompt',
        open_button_label:
          capability.requires_local_worker
            ? 'Apri documentazione'
            : capability.requires_manual_action
              ? 'Apri tool'
              : 'Usa in GROW',
      }
    }),
  }
}
