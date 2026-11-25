import { describe, expect, it } from 'vitest'
import {
  addWallDays,
  getZonedParts,
  getTimezoneOffsetMs,
  localDateKey,
  startOfLocalDay,
  zonedWallTimeToUtc,
} from '../time'

const TZ = 'Asia/Kuala_Lumpur'

describe('zonedWallTimeToUtc', () => {
  it('converts KL wall time (UTC+8) correctly', () => {
    const utc = zonedWallTimeToUtc(2026, 11, 25, 9, 0, TZ)
    expect(utc.toISOString()).toBe('2026-11-25T01:00:00.000Z')
  })

  it('handles US DST — summer (EDT, UTC-4)', () => {
    const utc = zonedWallTimeToUtc(2026, 7, 1, 9, 0, 'America/New_York')
    expect(utc.toISOString()).toBe('2026-07-01T13:00:00.000Z')
  })

  it('handles US DST — winter (EST, UTC-5)', () => {
    const utc = zonedWallTimeToUtc(2026, 1, 5, 9, 0, 'America/New_York')
    expect(utc.toISOString()).toBe('2026-01-05T14:00:00.000Z')
  })

  it('round-trips through getZonedParts', () => {
    const utc = zonedWallTimeToUtc(2026, 11, 25, 15, 45, TZ)
    const parts = getZonedParts(utc, TZ)
    expect(parts.year).toBe(2026)
    expect(parts.month).toBe(11)
    expect(parts.day).toBe(25)
    expect(parts.hour).toBe(15)
    expect(parts.minute).toBe(45)
  })

  it('startOfLocalDay gives local midnight', () => {
    const now = zonedWallTimeToUtc(2026, 11, 25, 10, 30, TZ)
    const start = startOfLocalDay(now, TZ)
    expect(start.toISOString()).toBe('2026-11-24T16:00:00.000Z')
    expect(getZonedParts(start, TZ).hour).toBe(0)
  })
})

describe('getTimezoneOffsetMs', () => {
  it('KL is +8h year-round', () => {
    const jan = getTimezoneOffsetMs(new Date('2026-01-15T00:00:00Z'), TZ)
    const jul = getTimezoneOffsetMs(new Date('2026-07-15T00:00:00Z'), TZ)
    expect(jan).toBe(8 * 3600_000)
    expect(jul).toBe(8 * 3600_000)
  })

  it('New York flips between EST and EDT', () => {
    const winter = getTimezoneOffsetMs(new Date('2026-01-15T12:00:00Z'), 'America/New_York')
    const summer = getTimezoneOffsetMs(new Date('2026-07-15T12:00:00Z'), 'America/New_York')
    expect(winter).toBe(-5 * 3600_000)
    expect(summer).toBe(-4 * 3600_000)
  })
})

describe('wall-clock day math', () => {
  it('addWallDays keeps the local time', () => {
    const base = zonedWallTimeToUtc(2026, 11, 25, 9, 0, TZ)
    const next = addWallDays(base, 1, TZ)
    expect(next.toISOString()).toBe('2026-11-26T01:00:00.000Z')
  })

  it('localDateKey formats YYYY-MM-DD', () => {
    const base = zonedWallTimeToUtc(2026, 11, 25, 0, 30, TZ) // still Nov 25 locally
    expect(localDateKey(base, TZ)).toBe('2026-11-25')
  })
})
