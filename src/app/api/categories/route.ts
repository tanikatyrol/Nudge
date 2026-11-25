import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { categoryCreateSchema } from '@/lib/validation'
import { serializeCategory } from '@/lib/serialize'

export const runtime = 'nodejs'

export const POST = withRoute(async (request: NextRequest) => {
  const { supabase, profile } = await requireAuth()
  const body = await readJson(request, categoryCreateSchema)

  const { data: last } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('user_id', profile.id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: profile.id,
      name: body.name,
      color: body.color,
      icon: body.icon || 'tag',
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,
    })
    .select()
    .single()

  if (error) throw new ApiError(500, 'Could not create the category.')

  return jsonOk(serializeCategory(data))
})
