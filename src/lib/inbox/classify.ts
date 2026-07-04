export const INBOX_NOTE_TYPES = [
  'note',
  'idea',
  'link',
  'reference',
  'quote',
  'reminder',
] as const

export type InboxNoteType = (typeof INBOX_NOTE_TYPES)[number]

export const INBOX_NOTE_LABELS: Record<InboxNoteType, string> = {
  note: 'Nota',
  idea: 'Idea',
  link: 'Link',
  reference: 'Reference',
  quote: 'Citazione',
  reminder: 'Promemoria',
}

export function classifyInboxItem(input: {
  content?: string | null
  url?: string | null
  imageUrl?: string | null
}): InboxNoteType {
  const text = (input.content || '').trim()
  const normalized = text.toLocaleLowerCase('it-IT')

  if (input.imageUrl) return 'reference'
  if (input.url || /https?:\/\/[^\s<>"']+/i.test(text)) return 'link'
  if (
    (/^["“«][\s\S]+["”»]$/.test(text) ||
      normalized.startsWith('citazione:')) &&
    text.length > 4
  ) {
    return 'quote'
  }
  if (
    /\b(ricorda|ricordarmi|promemoria|non dimenticare|da fare|chiamare|comprare)\b/i.test(
      text
    )
  ) {
    return 'reminder'
  }
  if (
    /\b(idea|spunto|concept|potremmo|vorrei|immagina|proposta|intuizione)\b/i.test(
      text
    )
  ) {
    return 'idea'
  }
  return 'note'
}
