import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { listItemUpdateSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export const PATCH = withRoute(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { supabase, profile } = await requireAuth()
    const body = await readJson(request, listItemUpdateSchema)

    const { data, error } = await supabase
      .from('list_items')
      .update({
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.isCompleted !== undefined
          ? { is_completed: body.isCompleted, completed_at: body.isCompleted ? new Date().toISOString() : null }
          : {}),
      })
      .eq('id', id)
      .eq('user_id', profile.id)
      .select()
      .single()

    if (error || !data) throw new ApiError(404, 'That item no longer exists.')

    return jsonOk({
      id: data.id,
      content: data.content,
      is_completed: data.is_completed,
      completed_at: data.completed_at,
      position: data.position,
    })
  }
)

export const DELETE = withRoute(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { supabase, profile } = await requireAuth()

    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id)
    if (error) throw new ApiError(500, 'Could not delete the item.')

    return jsonOk({ ok: true })
  }
)
