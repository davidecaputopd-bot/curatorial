'use client'

import Link from 'next/link'
import {
  CheckCircle,
  FileArrowUp,
  InstagramLogo,
  TiktokLogo,
} from '@phosphor-icons/react'
import { useMemo, useRef, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import {
  detectCaptureSource,
  normalizeSharedUrl,
} from '@/lib/capture-input'

type ImportItem = {
  url: string
  source: string
  content?: string
  saved_at?: string
}

const URL_PATTERN = /https?:\/\/[^\s<>"'\\]+/gi

type ParsedUrl = {
  url: string
  saved_at?: string
}

function urlsFromValue(value: unknown, output: ParsedUrl[]) {
  if (typeof value === 'string') {
    output.push(...(value.match(URL_PATTERN) || []).map((url) => ({ url })))
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => urlsFromValue(item, output))
    return
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => urlsFromValue(item, output))
  }
}

async function urlsFromFile(file: File) {
  const text = await file.text()
  const urls: ParsedUrl[] = []
  const isTikTokText = file.name.toLocaleLowerCase('it-IT').endsWith('.txt')

  if (isTikTokText) {
    const entries = text.matchAll(
      /Data:\s*([^\r\n]+)\r?\nLink:\s*(https?:\/\/[^\s<>"'\\]+)/gi
    )
    for (const entry of entries) {
      const savedAt = new Date(entry[1].replace(/\s+UTC$/i, 'Z'))
      urls.push({
        url: entry[2],
        saved_at: Number.isNaN(savedAt.getTime())
          ? undefined
          : savedAt.toISOString(),
      })
    }
    if (urls.length) return urls
  }

  if (file.name.toLowerCase().endsWith('.json')) {
    try {
      urlsFromValue(JSON.parse(text), urls)
    } catch {
      urls.push(...(text.match(URL_PATTERN) || []).map((url) => ({ url })))
    }
  } else if (file.name.toLowerCase().endsWith('.html')) {
    const document = new DOMParser().parseFromString(text, 'text/html')
    document
      .querySelectorAll<HTMLAnchorElement>('a[href]')
      .forEach((anchor) => urls.push({ url: anchor.href }))
    urls.push(...(text.match(URL_PATTERN) || []).map((url) => ({ url })))
  } else {
    urls.push(...(text.match(URL_PATTERN) || []).map((url) => ({ url })))
  }

  return urls
}

function socialItem(value: ParsedUrl, fileName: string): ImportItem | null {
  const url = normalizeSharedUrl(value.url.replace(/[),.;!?]+$/, ''))
  if (!url) return null
  const source = detectCaptureSource(url)
  if (!['instagram', 'tiktok'].includes(source)) return null
  const liked = fileName.toLocaleLowerCase('it-IT').includes('mi-piace')
  return {
    url,
    source,
    saved_at: value.saved_at,
    content:
      source === 'tiktok'
        ? liked
          ? 'Mi piace su TikTok'
          : 'Video preferito su TikTok'
        : 'Salvato da Instagram',
  }
}

export default function ImportSavedPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<ImportItem[]>([])
  const [fileNames, setFileNames] = useState<string[]>([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [processed, setProcessed] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    imported: number
    duplicates: number
  } | null>(null)

  const counts = useMemo(
    () => ({
      instagram: items.filter((item) => item.source === 'instagram').length,
      tiktok: items.filter((item) => item.source === 'tiktok').length,
    }),
    [items]
  )

  const readFiles = async (files: FileList | File[]) => {
    setParsing(true)
    setError('')
    setResult(null)
    try {
      const selected = Array.from(files)
      const unique = new Map<string, ImportItem>()
      const parsedFiles = await Promise.all(
        selected.map(async (file) => ({
          name: file.name,
          urls: await urlsFromFile(file),
        }))
      )
      parsedFiles.forEach(({ name, urls }) => {
        urls.forEach((value) => {
          const item = socialItem(value, name)
          if (item) unique.set(item.url, item)
        })
      })
      setItems(
        [...unique.values()].sort((a, b) =>
          (b.saved_at || '').localeCompare(a.saved_at || '')
        )
      )
      setFileNames(selected.map((file) => file.name))
      if (!unique.size) {
        setError(
          'Non ho trovato link Instagram o TikTok. Estrai prima lo ZIP e scegli i file JSON, HTML o TXT.'
        )
      }
    } finally {
      setParsing(false)
    }
  }

  const importItems = async () => {
    if (!items.length || importing) return
    setImporting(true)
    setProcessed(0)
    setError('')
    try {
      let imported = 0
      let duplicates = 0
      const chunkSize = 200
      for (let index = 0; index < items.length; index += chunkSize) {
        const chunk = items.slice(index, index + chunkSize)
        const response = await fetch('/api/inbox/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Importazione fallita')
        imported += payload.imported || 0
        duplicates += payload.duplicates || 0
        setProcessed(Math.min(index + chunk.length, items.length))
      }
      setResult({
        imported,
        duplicates,
      })
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Importazione non riuscita'
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text lg:pb-12">
      <div className="mx-auto max-w-lg px-4 pt-10 lg:px-8">
        <header className="mb-8">
          <Link
            href="/impostazioni/cattura"
            className="text-[10px] font-black uppercase tracking-[0.16em] text-grow-muted"
          >
            ← Salva in GROW
          </Link>
          <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-grow-muted">
            Recupera il passato
          </p>
          <h1 className="mt-2 text-[38px] font-black uppercase leading-[0.88] tracking-tighter">
            Importa i salvati<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-grow-muted">
            Carica i file esportati dai tuoi account. L’analisi avviene nel
            browser; a GROW arrivano soltanto i link trovati.
          </p>
        </header>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".json,.html,.txt,text/plain,text/html,application/json"
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) {
              void readFiles(event.target.files)
            }
            event.target.value = ''
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            if (event.dataTransfer.files.length) {
              void readFiles(event.dataTransfer.files)
            }
          }}
          className="flex min-h-48 w-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/20 bg-white px-6 text-center transition active:scale-[0.99]"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-grow-yellow">
            <FileArrowUp size={25} weight="bold" />
          </span>
          <span className="mt-4 text-base font-black">
            {parsing ? 'Sto leggendo i file…' : 'Scegli i file esportati'}
          </span>
          <span className="mt-1 text-xs text-grow-muted">
            JSON, HTML o TXT · anche più file insieme
          </span>
        </button>

        {items.length > 0 && (
          <section className="mt-4 rounded-[1.5rem] bg-[#0F0F10] p-5 text-white">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
              Trovati in {fileNames.length} file
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/7 p-4">
                <InstagramLogo size={22} weight="bold" />
                <p className="mt-4 text-3xl font-black">{counts.instagram}</p>
                <p className="text-[10px] font-bold uppercase text-white/45">
                  Instagram
                </p>
              </div>
              <div className="rounded-2xl bg-white/7 p-4">
                <TiktokLogo size={22} weight="bold" />
                <p className="mt-4 text-3xl font-black">{counts.tiktok}</p>
                <p className="text-[10px] font-bold uppercase text-white/45">
                  TikTok
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={importing || Boolean(result)}
              onClick={() => void importItems()}
              className="mt-4 min-h-12 w-full rounded-full bg-grow-yellow px-5 text-sm font-black text-black disabled:opacity-55"
            >
              {importing
                ? `Importazione ${processed} / ${items.length}…`
                : result
                  ? 'Importazione completata'
                  : `Importa ${items.length} salvati`}
            </button>
          </section>
        )}

        {result && (
          <section className="mt-4 flex gap-3 rounded-[1.35rem] border border-black/10 bg-[#FFF7BE] p-4">
            <CheckCircle size={24} weight="fill" className="shrink-0" />
            <div>
              <p className="text-sm font-black">
                {result.imported} nuovi contenuti in Inbox.
              </p>
              <p className="mt-1 text-xs text-grow-muted">
                {result.duplicates} duplicati sono stati ignorati.
              </p>
              <Link
                href="/inbox"
                className="mt-3 inline-block text-[10px] font-black uppercase"
              >
                Apri Inbox →
              </Link>
            </div>
          </section>
        )}

        {error && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs leading-relaxed text-red-700">
            {error}
          </p>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
