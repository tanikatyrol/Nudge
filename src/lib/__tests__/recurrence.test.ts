import { describe, expect, it } from 'vitest'
import { advancePast, formatRecurrence, nextOccurrence } from '../recurrence'
import { zonedWallTimeToUtc } from '../time'
import type { RecurrenceRule } from '@/types'

const TZ = 'Asia/Kuala_Lumpur'
const at = (y: number, mo: number, d: number, h: number, mi = 0) =>
  zonedWallTimeToUtc(y, mo, d, h, mi, TZ)

describe('nextOccurrence', () => {
  it('daily → next day, same local time', () => {
    const rule: RecurrenceRule = { type: 'daily', interval: 1, weekdays: [] }
    const next = nextOccurrence(at(2026, 11, 25, 9), rule, TZ)
    expect(next.toISOString()).toBe('2026-11-26T01:00:00.000Z')
  })

  it('every 3 days', () => {
    const rule: RecurrenceRule = { type: 'daily', interval: 3, weekdays: [] }
    const next = nextOccurrence(at(2026, 11, 25, 9), rule, TZ)
    expect(next.toISOString()).toBe('2026-11-28T01:00:00.000Z')
  })

  it('weekly with weekdays picks the next matching day (Wed → Mon)', () => {
    const rule: RecurrenceRule = { type: 'weekly', interval: 1, weekdays: [1] } // Mondays
    const next = nextOccurrence(at(2026, 11, 25, 9), rule, TZ) // Wed Nov 25
    expect(next.toISOString()).toBe('2026-11-30T01:00:00.000Z')
  })

  it('weekly multi-day (Mon & Thu) from Wednesday → Thursday', () => {
    const rule: RecurrenceRule = { type: 'weekly', interval: 1, weekdays: [1, 4] }
    const next = nextOccurrence(at(2026, 11, 25, 9), rule, TZ)
    expect(next.toISOString()).toBe('2026-11-26T01:00:00.000Z')
  })

  it('weekly without weekdays → same weekday next week', () => {
    const rule: RecurrenceRule = { type: 'weekly', interval: 1, weekdays: [] }
    const next = nextOccurrence(at(2026, 11, 25, 9), rule, TZ)
    expect(next.toISOString()).toBe('2026-12-02T01:00:00.000Z')
  })

  it('monthly clamps to month length (Jan 31 → Feb 28 in 2026)', () => {
    const rule: RecurrenceRule = { type: 'monthly', interval: 1, weekdays: [] }
    const next = nextOccurrence(at(2026, 1, 31, 9), rule, TZ)
    expect(next.toISOString()).toBe('2026-02-28T01:00:00.000Z')
  })

  it('monthly keeps same local time across months', () => {
    const rule: RecurrenceRule = { type: 'monthly', interval: 1, weekdays: [] }
    const next = nextOccurrence(at(2026, 11, 25, 9), rule, TZ)
    expect(next.toISOString()).toBe('2026-12-25T01:00:00.000Z')
  })

  it('monthly interval 12 behaves as yearly', () => {
    const rule: RecurrenceRule = { type: 'monthly', interval: 12, weekdays: [] }
    const next = nextOccurrence(at(2026, 11, 25, 9), rule, TZ)
    expect(next.toISOString()).toBe('2027-11-25T01:00:00.000Z')
  })
})

describe('advancePast', () => {
  it('catches up after downtime (many missed daily occurrences)', () => {
    const rule: RecurrenceRule = { type: 'daily', interval: 1, weekdays: [] }
    const due = at(2026, 11, 1, 9)
    const now = at(2026, 11, 25, 10)
    const next = advancePast(due, rule, TZ, now)
    expect(next.toISOString()).toBe('2026-11-26T01:00:00.000Z')
  })

  it('non-recurring rules return the same instant', () => {
    const rule: RecurrenceRule = { type: 'none', interval: 1, weekdays: [] }
    const due = at(2026, 11, 25, 9)
    expect(advancePast(due, rule, TZ, at(2026, 11, 25, 10)).getTime()).toBe(due.getTime())
  })
})

describe('formatRecurrence', () => {
  it('labels every interval type', () => {
    expect(formatRecurrence({ type: 'none', interval: 1, weekdays: [] })).toBeNull()
    expect(formatRecurrence({ type: 'daily', interval: 1, weekdays: [] })).toBe('Every day')
    expect(formatRecurrence({ type: 'daily', interval: 3, weekdays: [] })).toBe('Every 3 days')
    expect(formatRecurrence({ type: 'weekly', interval: 1, weekdays: [1, 4] })).toBe('Every Mon & Thu')
    expect(formatRecurrence({ type: 'monthly', interval: 12, weekdays: [] })).toBe('Every year')
    expect(formatRecurrence({ type: 'monthly', interval: 6, weekdays: [] })).toBe('Every 6 months')
  })
})
