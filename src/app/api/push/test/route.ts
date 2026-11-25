import { jsonError, jsonOk, requireAuth, withRoute } from '@/lib/api'
import { sendPushToUser } from '@/lib/push'

export const runtime = 'nodejs'

export const POST = withRoute(async () => {
  const { supabase, profile } = await requireAuth()

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', profile.id)

  if (!subs || subs.length === 0) {
    return jsonError(400, 'No device is subscribed yet — enable notifications first.')
  }

  const result = await sendPushToUser(supabase, profile.id, {
    title: 'Nudge is listening 🔔',
    body: 'This is what a reminder looks like. All quiet — until it matters.',
    url: '/today',
    tag: 'nudge-test',
  })

  if (result.sent === 0) {
    return jsonError(
      502,
      'The notification could not be delivered. Your subscription may have expired — try turning notifications off and on again.'
    )
  }

  return jsonOk({ sent: result.sent, failed: result.failed, removed: result.removed })
})
