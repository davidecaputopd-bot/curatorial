import type { MetadataRoute } from 'next'

// Rende GROW installabile sulla schermata home (necessario per le notifiche su iPhone).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GROW.',
    short_name: 'GROW',
    start_url: '/serie',
    display: 'standalone',
    background_color: '#0D0C0B',
    theme_color: '#0D0C0B',
    icons: [{ src: '/icon-1.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
