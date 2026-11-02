'use client'

import { useCallback, useRef } from 'react'

// Inclina un blocco verso il dito o il puntatore (max `max` gradi), con riflesso che segue.
// Va usato con la classe .grow-tilt; rispetta prefers-reduced-motion via CSS.
export function useTilt<T extends HTMLElement>(max = 7) {
  const ref = useRef<T>(null)

  const move = useCallback(
    (event: React.PointerEvent<T>) => {
      const el = ref.current
      if (!el || (event.pointerType !== 'mouse' && !event.buttons)) return
      const rect = el.getBoundingClientRect()
      const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
      const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1)
      el.dataset.tilting = ''
      el.style.setProperty('--ry', `${(x - 0.5) * 2 * max}deg`)
      el.style.setProperty('--rx', `${(0.5 - y) * 2 * max}deg`)
      el.style.setProperty('--gx', `${x * 100}%`)
      el.style.setProperty('--gy', `${y * 100}%`)
      el.style.setProperty('--ga', '1')
    },
    [max]
  )

  const reset = useCallback(() => {
    const el = ref.current
    if (!el) return
    delete el.dataset.tilting
    for (const name of ['--rx', '--ry', '--ga']) el.style.removeProperty(name)
  }, [])

  return {
    ref,
    onPointerMove: move,
    onPointerDown: move,
    onPointerUp: reset,
    onPointerCancel: reset,
    onPointerLeave: reset,
  }
}
