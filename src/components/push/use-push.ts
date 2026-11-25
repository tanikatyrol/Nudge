'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getCurrentSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from './push-client'

export interface PushStatus {
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  subscribed: boolean
  ready: boolean
  enable: () => Promise<void>
  disable: () => Promise<void>
  sendTest: () => Promise<void>
}

interface PushState {
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  subscribed: boolean
  ready: boolean
}

export function usePushStatus(): PushStatus {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: 'unsupported',
    subscribed: false,
    ready: false,
  })

  useEffect(() => {
    let cancelled = false
    const supported = isPushSupported()
    const permission: NotificationPermission | 'unsupported' = supported
      ? Notification.permission
      : 'unsupported'
    const subscriptionPromise = supported
      ? getCurrentSubscription().catch(() => null)
      : Promise.resolve(null)
    subscriptionPromise.then((sub) => {
      if (cancelled) return
      setState({ supported, permission, subscribed: Boolean(sub), ready: true })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const enable = useCallback(async () => {
    const result = await Notification.requestPermission()
    if (result !== 'granted') {
      setState((s) => ({ ...s, permission: result }))
      throw new Error('Notification permission was not granted.')
    }
    await subscribeToPush()
    setState((s) => ({ ...s, permission: result, subscribed: true }))
  }, [])

  const disable = useCallback(async () => {
    await unsubscribeFromPush()
    setState((s) => ({ ...s, subscribed: false }))
  }, [])

  const sendTest = useCallback(async () => {
    const res = await fetch('/api/push/test', { method: 'POST' })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? 'Could not send the test notification.')
    }
  }, [])

  return { ...state, enable, disable, sendTest }
}
