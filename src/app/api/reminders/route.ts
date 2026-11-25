import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { reminderCreateSchema } from '@/lib/validation'
import { normalizeRecurrence, resolveCategoryId } from '@/lib/server/reminders'

export const runtime = 'nodejs'

export const POST = withRoute(async (request: NextRequest) => {
  const { supabase, profile } = await requireAuth()
  const body = await readJson(request, reminderCreateSchema)

  const categoryId = await resolveCategoryId(supabase, profile.id, body.categoryId ?? null)
  const recurrence = normalizeRecurrence(
    body.recurrence,
    body.dueAt ?? null,
    body.timezone ?? profile.timezone
  )

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: profile.id,
      title: body.title,
      notes: body.notes ?? null,
      due_at: body.dueAt ?? null,
      is_all_day: body.isAllDay && Boolean(body.dueAt),
      timezone: body.timezone ?? profile.timezone,
      recurrence_type: recurrence.type,
      recurrence_interval: recurrence.interval,
      recurrence_weekdays: recurrence.weekdays,
      category_id: categoryId,
    })
    .select()
    .single()

  if (error) {
    throw new ApiError(500, 'Could not save the reminder. Please try again.')
  }

  return jsonOk({ id: data.id, title: data.title })
})
