import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { pushUnsubscribeSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export const POST = withRoute(async (request: NextRequest) => {
  const { supabase, profile } = await requireAuth()
  const body = await readJson(request, pushUnsubscribeSchema)

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.endpoint)
    .eq('user_id', profile.id)

  if (error) throw new ApiError(500, 'Could not remove the notification subscription.')

  return jsonOk({ ok: true })
})
