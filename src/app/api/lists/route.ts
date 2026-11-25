import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { listCreateSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export const POST = withRoute(async (request: NextRequest) => {
  const { supabase, profile } = await requireAuth()
  const body = await readJson(request, listCreateSchema)

  const { data: last } = await supabase
    .from('lists')
    .select('sort_order')
    .eq('user_id', profile.id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: profile.id,
      name: body.name,
      icon: body.icon || '📝',
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,
    })
    .select()
    .single()

  if (error) throw new ApiError(500, 'Could not create the list.')

  return jsonOk({ id: data.id, name: data.name, icon: data.icon })
})
