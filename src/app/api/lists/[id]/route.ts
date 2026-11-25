import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { listUpdateSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export const PATCH = withRoute(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { supabase, profile } = await requireAuth()
    const body = await readJson(request, listUpdateSchema)

    const { data, error } = await supabase
      .from('lists')
      .update({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.icon !== undefined ? { icon: body.icon } : {}),
        ...(body.sortOrder !== undefined ? { sort_order: body.sortOrder } : {}),
      })
      .eq('id', id)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (error || !data) throw new ApiError(404, 'That list no longer exists.')

    return jsonOk({ id: data.id, name: data.name, icon: data.icon })
  }
)

export const DELETE = withRoute(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { supabase, profile } = await requireAuth()

    const { error } = await supabase.from('lists').delete().eq('id', id).eq('user_id', profile.id)
    if (error) throw new ApiError(500, 'Could not delete the list.')

    return jsonOk({ ok: true })
  }
)
