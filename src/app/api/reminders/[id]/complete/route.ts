import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { completeSchema } from '@/lib/validation'
import { fetchReminder, logEvent, recurrenceOf } from '@/lib/server/reminders'
import { advancePast } from '@/lib/recurrence'

export const runtime = 'nodejs'

export const POST = withRoute(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { supabase, profile } = await requireAuth()
    const { done } = await readJson(request, completeSchema)
    const row = await fetchReminder(supabase, profile.id, id)
    const now = new Date()

    // resolve category name for the memory history snapshot
    let categoryName: string | null = null
    if (row.category_id) {
      const { data: cat } = await supabase
        .from('categories')
        .select('name')
        .eq('id', row.category_id)
        .maybeSingle()
      categoryName = cat?.name ?? null
    }

    if (done) {
      const rule = recurrenceOf(row)
      if (rule.type !== 'none' && row.due_at) {
        // recurring: complete this occurrence and roll forward to the next one
        const next = advancePast(new Date(row.due_at), rule, row.timezone, now)
        const { error } = await supabase
          .from('reminders')
          .update({
            due_at: next.toISOString(),
            snoozed_until: null,
            last_notified_for: null,
            status: 'active',
          })
          .eq('id', id)
        if (error) throw new ApiError(500, 'Could not complete the reminder.')
        await logEvent(supabase, {
          user_id: profile.id,
          reminder_id: id,
          reminder_title: row.title,
          category_name: categoryName,
          kind: 'completed',
          meta: { next_occurrence: next.toISOString() },
        })
      } else {
        const { error } = await supabase
          .from('reminders')
          .update({ status: 'completed', completed_at: now.toISOString(), snoozed_until: null })
          .eq('id', id)
        if (error) throw new ApiError(500, 'Could not complete the reminder.')
        await logEvent(supabase, {
          user_id: profile.id,
          reminder_id: id,
          reminder_title: row.title,
          category_name: categoryName,
          kind: 'completed',
        })
      }
    } else {
      // undo — back to open (one-time reminders may land overdue; that's honest)
      const { error } = await supabase
        .from('reminders')
        .update({ status: 'active', completed_at: null })
        .eq('id', id)
      if (error) throw new ApiError(500, 'Could not update the reminder.')
    }

    return jsonOk({ ok: true, done })
  }
)
