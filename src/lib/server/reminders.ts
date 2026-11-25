import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/api'
import type { Database, RecurrenceRule } from '@/types'
import { getZonedParts } from '@/lib/time'

export type ReminderRow = Database['public']['Tables']['reminders']['Row']

/** Ensure a weekly rule has concrete weekdays once a due date exists. */
export function normalizeRecurrence(rule: RecurrenceRule, dueAtIso: string | null, tz: string): RecurrenceRule {
  if (rule.type === 'weekly' && rule.weekdays.length === 0 && dueAtIso) {
    return { ...rule, weekdays: [getZonedParts(new Date(dueAtIso), tz).weekday] }
  }
  return rule
}

/** Verify the category id (when provided) belongs to the user. */
export async function resolveCategoryId(
  supabase: SupabaseClient<Database>,
  userId: string,
  categoryId: string | null | undefined
): Promise<string | null> {
  if (!categoryId) return null
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) throw new ApiError(400, 'That category does not exist.')
  return data.id
}

export async function fetchReminder(
  supabase: SupabaseClient<Database>,
  userId: string,
  reminderId: string
): Promise<ReminderRow> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', reminderId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new ApiError(500, 'Could not load the reminder.')
  if (!data) throw new ApiError(404, 'That reminder no longer exists.')
  return data
}

export function recurrenceOf(row: ReminderRow): RecurrenceRule {
  return {
    type: row.recurrence_type,
    interval: row.recurrence_interval,
    weekdays: row.recurrence_weekdays ?? [],
  }
}

export async function logEvent(
  supabase: SupabaseClient<Database>,
  fields: Database['public']['Tables']['reminder_events']['Insert']
): Promise<void> {
  const { error } = await supabase.from('reminder_events').insert(fields)
  if (error) {
    // event logging must never break the primary action
    console.error('[events] failed to record event:', error.message)
  }
}
