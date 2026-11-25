import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nudge — Your Life, Remembered',
    short_name: 'Nudge',
    description: 'Remember the little things. Focus on the big things.',
    id: '/',
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#faf7f1',
    theme_color: '#faf7f1',
    categories: ['productivity', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Today',
        url: '/today',
        description: "See what's due today",
      },
      {
        name: 'New reminder',
        url: '/reminders/new',
        description: 'Create a reminder',
      },
    ],
  }
}
