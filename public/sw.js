/* Nudge service worker — push handling + light static caching. */
/* eslint-disable no-undef */

const CACHE_NAME = 'nudge-static-v1'
const STATIC_PATTERNS = [/_next\/static\//, /\/icons\//, /\/_next\/image\?/]

self.addEventListener('install', () => {
  // take over as soon as the new worker is ready
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // clean stale caches
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // network-first for navigations with an offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        const offline = await cache.match('/offline.html')
        return offline ?? new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } })
      })
    )
    return
  }

  // stale-while-revalidate for static assets
  if (STATIC_PATTERNS.some((p) => p.test(url.pathname + url.search))) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
          .catch(() => cached)
        return cached ?? network
      })()
    )
  }
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }
  const title = payload.title || 'Nudge'
  const options = {
    body: payload.body || '',
    tag: payload.tag || 'nudge',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: payload.url || '/today' },
    requireInteraction: Boolean(payload.requireInteraction),
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/today'
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientList) {
        const clientUrl = new URL(client.url)
        if (clientUrl.pathname.startsWith('/today') || clientUrl.pathname.startsWith('/reminders')) {
          await client.focus()
          if (target && clientUrl.pathname !== target) client.navigate(target)
          return
        }
      }
      await self.clients.openWindow(target)
    })()
  )
})

// re-subscribe when the push subscription is refreshed by the browser
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch('/api/push/public-key')
        if (!res.ok) return
        const { publicKey } = await res.json()
        if (!publicKey) return
        const applicationServerKey = urlBase64ToUint8Array(publicKey)
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })
        const sub = subscription.toJSON()
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: sub.keys,
          }),
        })
      } catch {
        // re-subscription is best effort
      }
    })()
  )
})

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}
