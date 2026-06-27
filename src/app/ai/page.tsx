'use client'

import { useState, useRef, useEffect } from 'react'
import BottomNav from '@/components/BottomNav'

const font = "Inter, 'Helvetica Neue', system-ui, sans-serif"

type Message = {
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  generating?: boolean
}

const IMAGE_MODELS = [
  { id: 'black-forest-labs/flux-2-pro', label: 'FLUX 2 Pro', desc: 'Massima qualità' },
  { id: 'gpt-image-1.5', label: 'GPT Image 1.5', desc: 'Testi e composizioni' },
  { id: 'gemini-3-pro-image', label: 'Gemini 3 Pro', desc: 'Veloce e bilanciato' },
  { id: 'black-forest-labs/flux.1-schnell', label: 'FLUX Schnell', desc: 'Istantaneo' },
]

const QUICK = [
  'Dammi 3 hook per un Reel sul vino naturale salentino.',
  'Genera un\'immagine: studio creativo minimalista a Lecce, luce dorata.',
  'Che libri leggo per diventare creative director?',
  'Scrivimi una bio per Instagram da art director.',
  'Genera un\'immagine: brand identity per un vino salentino, editorial.',
  'Idee per una mia attività creativa da lanciare ora.',
]

declare global {
  interface Window {
    puter: any
  }
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [imgModel, setImgModel] = useState(IMAGE_MODELS[0].id)
  const [showModels, setShowModels] = useState(false)
  const [puterReady, setPuterReady] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://js.puter.com/v2/'
    script.onload = () => setPuterReady(true)
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/chat-history')
      const data = await res.json()
      if (data.messages?.length) {
        setMessages(data.messages)
      } else {
        setMessages([{
          role: 'assistant',
          content: 'Ciao Davide. Sono il tuo assistente creativo. Posso scrivere copy, generare immagini con FLUX 2 Pro o GPT Image, darti idee, analizzare brand. Cosa vuoi fare oggi?'
        }])
      }
    } catch {
      setMessages([{
        role: 'assistant',
        content: 'Ciao Davide. Sono il tuo assistente creativo. Cosa vuoi fare oggi?'
      }])
    }
    setHistoryLoaded(true)
  }

  const saveMessage = async (msg: Message) => {
    try {
      await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      })
    } catch {}
  }

  const isImageRequest = (text: string) => {
    const keywords = ['genera', 'crea', 'disegna', 'immagine', 'foto', 'visual', 'illustra', 'image', 'generate']
    return keywords.some(k => text.toLowerCase().includes(k))
  }

  const generateImage = async (prompt: string): Promise<string | null> => {
    if (!puterReady || !window.puter) return null
    try {
      const enhancedPrompt = `${prompt}, professional photography, high quality, editorial style, cinematic lighting`
      const imgElement = await window.puter.ai.txt2img(enhancedPrompt, {
        model: imgModel,
      })
      const canvas = document.createElement('canvas')
      canvas.width = imgElement.naturalWidth || 1024
      canvas.height = imgElement.naturalHeight || 1024
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(imgElement, 0, 0)
      return canvas.toDataURL('image/png')
    } catch (e) {
      console.error('Image gen error:', e)
      return null
    }
  }

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    saveMessage(userMsg)
    setInput('')
    setLoading(true)

    const needsImage = isImageRequest(text)

    if (needsImage && puterReady) {
      const placeholderIdx = messages.length + 1
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sto generando...',
        generating: true,
      }])

      try {
        const [chatRes, imageUrl] = await Promise.all([
          fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: messages.slice(-8) }),
          }).then(r => r.json()),
          generateImage(text),
        ])

        const assistantMsg: Message = {
          role: 'assistant',
          content: chatRes.reply || 'Ecco.',
          imageUrl: imageUrl || undefined,
        }
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = assistantMsg
          return updated
        })
        saveMessage(assistantMsg)
      } catch {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: 'Errore nella generazione.' }
          return updated
        })
      }
    } else {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: messages.slice(-8) }),
        })
        const data = await res.json()
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.reply || 'Nessuna risposta.',
          imageUrl: data.imageUrl,
        }
        setMessages(prev => [...prev, assistantMsg])
        saveMessage(assistantMsg)
      } catch {
        const errMsg: Message = { role: 'assistant', content: 'Errore. Riprova.' }
        setMessages(prev => [...prev, errMsg])
      }
    }

    setLoading(false)
  }

  const clearHistory = async () => {
    if (!confirm('Cancelli tutta la cronologia?')) return
    await fetch('/api/chat-history', { method: 'DELETE' })
    setMessages([{
      role: 'assistant',
      content: 'Cronologia cancellata. Ricominciamo. Cosa vuoi fare?'
    }])
  }

  const selectedModel = IMAGE_MODELS.find(m => m.id === imgModel)

  return (
    <main className="flex min-h-screen flex-col bg-grow-bg text-grow-text" style={{ fontFamily: font }}>
      <header className="sticky top-0 z-10 border-b border-grow-border bg-grow-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-grow-yellow text-grow-text font-black text-xs">AI</div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight">GROW<span className="text-grow-yellow">.</span>AI</h1>
              <p className="text-[10px] text-grow-muted">Llama 3.3 70B · {puterReady ? 'Generazione attiva' : 'Caricamento...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowModels(!showModels)}
                className="flex items-center gap-1.5 rounded-full border border-grow-border bg-grow-soft px-3 py-1.5 text-[11px] font-medium text-grow-text"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-grow-yellow" />
                {selectedModel?.label}
              </button>
              {showModels && (
                <div className="absolute right-0 top-8 z-50 w-52 rounded-2xl border border-grow-border bg-grow-card shadow-lg overflow-hidden">
                  {IMAGE_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setImgModel(m.id); setShowModels(false) }}
                      className={`w-full px-4 py-3 text-left border-b border-grow-border last:border-0 ${imgModel === m.id ? 'bg-grow-yellow' : 'hover:bg-grow-soft'}`}
                    >
                      <p className="text-xs font-bold text-grow-text">{m.label}</p>
                      <p className="text-[10px] text-grow-muted">{m.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={clearHistory} className="text-grow-muted hover:text-grow-text p-1.5" title="Cancella cronologia">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-52">
        <div className="mx-auto max-w-lg space-y-4">
          {!historyLoaded && (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-pulse rounded-full bg-grow-yellow" />
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-grow-yellow text-grow-text font-medium'
                    : 'bg-grow-card border border-grow-border text-grow-text'
                }`}>
                  {msg.generating ? (
                    <span className="flex gap-1 items-center">
                      {[0,1,2].map(j => (
                        <span key={j} className="h-1.5 w-1.5 rounded-full bg-grow-muted animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />
                      ))}
                    </span>
                  ) : msg.content}
                </div>
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Generata"
                    className="rounded-2xl w-full max-w-[320px] object-cover border border-grow-border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="fixed bottom-[68px] left-0 right-0 border-t border-grow-border bg-grow-card/95 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-4 pt-3 pb-3">
          <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {QUICK.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={loading}
                className="shrink-0 rounded-full border border-grow-border bg-grow-soft px-3 py-1.5 text-xs font-medium text-grow-text disabled:opacity-40"
              >
                {q.length > 38 ? q.slice(0, 38) + '…' : q}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Scrivi, chiedi, genera un'immagine…"
              className="flex-1 rounded-full border border-grow-border bg-grow-soft px-4 py-2.5 text-sm text-grow-text placeholder:text-grow-muted focus:outline-none focus:border-grow-yellow"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-grow-yellow text-grow-text disabled:opacity-40"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
