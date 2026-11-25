import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { profileUpdateSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export const PATCH = withRoute(async (request: NextRequest) => {
  const { supabase, profile } = await requireAuth()
  const body = await readJson(request, profileUpdateSchema)

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...(body.displayName !== undefined ? { display_name: body.displayName } : {}),
      ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
      ...(body.theme !== undefined ? { theme: body.theme } : {}),
      ...(body.pushEnabled !== undefined ? { push_enabled: body.pushEnabled } : {}),
      ...(body.briefingEnabled !== undefined ? { briefing_enabled: body.briefingEnabled } : {}),
      ...(body.briefingTime !== undefined ? { briefing_time: body.briefingTime } : {}),
      ...(body.onboarded ? { onboarded_at: new Date().toISOString() } : {}),
    })
    .eq('id', profile.id)
    .select()
    .single()

  if (error) throw new ApiError(500, 'Could not save your settings.')

  return jsonOk({
    displayName: data.display_name,
    timezone: data.timezone,
    theme: data.theme,
    briefingEnabled: data.briefing_enabled,
    briefingTime: data.briefing_time,
  })
})
