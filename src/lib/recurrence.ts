// ══════════════════════════════════════════════════════════════════════════════
// Recurrence computation — advances recurring reminders to their next
// occurrence while preserving the wall-clock time in the reminder's timezone.
// ══════════════════════════════════════════════════════════════════════════════

import { addWallDays, daysInMonth, getZonedParts, zonedWallTimeToUtc } from './time'
import type { RecurrenceRule } from '@/types'

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export const DEFAULT_RECURRENCE: RecurrenceRule = { type: 'none', interval: 1, weekdays: [] }

export function isRecurring(rule: RecurrenceRule): boolean {
  return rule.type !== 'none'
}

/**
 * The next occurrence strictly after `dueAt` (same local wall-clock time).
 * For weekly rules with explicit weekdays, the next matching weekday is used.
 */
export function nextOccurrence(dueAt: Date, rule: RecurrenceRule, tz: string): Date {
  const p = getZonedParts(dueAt, tz)

  switch (rule.type) {
    case 'none':
      return dueAt

    case 'daily':
    case 'custom': {
      const step = Math.max(1, rule.interval)
      return zonedWallTimeToUtc(p.year, p.month, p.day + step, p.hour, p.minute, tz)
    }

    case 'weekly': {
      const weekdays = [...new Set(rule.weekdays)].sort((a, b) => a - b)
      if (weekdays.length > 0) {
        // Find the next matching weekday strictly after the current day.
        for (let i = 1; i <= 7; i++) {
          const candidate = zonedWallTimeToUtc(p.year, p.month, p.day + i, p.hour, p.minute, tz)
          const cd = getZonedParts(candidate, tz)
          if (weekdays.includes(cd.weekday)) return candidate
        }
        return addWallDays(dueAt, 7, tz)
      }
      const step = Math.max(1, rule.interval)
      return zonedWallTimeToUtc(p.year, p.month, p.day + 7 * step, p.hour, p.minute, tz)
    }

    case 'monthly': {
      const step = Math.max(1, rule.interval)
      let month = p.month + step
      let year = p.year
      while (month > 12) {
        month -= 12
        year += 1
      }
      const day = Math.min(p.day, daysInMonth(year, month))
      return zonedWallTimeToUtc(year, month, day, p.hour, p.minute, tz)
    }
  }
}

/**
 * Advance `dueAt` repeatedly until the next occurrence is strictly after
 * `now` — used by the cron dispatcher to catch up after downtime and by
 * completion handlers. Caps iterations to guard against pathological rules.
 */
export function advancePast(dueAt: Date, rule: RecurrenceRule, tz: string, now: Date): Date {
  if (rule.type === 'none') return dueAt
  let next = dueAt
  for (let i = 0; i < 1000; i++) {
    next = nextOccurrence(next, rule, tz)
    if (next.getTime() > now.getTime()) return next
  }
  return new Date(now.getTime() + 60_000)
}

/** "Every day", "Every 2 weeks on Mon & Thu", "Every month", "Every 3 days"… */
export function formatRecurrence(rule: RecurrenceRule): string | null {
  if (rule.type === 'none') return null
  const n = Math.max(1, rule.interval)

  switch (rule.type) {
    case 'daily':
      return n === 1 ? 'Every day' : `Every ${n} days`
    case 'weekly': {
      const days = [...new Set(rule.weekdays)].sort((a, b) => a - b)
      const dayLabel = days.length > 0 ? days.map((d) => WEEKDAY_LABELS[d]).join(' & ') : 'week'
      const everyN = n === 1 ? 'Every' : `Every ${n}`
      return days.length > 0 ? `${everyN} ${dayLabel}` : n === 1 ? 'Every week' : `Every ${n} weeks`
    }
    case 'monthly':
      return n === 12 ? 'Every year' : n === 1 ? 'Every month' : `Every ${n} months`
    case 'custom':
      return n === 1 ? 'Every day' : `Every ${n} days`
  }
}
