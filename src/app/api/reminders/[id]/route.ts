import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { reminderUpdateSchema } from '@/lib/validation'
import { fetchReminder, normalizeRecurrence, recurrenceOf, resolveCategoryId } from '@/lib/server/reminders'

export const runtime = 'nodejs'

export const PATCH = withRoute(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { supabase, profile } = await requireAuth()
    const existing = await fetchReminder(supabase, profile.id, id)
    const body = await readJson(request, reminderUpdateSchema)

    const categoryId = await resolveCategoryId(supabase, profile.id, body.categoryId)
    const timezone = body.timezone ?? existing.timezone
    const dueAt = body.dueAt !== undefined ? body.dueAt : existing.due_at
    const recurrence = body.recurrence
      ? normalizeRecurrence(body.recurrence, dueAt, timezone)
      : recurrenceOf(existing)

    const dueChanged = body.dueAt !== undefined && body.dueAt !== existing.due_at

    const { error } = await supabase
      .from('reminders')
      .update({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.dueAt !== undefined ? { due_at: body.dueAt } : {}),
        ...(body.isAllDay !== undefined ? { is_all_day: body.isAllDay && Boolean(dueAt) } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.recurrence !== undefined
          ? {
              recurrence_type: recurrence.type,
              recurrence_interval: recurrence.interval,
              recurrence_weekdays: recurrence.weekdays,
            }
          : {}),
        ...(categoryId !== undefined ? { category_id: categoryId } : {}),
        // a changed schedule re-arms notifications
        ...(dueChanged ? { snoozed_until: null, last_notified_for: null } : {}),
      })
      .eq('id', id)
      .eq('user_id', profile.id)

    if (error) throw new ApiError(500, 'Could not update the reminder.')

    return jsonOk({ ok: true })
  }
)

export const DELETE = withRoute(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { supabase, profile } = await requireAuth()

    const { error } = await supabase.from('reminders').delete().eq('id', id).eq('user_id', profile.id)
    if (error) throw new ApiError(500, 'Could not delete the reminder.')

    return jsonOk({ ok: true })
  }
)
