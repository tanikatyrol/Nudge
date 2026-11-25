import { NextRequest } from 'next/server'
import { ApiError, jsonOk, requireAuth, withRoute } from '@/lib/api'

export const runtime = 'nodejs'

export const POST = withRoute(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { supabase, profile } = await requireAuth()

    // verify ownership, then delete completed items
    const { data: list } = await supabase
      .from('lists')
      .select('id')
      .eq('id', id)
      .eq('user_id', profile.id)
      .maybeSingle()
    if (!list) throw new ApiError(404, 'That list no longer exists.')

    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('list_id', id)
      .eq('user_id', profile.id)
      .eq('is_completed', true)

    if (error) throw new ApiError(500, 'Could not clear completed items.')

    return jsonOk({ ok: true })
  }
)
