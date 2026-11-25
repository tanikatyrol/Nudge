import 'server-only'
import { setVapidDetails, sendNotification } from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

export interface PushPayload {
  title: string
  body: string
  /** deep-link path inside the app */
  url?: string
  tag?: string
  requireInteraction?: boolean
}

let vapidConfigured = false

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:nudge@localhost',
    publicKey,
    privateKey
  )
  vapidConfigured = true
  return true
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null
}

export interface PushSendResult {
  sent: number
  failed: number
  removed: number
}

/**
 * Deliver a push notification to every registered device of a user.
 * Subscriptions that the push service reports as gone (404/410) are removed.
 * Delivery failures never throw — they are counted and logged.
 */
export async function sendPushToUser(
  admin: SupabaseClient<Database>,
  userId: string,
  payload: PushPayload
): Promise<PushSendResult> {
  const result: PushSendResult = { sent: 0, failed: 0, removed: 0 }

  if (!ensureVapidConfigured()) {
    console.error('[push] VAPID keys are not configured — cannot send push notifications')
    return result
  }

  let subscriptions: Database['public']['Tables']['push_subscriptions']['Row'][] = []
  try {
    const { data, error } = await admin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
    if (error) {
      console.error('[push] failed to load subscriptions:', error.message)
      return result
    }
    subscriptions = data ?? []
  } catch (err) {
    console.error('[push] failed to load subscriptions:', err)
    return result
  }

  const payloadJson = JSON.stringify(payload)

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payloadJson,
          { TTL: 3600 }
        )
        result.sent += 1
      } catch (err) {
        const statusCode =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? (err as { statusCode?: number }).statusCode
            : undefined
        if (statusCode === 404 || statusCode === 410) {
          // subscription expired or revoked — clean it up
          try {
            await admin.from('push_subscriptions').delete().eq('id', sub.id)
            result.removed += 1
          } catch {
            result.failed += 1
          }
        } else {
          console.error('[push] delivery failed:', statusCode ?? err)
          result.failed += 1
        }
      }
    })
  )

  return result
}
