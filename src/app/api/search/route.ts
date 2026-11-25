import { NextRequest } from 'next/server'
import { ApiError, jsonOk, requireAuth, withRoute } from '@/lib/api'

export const runtime = 'nodejs'

/** Escape PostgREST pattern metacharacters so search terms stay literal. */
function escapeLike(term: string): string {
  return term.replace(/[%,()\\*]/g, ' ').trim()
}

export const GET = withRoute(async (request: NextRequest) => {
  const { supabase, profile } = await requireAuth()

  const url = new URL(request.url)
  const rawQ = (url.searchParams.get('q') ?? '').trim()
  if (!rawQ) throw new ApiError(400, 'Type something to search for.')
  if (rawQ.length > 100) throw new ApiError(400, 'Search terms are limited to 100 characters.')

  const q = escapeLike(rawQ)

  const [remindersRes, eventsRes, itemsRes] = await Promise.all([
    supabase
      .from('reminders')
      .select('id, title, notes, status, due_at, category_id, categories:category_id (name, color)')
      .or(`title.ilike.%${q}%,notes.ilike.%${q}%`)
      .eq('user_id', profile.id)
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(20),
    supabase
      .from('reminder_events')
      .select('id, reminder_title, category_name, kind, occurred_at')
      .ilike('reminder_title', `%${q}%`)
      .eq('user_id', profile.id)
      .order('occurred_at', { ascending: false })
      .limit(20),
    supabase
      .from('list_items')
      .select('id, content, is_completed, list_id, lists:lists!inner (name, icon)')
      .ilike('content', `%${q}%`)
      .eq('user_id', profile.id)
      .limit(10),
  ])

  return jsonOk({
    reminders: (remindersRes.data ?? []).map((r) => {
      const cats = (r as unknown as { categories?: { name: string; color: string } | null }).categories
      return {
        id: r.id,
        title: r.title,
        notes: r.notes,
        status: r.status,
        dueAt: r.due_at,
        categoryId: r.category_id,
        category: cats && typeof cats === 'object' && !Array.isArray(cats) ? cats : null,
      }
    }),
    events: (eventsRes.data ?? []).map((e) => ({
      id: e.id,
      title: e.reminder_title,
      kind: e.kind,
      occurredAt: e.occurred_at,
      categoryName: e.category_name,
    })),
    listItems: (itemsRes.data ?? []).map((item) => {
      const lists = (item as unknown as { lists?: { name: string; icon: string } | null }).lists
      return {
        id: item.id,
        content: item.content,
        isCompleted: item.is_completed,
        listId: item.list_id,
        listName: lists?.name ?? 'List',
        listIcon: lists?.icon ?? '📝',
      }
    }),
  })
})
