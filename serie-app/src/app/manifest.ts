import type { MetadataRoute } from 'next'

// Installabile sulla schermata home: su iPhone è il requisito per le notifiche.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Time.',
    short_name: 'Time',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D0C0B',
    theme_color: '#0D0C0B',
    icons: [{ src: '/icona.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
