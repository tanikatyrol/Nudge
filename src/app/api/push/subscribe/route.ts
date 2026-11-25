import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { pushSubscribeSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export const POST = withRoute(async (request: NextRequest) => {
  const { supabase, profile } = await requireAuth()
  const body = await readJson(request, pushSubscribeSchema)

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: profile.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth_key: body.keys.auth,
      user_agent: body.userAgent ?? null,
    },
    { onConflict: 'endpoint' }
  )

  if (error) throw new ApiError(500, 'Could not save the notification subscription.')

  return jsonOk({ ok: true })
})
