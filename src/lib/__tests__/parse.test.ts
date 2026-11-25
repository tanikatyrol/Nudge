import { describe, expect, it } from 'vitest'
import { parseReminder } from '../parse'
import { zonedWallTimeToUtc } from '../time'

// Wednesday 25 November 2026, 10:00 AM Kuala Lumpur time
const NOW = zonedWallTimeToUtc(2026, 11, 25, 10, 0, 'Asia/Kuala_Lumpur')
const TZ = 'Asia/Kuala_Lumpur'

const iso = (y: number, mo: number, d: number, h: number, mi = 0) =>
  zonedWallTimeToUtc(y, mo, d, h, mi, TZ).toISOString()

describe('parseReminder — dates', () => {
  it('tomorrow + explicit time', () => {
    const r = parseReminder('Pay electricity bill tomorrow at 9 AM', NOW, TZ)
    expect(r.title).toBe('Pay electricity bill')
    expect(r.dueAtIso).toBe(iso(2026, 11, 26, 9))
    expect(r.hasTime).toBe(true)
    expect(r.categoryKey).toBe('bills')
    expect(r.needsConfirm).toBe(false)
  })

  it('date without time defaults to 9:00 and is still confident', () => {
    const r = parseReminder('Call mum tomorrow', NOW, TZ)
    expect(r.dueAtIso).toBe(iso(2026, 11, 26, 9))
    expect(r.hasTime).toBe(false)
    expect(r.needsConfirm).toBe(false)
  })

  it('weekday name resolves to the coming Friday', () => {
    const r = parseReminder('Submit tax report by friday', NOW, TZ)
    expect(r.title).toBe('Submit tax report')
    expect(r.dueAtIso).toBe(iso(2026, 11, 27, 9))
    expect(r.categoryKey).toBe('bills') // "tax"
  })

  it('next friday (from Wednesday) means next week', () => {
    const r = parseReminder('Team offsite next friday', NOW, TZ)
    expect(r.dueAtIso).toBe(iso(2026, 12, 4, 9))
  })

  it('explicit day-month date rolls to next year when past', () => {
    const r = parseReminder("Mum's birthday on March 3", NOW, TZ)
    expect(r.title).toBe("Mum's birthday")
    expect(r.dueAtIso).toBe(iso(2027, 3, 3, 9))
    expect(r.categoryKey).toBe('personal')
  })

  it('day/month numeric date (day-first, en-MY)', () => {
    const r = parseReminder('Renew road tax on 1/12', NOW, TZ)
    expect(r.dueAtIso).toBe(iso(2026, 12, 1, 9))
    expect(r.categoryKey).toBe('bills')
  })

  it('in N days', () => {
    const r = parseReminder('Back up the laptop in 3 days', NOW, TZ)
    expect(r.dueAtIso).toBe(iso(2026, 11, 28, 9))
  })

  it('in N hours keeps exact minutes', () => {
    const r = parseReminder('Take the cake out of the oven in 2 hours', NOW, TZ)
    expect(r.dueAtIso).toBe('2026-11-25T04:00:00.000Z') // 12:00 KL
    expect(r.hasTime).toBe(true)
  })

  it('next month keeps the day-of-month', () => {
    const r = parseReminder('Change water filter next month', NOW, TZ)
    expect(r.dueAtIso).toBe(iso(2026, 12, 25, 9))
    expect(r.categoryKey).toBe('home')
    expect(r.needsConfirm).toBe(false)
  })

  it('time-only captures land today, or tomorrow when past', () => {
    const morning = parseReminder('Read at 8am', NOW, TZ)
    expect(morning.dueAtIso).toBe('2026-11-26T00:00:00.000Z') // 8am today passed (10am now) → tomorrow
    const evening = parseReminder('Read at 9pm', NOW, TZ)
    expect(evening.dueAtIso).toBe(iso(2026, 11, 25, 21))
  })

  it('tonight maps to today 20:00', () => {
    const r = parseReminder('Call the bank tonight', NOW, TZ)
    expect(r.dueAtIso).toBe(iso(2026, 11, 25, 20))
  })

  it('morning/afternoon/evening words set times', () => {
    const r = parseReminder('Water the plants tomorrow morning', NOW, TZ)
    expect(r.dueAtIso).toBe(iso(2026, 11, 26, 9))
    expect(r.categoryKey).toBe('home')
  })

  it('Malaysian shorthand "tmr" works', () => {
    const r = parseReminder('Pay tmr 3pm', NOW, TZ)
    expect(r.dueAtIso).toBe(iso(2026, 11, 26, 15))
  })

  it('colon times without am/pm', () => {
    const r = parseReminder('Meeting tomorrow 14:30', NOW, TZ)
    expect(r.dueAtIso).toBe(iso(2026, 11, 26, 14, 30))
  })

  it('bare times with "at"', () => {
    const r = parseReminder('Call dentist at 5pm tomorrow', NOW, TZ)
    expect(r.dueAtIso).toBe(iso(2026, 11, 26, 17))
  })
})

