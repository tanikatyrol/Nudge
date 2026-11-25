import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { categoryUpdateSchema } from '@/lib/validation'
import { serializeCategory } from '@/lib/serialize'

export const runtime = 'nodejs'

export const PATCH = withRoute(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { supabase, profile } = await requireAuth()
    const body = await readJson(request, categoryUpdateSchema)

    const { data, error } = await supabase
      .from('categories')
      .update({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.icon !== undefined ? { icon: body.icon } : {}),
        ...(body.sortOrder !== undefined ? { sort_order: body.sortOrder } : {}),
      })
      .eq('id', id)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (error || !data) throw new ApiError(404, 'That category no longer exists.')

    return jsonOk(serializeCategory(data))
  }
)

export const DELETE = withRoute(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { supabase, profile } = await requireAuth()

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id)
    if (error) throw new ApiError(500, 'Could not delete the category.')

    return jsonOk({ ok: true })
  }
)
