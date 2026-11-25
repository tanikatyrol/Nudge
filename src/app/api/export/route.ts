import { ApiError, requireAuth, withRoute } from '@/lib/api'

export const runtime = 'nodejs'

export const GET = withRoute(async () => {
  const { supabase, profile } = await requireAuth()

  const [remindersRes, categoriesRes, listsRes, itemsRes, eventsRes] = await Promise.all([
    supabase.from('reminders').select('*').order('created_at'),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('lists').select('*').order('sort_order'),
    supabase.from('list_items').select('*').order('position'),
    supabase.from('reminder_events').select('*').order('occurred_at', { ascending: false }).limit(5000),
  ])

  for (const res of [remindersRes, categoriesRes, listsRes, itemsRes, eventsRes]) {
    if (res.error) throw new ApiError(500, 'Could not export your data. Please try again.')
  }

  const exportPayload = {
    app: 'Nudge',
    exportedAt: new Date().toISOString(),
    profile: {
      displayName: profile.displayName,
      timezone: profile.timezone,
    },
    categories: categoriesRes.data,
    reminders: remindersRes.data,
    lists: listsRes.data,
    listItems: itemsRes.data,
    reminderEvents: eventsRes.data,
  }

  const dateStamp = new Date().toISOString().slice(0, 10)
  return new Response(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="nudge-export-${dateStamp}.json"`,
      'Cache-Control': 'no-store',
    },
  })
})
