'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { BellRing, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { usePushStatus } from './use-push'

const DISMISS_KEY = 'nudge-push-banner-dismissed'
const dismissListeners = new Set<() => void>()

function subscribeDismiss(onChange: () => void): () => void {
  dismissListeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    dismissListeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function useDismissed(): boolean {
  return useSyncExternalStore(
    subscribeDismiss,
    () => localStorage.getItem(DISMISS_KEY) === '1',
    () => true // hidden on the server until hydrated
  )
}

/**
 * Gentle, honest prompt to enable push notifications.
 * Never claims notifications work before permission is granted and a
 * subscription exists.
 */
export function PushBanner({ compact }: { compact?: boolean }) {
  const router = useRouter()
  const { toast } = useToast()
  const { supported, permission, subscribed, enable } = usePushStatus()
  const dismissed = useDismissed()
  const [busy, setBusy] = useState(false)

  // show only when push is possible, not yet enabled and not dismissed
  if (!supported || dismissed || subscribed) return null

  const blocked = permission === 'denied'

  async function onEnable() {
    setBusy(true)
    try {
      await enable()
      toast({ message: 'Reminders enabled — Nudge will nudge you', tone: 'success' })
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not enable notifications'
      toast({
        message:
          message.includes('configured')
            ? 'Push isn’t set up on the server yet — see the README (VAPID keys).'
            : message,
        tone: 'error',
        durationMs: 7000,
      })
    } finally {
      setBusy(false)
    }
  }

  function onDismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    dismissListeners.forEach((cb) => cb())
  }

  if (compact) {
    return (
      <button
        onClick={onEnable}
        disabled={busy || blocked}
        className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-cream-50 px-3 py-1.5 text-xs font-semibold text-navy-600 shadow-sm transition-colors hover:bg-cream-200 disabled:opacity-50"
      >
        <BellRing className="h-3.5 w-3.5" aria-hidden />
        {blocked ? 'Notifications blocked' : busy ? 'Enabling…' : 'Enable reminders'}
      </button>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-sky-300 bg-sky-200/40 px-4 py-3.5 animate-fade-in">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-200">
        <BellRing className="h-4.5 w-4.5 text-sky-500" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">
          {blocked ? 'Notifications are blocked' : 'Get reminders on this device'}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-500">
          {blocked
            ? 'Push permission was denied in your browser settings. Re-enable it there to get reminders.'
            : 'Allow notifications and Nudge will remind you at just the right moment — even when the app is closed.'}
        </p>
        {!blocked && (
          <Button size="sm" className="mt-2.5" onClick={onEnable} loading={busy}>
            Enable notifications
          </Button>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-cream-200 hover:text-ink-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
