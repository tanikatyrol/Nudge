import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { listItemCreateSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export const POST = withRoute(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { supabase, profile } = await requireAuth()
    const body = await readJson(request, listItemCreateSchema)

    // verify the list belongs to the user
    const { data: list } = await supabase
      .from('lists')
      .select('id')
      .eq('id', id)
      .eq('user_id', profile.id)
      .maybeSingle()
    if (!list) throw new ApiError(404, 'That list no longer exists.')

    const { data: last } = await supabase
      .from('list_items')
      .select('position')
      .eq('list_id', id)
      .order('position', { ascending: false })
      .limit(1)

    const { data: item, error } = await supabase
      .from('list_items')
      .insert({
        list_id: id,
        user_id: profile.id,
        content: body.content,
        position: (last?.[0]?.position ?? -1) + 1,
      })
      .select()
      .single()

    if (error) throw new ApiError(500, 'Could not add the item.')

    return jsonOk({
      id: item.id,
      content: item.content,
      is_completed: item.is_completed,
      completed_at: item.completed_at,
      position: item.position,
    })
  }
)
