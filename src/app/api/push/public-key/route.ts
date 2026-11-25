import { getVapidPublicKey } from '@/lib/push'
import { jsonError, jsonOk } from '@/lib/api'

export const runtime = 'nodejs'

export const GET = () => {
  const publicKey = getVapidPublicKey()
  if (!publicKey) {
    return jsonError(
      503,
      'Push notifications are not configured on this server. Set the VAPID environment variables (see README).'
    )
  }
  return jsonOk({ publicKey })
}
