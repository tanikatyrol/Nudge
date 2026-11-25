import { NextRequest } from 'next/server'
import { jsonError, jsonOk, withRoute } from '@/lib/api'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'
import { advancePast, isRecurring } from '@/lib/recurrence'
import { formatDueLabel, formatTime, localDateKey } from '@/lib/time'
import type { Database, RecurrenceRule } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface DispatchRow {
  id: string
  user_id: string
  title: string
  notes: string | null
  due_at: string | null
  effective_due: string
  recurrence_type: RecurrenceRule['type']
  recurrence_interval: number
  recurrence_weekdays: number[] | null
  reminder_timezone: string
  user_timezone: string
  push_enabled: boolean
}

interface BriefingRow {
  id: string
  display_name: string | null
  timezone: string
  overdue_count: number
  due_today_count: number
  upcoming_week_count: number
}

/**
 * Server-side dispatcher — call this from Vercel Cron (see vercel.json) or any
 * external scheduler (GitHub Actions, cron-job.org, QStash). It:
 *   1. finds reminders whose effective due time has passed and that have not
 *      been notified for that occurrence (idempotent — safe to run often),
 *   2. delivers web pushes for them (best-effort, per-subscription failures
 *      are contained and dead subscriptions pruned),
 *   3. rolls recurring reminders forward so the next occurrence re-arms,
 *   4. sends the daily briefing push to users whose briefing time is due.
 *
 * Auth: "Authorization: Bearer <CRON_SECRET>" (Vercel sends this automatically
 * when CRON_SECRET is set on the project) or ?secret=<CRON_SECRET>.
 */
export const GET = withRoute(async (request: NextRequest) => {
  const secret = process.env.CRON_SECRET
  const provided =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    new URL(request.url).searchParams.get('secret')

  if (!secret) {
    return jsonError(
      503,
      'CRON_SECRET is not configured. Set it in your environment (see README) so the dispatcher cannot be abused.'
    )
  }
  if (provided !== secret) {
    return jsonError(401, 'Invalid cron secret.')
  }

  const admin = createSupabaseAdminClient()
  if (!admin) {
    return jsonError(503, 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.')
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const result = {
    remindersDue: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
    subscriptionsRemoved: 0,
    recurringAdvanced: 0,
    briefingsSent: 0,
    at: nowIso,
  }

  // ── due reminders ───────────────────────────────────────────────────────────
  const { data: batch, error: batchError } = await admin.rpc('get_dispatch_batch', { p_now: nowIso })
  if (batchError) {
    return jsonError(500, `Dispatcher query failed: ${batchError.message}`)
  }
  const reminders = (batch ?? []) as unknown as DispatchRow[]
  result.remindersDue = reminders.length

  for (const row of reminders) {
    const tz = row.reminder_timezone || row.user_timezone || 'UTC'
    const effectiveDue = new Date(row.effective_due)

    try {
      // 1) deliver the notification (if the user allows pushes)
      if (row.push_enabled) {
        const dueLabel = formatDueLabel(effectiveDue, tz, now, formatTime(effectiveDue, tz))
        const overdue = effectiveDue.getTime() < now.getTime() - 60_000
        const body = row.notes
          ? `${row.title} — ${row.notes.slice(0, 80)}`
          : `${row.title}${overdue ? ` · was due ${dueLabel}` : ` · due ${dueLabel}`}`

        const push = await sendPushToUser(admin, row.user_id, {
          title: overdue ? 'Overdue — Nudge' : 'Reminder — Nudge',
          body,
          url: '/today',
          tag: `reminder-${row.id}`,
          requireInteraction: false,
        })
        result.notificationsSent += push.sent
        result.notificationsFailed += push.failed
        result.subscriptionsRemoved += push.removed

        if (push.sent > 0) {
          await admin.from('reminder_events').insert({
            user_id: row.user_id,
            reminder_id: row.id,
            reminder_title: row.title,
            kind: 'notification_sent',
            meta: { sent: push.sent, effective_due: row.effective_due },
          })
        }
      }

      // 2) mark this occurrence as notified; roll recurring reminders forward
      const rule: RecurrenceRule = {
        type: row.recurrence_type,
        interval: row.recurrence_interval,
        weekdays: row.recurrence_weekdays ?? [],
      }

      const update: Database['public']['Tables']['reminders']['Update'] = {
        last_notified_for: row.effective_due,
        last_notified_at: nowIso,
        snoozed_until: null,
      }

      if (isRecurring(rule) && row.due_at) {
        const next = advancePast(new Date(row.due_at), rule, tz, now)
        update.due_at = next.toISOString()
        result.recurringAdvanced += 1

        await admin.from('reminder_events').insert({
          user_id: row.user_id,
          reminder_id: row.id,
          reminder_title: row.title,
          kind: 'recurring_advanced',
          meta: { from: row.effective_due, to: next.toISOString() },
        })
      }

      const { error: updateError } = await admin.from('reminders').update(update).eq('id', row.id)
      if (updateError) {
        console.error('[cron] failed to update reminder:', row.id, updateError.message)
      }
    } catch (err) {
      // one bad row must never abort the whole dispatch
      console.error('[cron] error dispatching reminder:', row.id, err)
    }
  }

  // ── daily briefings ─────────────────────────────────────────────────────────
  const { data: briefingBatch, error: briefingError } = await admin.rpc('get_briefing_batch', {
    p_now: nowIso,
  })
  if (briefingError) {
    console.error('[cron] briefing query failed:', briefingError.message)
  }

  for (const row of ((briefingBatch ?? []) as unknown as BriefingRow[]) ?? []) {
    try {
      const name = row.display_name?.trim() || 'there'
      const parts: string[] = []
      if (row.overdue_count > 0) parts.push(`${row.overdue_count} overdue`)
      if (row.due_today_count > 0) parts.push(`${row.due_today_count} today`)
      if (row.upcoming_week_count > 0) parts.push(`${row.upcoming_week_count} this week`)

      const body =
        parts.length > 0
          ? `${name}, you have ${parts.join(', ')}.`
          : `${name}, nothing needs you today — enjoy the calm.`

      const push = await sendPushToUser(admin, row.id, {
        title: 'Your daily briefing — Nudge',
        body,
        url: '/today',
        tag: 'nudge-briefing',
      })
      result.notificationsSent += push.sent
      result.notificationsFailed += push.failed
      result.subscriptionsRemoved += push.removed

      if (push.sent > 0) {
        const { error: markError } = await admin
          .from('profiles')
          .update({ last_briefing_date: localDateKey(now, row.timezone) })
          .eq('id', row.id)
        if (!markError) result.briefingsSent += 1
      }
    } catch (err) {
      console.error('[cron] error sending briefing:', row.id, err)
    }
  }

  return jsonOk(result)
})