describe('parseReminder — recurrence', () => {
  it('daily with a time', () => {
    const r = parseReminder('Take vitamins daily at 8am', NOW, TZ)
    expect(r.recurrence.type).toBe('daily')
    expect(r.recurrence.interval).toBe(1)
    expect(r.dueAtIso).toBe('2026-11-26T00:00:00.000Z') // 8am passed → tomorrow
    expect(r.categoryKey).toBe('health')
    expect(r.needsConfirm).toBe(false)
  })

  it('every monday', () => {
    const r = parseReminder('Call mum every sunday', NOW, TZ)
    expect(r.recurrence.type).toBe('weekly')
    expect(r.recurrence.weekdays).toEqual([0])
    expect(r.dueAtIso).toBe(iso(2026, 11, 29, 9))
  })

  it('every mon and thu', () => {
    const r = parseReminder('Water the plants every mon and thu', NOW, TZ)
    expect(r.recurrence.type).toBe('weekly')
    expect([...r.recurrence.weekdays].sort()).toEqual([1, 4])
    expect(r.title).toBe('Water the plants')
  })

  it('every weekday', () => {
    const r = parseReminder('Team standup every weekday at 9:30am', NOW, TZ)
    expect(r.recurrence.weekdays).toEqual([1, 2, 3, 4, 5])
    expect(r.dueAtIso).toBe(iso(2026, 11, 26, 9, 30))
    expect(r.categoryKey).toBe('work')
  })

  it('every 6 months', () => {
    const r = parseReminder('Service the car every 6 months', NOW, TZ)
    expect(r.recurrence.type).toBe('monthly')
    expect(r.recurrence.interval).toBe(6)
    expect(r.categoryKey).toBe('home')
  })

  it('every other day', () => {
    const r = parseReminder('Water the fern every other day', NOW, TZ)
    expect(r.recurrence.type).toBe('daily')
    expect(r.recurrence.interval).toBe(2)
  })

  it('weekly rolls to the next matching weekday from today', () => {
    const r = parseReminder('Change bedsheets every saturday', NOW, TZ)
    expect(r.recurrence.weekdays).toEqual([6])
    expect(r.dueAtIso).toBe(iso(2026, 11, 28, 9))
  })

  it('daily without time schedules tomorrow at 9am', () => {
    const r = parseReminder('Stretch daily', NOW, TZ)
    expect(r.recurrence.type).toBe('daily')
    expect(r.dueAtIso).toBe(iso(2026, 11, 26, 9))
  })
})

describe('parseReminder — lists', () => {
  it('buy X when I go shopping → Shopping list', () => {
    const r = parseReminder('Buy milk when I go shopping', NOW, TZ)
    expect(r.listName).toBe('Shopping')
    expect(r.title).toBe('Buy milk')
    expect(r.dueAtIso).toBeNull()
    expect(r.needsConfirm).toBe(false)
  })

  it('add to list phrasing', () => {
    const r = parseReminder('add toilet paper to shopping list', NOW, TZ)
    expect(r.listName).toBe('Shopping')
    expect(r.title).toBe('Toilet paper')
  })

  it('bare "buy X" without schedule → Shopping list', () => {
    const r = parseReminder('Buy eggs and bread', NOW, TZ)
    expect(r.listName).toBe('Shopping')
    expect(r.title).toBe('Buy eggs and bread')
  })

  it('buy with a schedule stays a reminder', () => {
    const r = parseReminder('Buy a gift for dad tomorrow', NOW, TZ)
    expect(r.listName).toBeNull()
    expect(r.dueAtIso).toBe(iso(2026, 11, 26, 9))
    expect(r.categoryKey).toBe('personal')
  })
})

describe('parseReminder — cleanup & fallback', () => {
  it('strips filler phrases', () => {
    const r = parseReminder('Remind me to book dentist appointment tomorrow', NOW, TZ)
    expect(r.title).toBe('Book dentist appointment')
    expect(r.categoryKey).toBe('health')
  })

  it('no date at all → someday, low confidence, no forced confirm', () => {
    const r = parseReminder('Learn pottery', NOW, TZ)
    expect(r.dueAtIso).toBeNull()
    expect(r.recurrence.type).toBe('none')
    expect(r.confidence).toBe('low')
    expect(r.needsConfirm).toBe(false)
    expect(r.categoryKey).toBe('personal')
  })

  it('filler + vague date asks for confirmation', () => {
    const r = parseReminder('Start the report next week', NOW, TZ)
    expect(r.needsConfirm).toBe(true)
    expect(r.confidence).toBe('medium')
  })
})
