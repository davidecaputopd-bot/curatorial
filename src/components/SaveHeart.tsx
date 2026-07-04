'use client'

import { useEffect, useState } from 'react'
import { Flower } from '@phosphor-icons/react'

export default function SaveHeart({
  itemId,
  initialSaved = false,
}: {
  itemId: string
  initialSaved?: boolean
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setSaved(initialSaved)
  }, [initialSaved])

  const toggle = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (busy) return

    const next = !saved
    setSaved(next)
    setBusy(true)

    try {
      if (next) {
        await fetch('/api/interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            content_id: itemId,
            action: 'save',
          }),
        })
      } else {
        await fetch('/api/saved', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content_id: itemId }),
        })
      }
    } catch {
      setSaved(!next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={saved ? 'Rimuovi dai salvati' : 'Salva'}
      className={[
        'absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 backdrop-blur-xl transition-all',
        saved
          ? 'bg-[#FFE500] text-[#0F0F10] shadow-[0_8px_24px_rgba(0,0,0,0.22)]'
          : 'bg-black/35 text-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.18)]',
        busy ? 'scale-90 opacity-60' : 'hover:scale-110',
      ].join(' ')}
    >
      <Flower size={18} weight={saved ? 'fill' : 'regular'} />
    </button>
  )
}
