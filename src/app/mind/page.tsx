'use client'

import { useState, useEffect, useCallback } from 'react'
import BottomNav from '@/components/BottomNav'

/* ─── Breath game ─── */
function BreathGame() {
  const [phase, setPhase] = useState<'idle' | 'in' | 'hold' | 'out'>('idle')
  const [count, setCount] = useState(0)
  const [cycles, setCycles] = useState(0)

  useEffect(() => {
    if (phase === 'idle') return
    const durations = { in: 4, hold: 4, out: 6 }
    const next: Record<string, 'in' | 'hold' | 'out'> = { in: 'hold', hold: 'out', out: 'in' }
    let t = durations[phase]
    setCount(t)
    const interval = setInterval(() => {
      t--
      setCount(t)
      if (t === 0) {
        clearInterval(interval)
        if (phase === 'out') setCycles(c => c + 1)
        setPhase(next[phase])
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  const labels = { idle: 'Inizia', in: 'Inspira', hold: 'Tieni', out: 'Espira' }
  const scale = phase === 'in' ? 'scale-125' : phase === 'out' ? 'scale-75' : 'scale-100'

  return (
    <div className="rounded-[20px] border border-grow-border bg-grow-card p-6 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted mb-1">Respirazione guidata</p>
      <p className="text-xs text-grow-muted mb-6">Box breathing · {cycles} cicli completati</p>
      <div className="flex justify-center mb-6">
        <div className={`h-28 w-28 rounded-full bg-grow-yellow transition-transform duration-1000 ease-in-out ${scale} flex items-center justify-center`}>
          <span className="text-3xl font-black text-grow-text">{phase === 'idle' ? '·' : count}</span>
        </div>
      </div>
      <p className="text-lg font-bold text-grow-text mb-4">{labels[phase]}</p>
      <button
        onClick={() => setPhase(phase === 'idle' ? 'in' : 'idle')}
        className="rounded-full bg-grow-yellow px-6 py-2.5 text-sm font-bold text-grow-text"
      >
        {phase === 'idle' ? 'Inizia esercizio' : 'Pausa'}
      </button>
    </div>
  )
}

/* ─── Memory grid ─── */
function MemoryGrid() {
  const SIZE = 9
  const [level, setLevel] = useState(3)
  const [target, setTarget] = useState<number[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [phase, setPhase] = useState<'show' | 'play' | 'result'>('show')

  const newGame = useCallback(() => {
    const t: number[] = []
    while (t.length < level) {
      const n = Math.floor(Math.random() * SIZE)
      if (!t.includes(n)) t.push(n)
    }
    setTarget(t)
    setSelected([])
    setPhase('show')
    setTimeout(() => setPhase('play'), 2000)
  }, [level])

  useEffect(() => { newGame() }, [newGame])

  const toggle = (i: number) => {
    if (phase !== 'play') return
    const next = selected.includes(i) ? selected.filter(x => x !== i) : [...selected, i]
    setSelected(next)
    if (next.length === level) {
      setPhase('result')
    }
  }

  const correct = phase === 'result' && target.every(i => selected.includes(i))

  return (
    <div className="rounded-[20px] border border-grow-border bg-grow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted">Griglia di memoria</p>
          <p className="text-xs text-grow-muted mt-0.5">Livello {level} · memorizza {level} celle</p>
        </div>
        <div className="flex gap-1">
          {[3,4,5].map(l => (
            <button key={l} onClick={() => setLevel(l)} className={`h-7 w-7 rounded-full text-xs font-bold ${level === l ? 'bg-grow-yellow text-grow-text' : 'border border-grow-border text-grow-muted'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {Array.from({ length: SIZE }, (_, i) => {
          const isTarget = target.includes(i)
          const isSelected = selected.includes(i)
          let bg = 'bg-grow-soft'
          if (phase === 'show' && isTarget) bg = 'bg-grow-yellow'
          if (phase === 'play' && isSelected) bg = 'bg-grow-yellow'
          if (phase === 'result') {
            if (isTarget && isSelected) bg = 'bg-green-400'
            else if (isTarget) bg = 'bg-red-400'
            else if (isSelected) bg = 'bg-red-200'
          }
          return (
            <button key={i} onClick={() => toggle(i)}
              className={`aspect-square rounded-xl transition-colors ${bg} ${phase === 'play' ? 'active:scale-95' : ''}`}
            />
          )
        })}
      </div>

      {phase === 'show' && <p className="text-center text-xs text-grow-muted">Memorizza le celle evidenziate…</p>}
      {phase === 'play' && <p className="text-center text-xs text-grow-muted">Seleziona le {level} celle che hai visto</p>}
      {phase === 'result' && (
        <div className="text-center">
          <p className={`text-sm font-bold mb-3 ${correct ? 'text-green-500' : 'text-red-400'}`}>
            {correct ? '✓ Perfetto!' : '✗ Riprova'}
          </p>
          <button onClick={newGame} className="rounded-full bg-grow-yellow px-5 py-2 text-xs font-bold text-grow-text">
            Nuovo round
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Focus timer ─── */
function FocusTimer() {
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState<'focus' | 'break'>('focus')

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { setRunning(false); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [running])

  const reset = (m: 'focus' | 'break') => {
    setMode(m)
    setSeconds(m === 'focus' ? 25 * 60 : 5 * 60)
    setRunning(false)
  }

  const min = String(Math.floor(seconds / 60)).padStart(2, '0')
  const sec = String(seconds % 60).padStart(2, '0')
  const progress = mode === 'focus' ? 1 - seconds / (25 * 60) : 1 - seconds / (5 * 60)

  return (
    <div className="rounded-[20px] border border-grow-border bg-grow-card p-6 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-grow-muted mb-4">Timer focus</p>
      <div className="flex justify-center gap-2 mb-6">
        {(['focus', 'break'] as const).map(m => (
          <button key={m} onClick={() => reset(m)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${mode === m ? 'bg-grow-yellow text-grow-text' : 'border border-grow-border text-grow-muted'}`}>
            {m === 'focus' ? 'Focus 25m' : 'Pausa 5m'}
          </button>
        ))}
      </div>
      <div className="relative flex justify-center mb-6">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#E8E4DC" strokeWidth="6" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="#F5D042" strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress)}`}
            strokeLinecap="round" transform="rotate(-90 60 60)" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-black text-grow-text">{min}:{sec}</span>
        </div>
      </div>
      <button
        onClick={() => setRunning(r => !r)}
        className="rounded-full bg-grow-yellow px-8 py-2.5 text-sm font-bold text-grow-text"
      >
        {running ? 'Pausa' : seconds === 0 ? 'Ricomincia' : 'Avvia'}
      </button>
    </div>
  )
}

export default function MindPage() {
  return (
    <main className="min-h-screen bg-grow-bg pb-28 text-grow-text">
      <div className="mx-auto max-w-lg px-4 pt-12 space-y-4">
        <header className="mb-6">
          <h1 className="text-[26px] font-black uppercase tracking-tight">
            Mind<span className="text-grow-yellow">.</span>
          </h1>
          <p className="mt-1 text-sm text-grow-muted">Concentrazione e controllo emotivo.</p>
        </header>

        <FocusTimer />
        <BreathGame />
        <MemoryGrid />
      </div>
      <BottomNav />
    </main>
  )
}
