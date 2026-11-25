// ══════════════════════════════════════════════════════════════════════════════
// Timezone-aware time utilities.
//
// Reminders store absolute UTC instants (`due_at`) plus the IANA timezone the
// user was in when the reminder was created. Everything wall-clock — parsing,
// recurrence, the daily briefing — is computed with these helpers so the app
// behaves correctly in any timezone, DST or not.
// ══════════════════════════════════════════════════════════════════════════════

export interface ZonedParts {
  year: number
  /** 1–12 */
  month: number
  /** 1–31 */
  day: number
  hour: number
  minute: number
  second: number
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
}

const WEEKDAY_PARTS = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short' })
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/** Offset (ms) that `tz` is ahead of UTC at the given instant. */
export function getTimezoneOffsetMs(instant: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  )
  return asUtc - instant.getTime()
}

/** Wall-clock components of an instant, observed in `tz`. */
export function getZonedParts(instant: Date, tz: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  })
  const parts: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
  }
}

/**
 * Convert a wall-clock time in `tz` to the matching UTC instant.
 * Resolves DST transitions by refining the offset once.
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0)
  let ts = guess - getTimezoneOffsetMs(new Date(guess), tz)
  const offsetAtTs = getTimezoneOffsetMs(new Date(ts), tz)
  const firstOffset = guess - ts
  if (offsetAtTs !== firstOffset) {
    ts = guess - offsetAtTs
  }
  return new Date(ts)
}

/** Instant of "local date `d` at h:mm" in `tz`. */
export function zonedDateToUtc(parts: ZonedParts | { year: number; month: number; day: number; hour: number; minute: number }, tz: string): Date {
  return zonedWallTimeToUtc(parts.year, parts.month, parts.day, parts.hour, parts.minute, tz)
}

/** UTC instant of local midnight for the local day containing `instant`. */
export function startOfLocalDay(instant: Date, tz: string): Date {
  const p = getZonedParts(instant, tz)
  return zonedWallTimeToUtc(p.year, p.month, p.day, 0, 0, tz)
}

export function endOfLocalDay(instant: Date, tz: string): Date {
  const p = getZonedParts(instant, tz)
  return zonedWallTimeToUtc(p.year, p.month, p.day, 23, 59, tz)
}

/** Add calendar days to the *wall clock* date of `instant` (keeps local time). */
export function addWallDays(instant: Date, days: number, tz: string): Date {
  const p = getZonedParts(instant, tz)
  return zonedWallTimeToUtc(p.year, p.month, p.day + days, p.hour, p.minute, tz)
}

/** "YYYY-MM-DD" of the local day containing `instant`. */
export function localDateKey(instant: Date, tz: string): string {
  const p = getZonedParts(instant, tz)
  const mm = String(p.month).padStart(2, '0')
  const dd = String(p.day).padStart(2, '0')
  return `${p.year}-${mm}-${dd}`
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** True when both instants fall on the same local day. */
export function isSameLocalDay(a: Date, b: Date, tz: string): boolean {
  return localDateKey(a, tz) === localDateKey(b, tz)
}

/** Difference in whole local days between two instants (negative = past). */
export function localDayDiff(a: Date, b: Date, tz: string): number {
  const pa = getZonedParts(a, tz)
  const pb = getZonedParts(b, tz)
  const ua = Date.UTC(pa.year, pa.month - 1, pa.day)
  const ub = Date.UTC(pb.year, pb.month - 1, pb.day)
  return Math.round((ub - ua) / 86_400_000)
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatTime(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  }).format(instant)
}

export function formatDate(instant: Date, tz: string, opts?: { withYear?: boolean }): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: opts?.withYear ? 'numeric' : undefined,
  }).format(instant)
}

export function formatDateLong(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(instant)
}

/** "9:00 AM", "All day" for all-day reminders. */
export function formatDueTime(dueAt: Date, isAllDay: boolean, hasTime: boolean, tz: string): string {
  if (isAllDay || !hasTime) return 'All day'
  return formatTime(dueAt, tz)
}

/**
 * Human label relative to `now`: Today / Tomorrow / Yesterday / weekday /
 * full date. Optionally appends the time.
 */
export function formatDueLabel(
  dueAt: Date,
  tz: string,
  now: Date,
  time?: string
): string {
  const diff = localDayDiff(now, dueAt, tz)
  let day: string
  if (diff === 0) day = 'Today'
  else if (diff === 1) day = 'Tomorrow'
  else if (diff === -1) day = 'Yesterday'
  else if (diff > 1 && diff <= 6) {
    day = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long' }).format(dueAt)
  } else {
    const sameYear = getZonedParts(dueAt, tz).year === getZonedParts(now, tz).year
    day = formatDate(dueAt, tz, { withYear: !sameYear })
  }
  return time ? `${day}, ${time}` : day
}

/** "Good morning" / "Good afternoon" / "Good evening" for the local hour. */
export function greetingFor(instant: Date, tz: string): string {
  const hour = getZonedParts(instant, tz).hour
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function detectedTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz || 'Asia/Kuala_Lumpur'
  } catch {
    return 'Asia/Kuala_Lumpur'
  }
}
