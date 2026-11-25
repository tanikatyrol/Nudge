// ══════════════════════════════════════════════════════════════════════════════
// Natural-language reminder parser (rule-based, timezone-aware, no AI needed).
//
//   "Pay electricity bill tomorrow at 9 AM"   → Bills, tomorrow 09:00
//   "Change water filter next month"          → Home, 25th next month 09:00
//   "Buy milk when I go shopping"             → Shopping list item "Buy milk"
//   "Service the car every 6 months"          → recurring every 6 months
//
// The same module runs on the client (live preview while typing) and on the
// server (authoritative parse in /api/capture). An optional AI assist can be
// layered on top in /api/capture — this parser is always the fallback.
// ══════════════════════════════════════════════════════════════════════════════

import type { RecurrenceRule } from '@/types'
import { nextOccurrence } from './recurrence'
import { getZonedParts, zonedWallTimeToUtc } from './time'

export type CategoryKey = 'personal' | 'shopping' | 'bills' | 'home' | 'health' | 'work'

export interface ParseResult {
  title: string
  /** ISO UTC instant, or null for "someday" reminders */
  dueAtIso: string | null
  isAllDay: boolean
  /** true when the user explicitly gave a time of day */
  hasTime: boolean
  recurrence: RecurrenceRule
  categoryKey: CategoryKey
  /** non-null → this capture belongs on a quick list, not a reminder */
  listName: string | null
  confidence: 'high' | 'medium' | 'low'
  /** true → open the confirm sheet so the user can adjust the guess */
  needsConfirm: boolean
  explanation: string
}

// ── token tables ──────────────────────────────────────────────────────────────

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}
const MONTH_INDEX: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const WD = 'sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?'
const MO = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'

const RX = {
  fillers:
    /^\s*(?:hey\s+nudge[,!\s]+|please\s+)?(?:remind\s+me\s+(?:to|about|that)?\s*|remember\s+(?:to|that)\s+|i\s+need\s+to\s+|i\s+have\s+to\s+|i\s+should\s+|don'?t\s+forget\s+to\s+|dont\s+forget\s+to\s+|note\s+to\s+self[:,]?\s*|nudge\s+me\s+to\s+)/i,
  listClause: /[\s,]*\b(?:when|if|while)\s+i\s+(?:go\s+|do\s+)?shopping\b[\s.!]*/i,
  addToList:
    /^\s*(?:add|put)\s+(?<item>.+?)\s+(?:to|on|in)\s+(?:my\s+|the\s+)?(?<list>shopping|groceries|grocery|todo|to-?do|to\s+do|wishlist)?\s*list\b[\s.!]*/i,
  everyN: /\bevery\s+(?<n>\d+)\s*(?<unit>days?|weeks?|months?|years?)\b/i,
  everyOther: /\bevery\s+other\s+(?<unit>days?|weeks?|months?)\b/i,
  everySimple: /\b(?:daily|weekly|monthly|yearly|annually|every\s+day|every\s+week|every\s+month|every\s+year)\b/i,
  everyWeekday: new RegExp(`\\bevery\\s+(?:on\\s+)?(?<first>${WD})\\b`, 'i'),
  everyWeekdaysSet: /\bevery\s+weekday\b/i,
  tonight: /\btonight\b/i,
  today: /\btoday\b/i,
  tomorrow: /\b(?:tomorrow|tomorrows|tmrw?|tmrws?)\b/i,
  dayAfter: /\bthe\s+day\s+after\s+tomorrow\b/i,
  nextUnit: /\bnext\s+(?<unit>week|month|year)\b/i,
  thisWeekend: /\bthis\s+weekend\b/i,
  inX: /\bin\s+(?<n>\d+)\s*(?<unit>days?|weeks?|months?|hours?|hrs?|minutes?|mins?)\b/i,
  weekday: new RegExp(`\\b(?<prefix>next\\s+|this\\s+|on\\s+|by\\s+|before\\s+)?(?<wd>${WD})\\b`, 'i'),
  weekdayExtend: new RegExp(`^\\s*(?:,|and|&|\\+)?\\s*(?<wd>${WD})\\b`, 'i'),
  dayMonth: new RegExp(
    `\\b(?:on\\s+|by\\s+|before\\s+|starting\\s+|from\\s+|due\\s+)?(?<day>\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?<month>${MO})\\b(?:\\s+(?<year>\\d{4}))?`,
    'i'
  ),
  monthDay: new RegExp(
    `\\b(?:on\\s+|by\\s+|before\\s+|starting\\s+|from\\s+|due\\s+)?(?<month>${MO})\\.?\\s+(?<day>\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s+(?<year>\\d{4}))?`,
    'i'
  ),
  numeric: /\b(?:on\s+|by\s+|due\s+)?(?<d>\d{1,2})[\/-](?<m>\d{1,2})(?:[\/-](?<y>\d{2,4}))?\b/,
  endOfMonth: /\bend\s+of\s+(?:the\s+)?month\b/i,
  meridiem: /\b(?:at\s*|from\s*)?(?<h>\d{1,2})(?::(?<mi>\d{2}))?\s*(?<mer>a\.?m\.?|p\.?m\.?)\b/i,
  atTime: /\bat\s*(?<h>\d{1,2})(?::(?<mi>\d{2}))?\b/i,
  colonTime: /\b(?<h>\d{1,2}):(?<mi>\d{2})\b/,
  noon: /\b(?:noon|midday|midnight)\b/i,
  timeWords: /\b(?<word>mornings?|afternoons?|evenings?|nights?|lunch(?:time)?)\b/i,
  allDay: /\ball[\s-]?day\b/i,
}

const TIME_WORD_HOUR: Record<string, { hour: number; minute: number }> = {
  morning: { hour: 9, minute: 0 },
  afternoon: { hour: 14, minute: 0 },
  evening: { hour: 18, minute: 0 },
  night: { hour: 20, minute: 0 },
  lunch: { hour: 12, minute: 30 },
}

// ── category keywords (first matching bucket wins, scanned in order) ─────────

const CATEGORY_KEYWORDS: Array<[CategoryKey, RegExp]> = [
  ['bills', /\b(pay|paying|paid|bill|bills|electricity|water bill|internet|wifi|broadband|rent|insurance|invoice|credit card|loan|tax|taxes|utilities|road ?tax|unifi|astro|subscription|council|assessment|utility)\b/i],
  ['personal', /\b(mom|mum|dad|family|birthday|anniversary|gift|gifts|present|haircut|barber|salon|journal|meditat(?:e|ion)|read|reading|call|catch up|friend|friends|date night|passport|license|ic renewal|visa|trip|holiday|vacation|flight|hotel|pack|renew|bake|photo|backup|nap)\b/i],
  ['shopping', /\b(buy|purchase|order|shop|shopping|groceries|grocery|supermarket|market|milk|eggs|bread|rice|restock|toilet paper|detergent)\b/i],
  ['health', /\b(doctor|dentist|dental|clinic|hospital|medication|medicine|meds|pills?|vitamins?|supplement|supplements|prescription|pharmacy|workout|gym|exercise|exercises|yoga|jog|floss|toothbrush(es)?|teeth|flu shot|vaccine|vaccines|checkup|check-up|blood test|therapy|hydrate|drink water|stretch)\b/i],
  ['home', /\b(clean|vacuum|laundry|wash|dishes|trash|garbage|bins?|bedsheets?|bed sheets?|sheets|mop|dust(?!er)|filter|filters|water (?:the )?plants|plants?|garden|mow|aircon|air cond|ac service|air filter|light ?bulb|bulb|bulbs|fix|repair|organize|declutter|\bcar\b|car service|tyre|tyres|tire|tires|oil change|pest control|gutter|smoke alarm|batter(?:y|ies))\b/i],
  ['work', /\b(meeting|meetings|stand-?up|sprint|retro|retrospective|deadline|deadlines|submit|submission|report|reports|presentation|deck|email|reply|follow[- ]?up|client|clients|review|deploy|release|ship|timesheet|expense|1:1|one-on-one|interview|quarterly|kickoff|demo|call with)\b/i],
]

function guessCategoryKey(text: string): CategoryKey {
  for (const [key, rx] of CATEGORY_KEYWORDS) {
    if (rx.test(text)) return key
  }
  return 'personal'
}

// ── helpers ───────────────────────────────────────────────────────────────────

function weekdayFromToken(token: string): number | null {
  const key = token.toLowerCase().slice(0, 3)
  return key in WEEKDAY_INDEX ? WEEKDAY_INDEX[key] : null
}

function monthFromToken(token: string): number | null {
  const key = token.toLowerCase().slice(0, 3)
  return key in MONTH_INDEX ? MONTH_INDEX[key] : null
}

function cut(s: string, match: string): string {
  const idx = s.toLowerCase().indexOf(match.toLowerCase())
  if (idx === -1) return s
  return (s.slice(0, idx) + ' ' + s.slice(idx + match.length)).replace(/\s{2,}/g, ' ')
}

function cleanTitle(raw: string): string {
  let t = raw.replace(RX.fillers, ' ')
  for (let i = 0; i < 4; i++) {
    const before = t
    t = t.replace(/\s+\b(?:at|on|by|in|every|each|next|this|due|from|starting|before|after|until|of|and)\s*$/i, '')
    if (t === before) break
  }
  t = t
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.;:!'"-]+|[\s,.;:!'"-]+$/g, '')
    .trim()
  if (t.length > 0) {
    const firstAlpha = t.search(/[a-zA-Z0-9]/)
    if (firstAlpha > 0) t = t.slice(firstAlpha)
    t = t.charAt(0).toUpperCase() + t.slice(1)
  }
  return t
}

function defaultTime() {
  return { hour: 9, minute: 0 }
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate())
}

function addWallDaysTo(year: number, month: number, day: number, days: number) {
  return zonedWallTimeToUtc(year, month, day + days, 12, 0, 'UTC').getTime() // placeholder, replaced below
}

// ── main parser ───────────────────────────────────────────────────────────────

export function parseReminder(text: string, now: Date, tz: string): ParseResult {
  const original = text.trim()
  let s = ` ${original} `

  // 0) strip leading fillers
  s = s.replace(RX.fillers, ' ')

  // 1) explicit list intent ("add milk to shopping list") ----------------------
  let listName: string | null = null
  const addMatch = s.match(RX.addToList)
  if (addMatch?.groups) {
    const rawItem = addMatch.groups.item?.trim() ?? ''
    const rawList = (addMatch.groups.list ?? '').toLowerCase()
    const cleaned = cleanTitle(rawItem)
    if (cleaned.length >= 1) {
      listName =
        rawList === 'shopping' || rawList === 'groceries' || rawList === 'grocery' || rawList === 'wishlist'
          ? 'Shopping'
          : 'To-do'
      return finalize(cleaned, null, false, false, { type: 'none', interval: 1, weekdays: [] }, 'shopping', listName, 'high', tz, now, false)
    }
  }

  // trailing "when I go shopping" clause
  const clause = s.match(RX.listClause)
  if (clause) {
    s = cut(s, clause[0])
    listName = 'Shopping'
  }

  // 2) recurrence ---------------------------------------------------------------
  let recurrence: RecurrenceRule | null = null

  const everyOther = s.match(RX.everyOther)
  const everyN = s.match(RX.everyN)
  const everySimple = s.match(RX.everySimple)

  if (everyOther?.groups) {
    const unit = everyOther.groups.unit.toLowerCase()
    recurrence = { type: 'daily', interval: 2, weekdays: [] }
    if (unit.startsWith('week')) recurrence = { type: 'weekly', interval: 2, weekdays: [] }
    if (unit.startsWith('month')) recurrence = { type: 'monthly', interval: 2, weekdays: [] }
    s = cut(s, everyOther[0])
  } else if (everyN?.groups) {
    const n = Math.min(365, Math.max(1, parseInt(everyN.groups.n, 10) || 1))
    const unit = everyN.groups.unit.toLowerCase()
    recurrence = { type: 'daily', interval: n, weekdays: [] }
    if (unit.startsWith('week')) recurrence = { type: 'weekly', interval: n, weekdays: [] }
    if (unit.startsWith('month')) recurrence = { type: 'monthly', interval: n, weekdays: [] }
    if (unit.startsWith('year')) recurrence = { type: 'monthly', interval: Math.min(365, n * 12), weekdays: [] }
    s = cut(s, everyN[0])
  } else {
    const wdMatch = s.match(RX.everyWeekday)
    if (wdMatch?.groups) {
      const weekdays = new Set<number>()
      const first = weekdayFromToken(wdMatch.groups.first)
      if (first !== null) weekdays.add(first)
      s = cut(s, wdMatch[0])
      for (let i = 0; i < 5; i++) {
        // "every mon and thu" / "every mon, thu, fri" — continuation may sit
        // anywhere after the first weekday
        const ext = s.match(new RegExp(`\\s*(?:,|and|&|\\+)\\s*(?<wd>${WD})\\b`, 'i'))
        if (!ext?.groups) break
        const idx = weekdayFromToken(ext.groups.wd)
        if (idx === null) break
        weekdays.add(idx)
        s = cut(s, ext[0])
      }
      recurrence = { type: 'weekly', interval: 1, weekdays: [...weekdays] }
    } else if (RX.everyWeekdaysSet.test(s)) {
      recurrence = { type: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] }
      const m = s.match(RX.everyWeekdaysSet)
      if (m) s = cut(s, m[0])
    } else if (everySimple) {
      const word = everySimple[0].toLowerCase()
      if (word === 'daily' || word === 'every day') recurrence = { type: 'daily', interval: 1, weekdays: [] }
      else if (word === 'weekly' || word === 'every week') recurrence = { type: 'weekly', interval: 1, weekdays: [] }
      else if (word === 'monthly' || word === 'every month') recurrence = { type: 'monthly', interval: 1, weekdays: [] }
      else if (word === 'yearly' || word === 'annually' || word === 'every year')
        recurrence = { type: 'monthly', interval: 12, weekdays: [] }
      s = cut(s, everySimple[0])
    }
  }

  // 3) date ----------------------------------------------------------------------
  let date: { year: number; month: number; day: number } | null = null
  let dateSource: 'explicit' | 'weekday' | 'guessed' = 'explicit'
  let relativeTime: { hour: number; minute: number } | null = null

  const tonightMatch = s.match(RX.tonight)
  if (tonightMatch) {
    const np = getZonedParts(now, tz)
    date = { year: np.year, month: np.month, day: np.day }
    s = cut(s, tonightMatch[0])
  }

  if (!date) {
    const dayAfter = s.match(RX.dayAfter)
    if (dayAfter) {
      const d = new Date(now.getTime() + 2 * 86_400_000)
      const np = getZonedParts(d, tz)
      date = { year: np.year, month: np.month, day: np.day }
      s = cut(s, dayAfter[0])
    }
  }

  if (!date) {
    const tomorrow = s.match(RX.tomorrow)
    if (tomorrow) {
      const d = new Date(now.getTime() + 86_400_000)
      const np = getZonedParts(d, tz)
      date = { year: np.year, month: np.month, day: np.day }
      s = cut(s, tomorrow[0])
    }
  }

  if (!date) {
    const todayMatch = s.match(RX.today)
    if (todayMatch) {
      const np = getZonedParts(now, tz)
      date = { year: np.year, month: np.month, day: np.day }
      s = cut(s, todayMatch[0])
    }
  }

  if (!date) {
    const inX = s.match(RX.inX)
    if (inX?.groups) {
      const n = parseInt(inX.groups.n, 10) || 1
      const unit = inX.groups.unit.toLowerCase()
      if (unit.startsWith('hour') || unit.startsWith('hr') || unit.startsWith('min')) {
        const ms = unit.startsWith('min') ? n * 60_000 : n * 3_600_000
        const d = new Date(now.getTime() + ms)
        const np = getZonedParts(d, tz)
        date = { year: np.year, month: np.month, day: np.day }
        relativeTime = { hour: np.hour, minute: np.minute }
        s = cut(s, inX[0])
      } else {
        const base = getZonedParts(now, tz)
        let year = base.year
        let month = base.month
        let day = base.day
        if (unit.startsWith('week')) day += n * 7
        else if (unit.startsWith('month')) {
          month += n
          while (month > 12) {
            month -= 12
            year += 1
          }
        } else if (unit.startsWith('day')) {
          day += n
        }
        date = { year, month, day: clampDay(year, month, day) }
        s = cut(s, inX[0])
      }
    }
  }

  if (!date) {
    const nextUnit = s.match(RX.nextUnit)
    if (nextUnit?.groups) {
      const unit = nextUnit.groups.unit.toLowerCase()
      const base = getZonedParts(now, tz)
      if (unit === 'week') {
        // "next week" → Monday of the following week (a guess → confirm)
        const deltaToMonday = ((8 - base.weekday) % 7) || 7
        const d = zonedWallTimeToUtc(base.year, base.month, base.day + deltaToMonday, 9, 0, tz)
        const np = getZonedParts(d, tz)
        date = { year: np.year, month: np.month, day: np.day }
        dateSource = 'guessed'
      } else if (unit === 'month') {
        let month = base.month + 1
        let year = base.year
        if (month > 12) {
          month = 1
          year += 1
        }
        date = { year, month, day: clampDay(year, month, base.day) }
      } else {
        date = { year: base.year + 1, month: base.month, day: base.day }
      }
      s = cut(s, nextUnit[0])
    }
  }

  if (!date) {
    const weekend = s.match(RX.thisWeekend)
    if (weekend) {
      const base = getZonedParts(now, tz)
      const delta = ((6 - base.weekday + 7) % 7) || 7
      const d = zonedWallTimeToUtc(base.year, base.month, base.day + delta, 10, 0, tz)
      const np = getZonedParts(d, tz)
      date = { year: np.year, month: np.month, day: np.day }
      dateSource = 'guessed'
      s = cut(s, weekend[0])
    }
  }

  if (!date) {
    const dm = s.match(RX.dayMonth)
    if (dm?.groups) {
      const month = monthFromToken(dm.groups.month)
      const day = parseInt(dm.groups.day, 10)
      if (month !== null && day >= 1 && day <= 31) {
        const base = getZonedParts(now, tz)
        let year = dm.groups.year ? parseInt(dm.groups.year, 10) : base.year
        if (!dm.groups.year && (month < base.month || (month === base.month && day < base.day))) year += 1
        date = { year, month, day: clampDay(year, month, day) }
        s = cut(s, dm[0])
      }
    }
  }

  if (!date) {
    const md = s.match(RX.monthDay)
    if (md?.groups) {
      const month = monthFromToken(md.groups.month)
      const day = parseInt(md.groups.day, 10)
      if (month !== null && day >= 1 && day <= 31) {
        const base = getZonedParts(now, tz)
        let year = md.groups.year ? parseInt(md.groups.year, 10) : base.year
        if (!md.groups.year && (month < base.month || (month === base.month && day < base.day))) year += 1
        date = { year, month, day: clampDay(year, month, day) }
        s = cut(s, md[0])
      }
    }
  }

  if (!date) {
    const num = s.match(RX.numeric)
    if (num?.groups) {
      const d = parseInt(num.groups.d, 10)
      const m = parseInt(num.groups.m, 10)
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const base = getZonedParts(now, tz)
        let year = base.year
        if (num.groups.y) {
          const y = parseInt(num.groups.y, 10)
          year = y < 100 ? 2000 + y : y
        } else if (m < base.month || (m === base.month && d < base.day)) {
          year += 1
        }
        date = { year, month: m, day: clampDay(year, m, d) }
        s = cut(s, num[0])
      }
    }
  }

  if (!date) {
    const eom = s.match(RX.endOfMonth)
    if (eom) {
      const base = getZonedParts(now, tz)
      date = { year: base.year, month: base.month, day: new Date(Date.UTC(base.year, base.month, 0)).getUTCDate() }
      s = cut(s, eom[0])
    }
  }

  if (!date) {
    const wd = s.match(RX.weekday)
    if (wd?.groups?.wd) {
      const target = weekdayFromToken(wd.groups.wd)
      if (target !== null) {
        const base = getZonedParts(now, tz)
        const isNext = (wd.groups.prefix ?? '').trim().toLowerCase() === 'next'
        let delta = ((target - base.weekday + 7) % 7) || 7
        if (isNext && delta < 7) delta += 7
        const d = zonedWallTimeToUtc(base.year, base.month, base.day + delta, 9, 0, tz)
        const np = getZonedParts(d, tz)
        date = { year: np.year, month: np.month, day: np.day }
        dateSource = 'weekday'
        s = cut(s, wd[0])
        // extend "on mon and thu"
        for (let i = 0; i < 5; i++) {
          const ext = s.match(RX.weekdayExtend)
          if (!ext?.groups) break
          const idx = weekdayFromToken(ext.groups.wd)
          if (idx === null) break
          s = cut(s, ext[0])
          if (!recurrence) recurrence = { type: 'weekly', interval: 1, weekdays: [] }
          if (!recurrence.weekdays.includes(target)) recurrence.weekdays.push(target)
          if (!recurrence.weekdays.includes(idx)) recurrence.weekdays.push(idx)
        }
      }
    }
  }

  // 4) time --------------------------------------------------------------------
  let time: { hour: number; minute: number } | null = null
  let timeExplicit = false

  if (relativeTime) {
    time = relativeTime
    timeExplicit = true
  }

  if (tonightMatch && !relativeTime) {
    time = { hour: 20, minute: 0 }
    timeExplicit = true
  }

  if (!time) {
    const mer = s.match(RX.meridiem)
    if (mer?.groups) {
      let hour = parseInt(mer.groups.h, 10)
      const minute = mer.groups.mi ? parseInt(mer.groups.mi, 10) : 0
      const merText = (mer.groups.mer ?? '').toLowerCase()
      if (merText.startsWith('p') && hour < 12) hour += 12
      if (merText.startsWith('a') && hour === 12) hour = 0
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        time = { hour, minute }
        timeExplicit = true
        s = cut(s, mer[0])
      }
    }
  }

  if (!time) {
    const noon = s.match(RX.noon)
    if (noon) {
      time = noon[0].toLowerCase() === 'midnight' ? { hour: 0, minute: 0 } : { hour: 12, minute: 0 }
      timeExplicit = true
      s = cut(s, noon[0])
    }
  }

  if (!time) {
    const tw = s.match(RX.timeWords)
    if (tw?.groups) {
      const key = tw.groups.word.toLowerCase().replace(/s$/, '').replace('time', '')
      const mapped = TIME_WORD_HOUR[key] ?? TIME_WORD_HOUR[key.replace('time', '')]
      if (mapped) {
        time = mapped
        timeExplicit = true
        s = cut(s, tw[0])
      }
    }
  }

  if (!time) {
    const at = s.match(RX.atTime)
    if (at?.groups) {
      const hour = parseInt(at.groups.h, 10)
      const minute = at.groups.mi ? parseInt(at.groups.mi, 10) : 0
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        time = { hour, minute }
        timeExplicit = true
        s = cut(s, at[0])
      }
    }
  }

  if (!time) {
    const ct = s.match(RX.colonTime)
    if (ct?.groups) {
      const hour = parseInt(ct.groups.h, 10)
      const minute = parseInt(ct.groups.mi, 10)
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        time = { hour, minute }
        timeExplicit = true
        s = cut(s, ct[0])
      }
    }
  }

  const allDayMatch = s.match(RX.allDay)
  let isAllDay = false
  if (allDayMatch) {
    isAllDay = true
    time = null
    timeExplicit = false
    s = cut(s, allDayMatch[0])
  }

  // 5) compose the due instant ---------------------------------------------------
  let dueAtIso: string | null = null
  let guessed = dateSource === 'guessed'
  let rolledToTomorrow = false

  if (recurrence && !date) {
    const base = getZonedParts(now, tz)
    const t = time ?? defaultTime()
    let baseUtc = zonedWallTimeToUtc(base.year, base.month, base.day, t.hour, t.minute, tz)
    if (baseUtc.getTime() <= now.getTime()) {
      baseUtc = nextOccurrence(baseUtc, recurrence, tz)
    }
    const bp = getZonedParts(baseUtc, tz)
    date = { year: bp.year, month: bp.month, day: bp.day }
    if (recurrence.type === 'weekly' && recurrence.weekdays.length === 0) {
      recurrence = { ...recurrence, weekdays: [bp.weekday] }
    }
    dueAtIso = baseUtc.toISOString()
  } else if (date) {
    const t = time ?? defaultTime()
    let due = zonedWallTimeToUtc(date.year, date.month, date.day, t.hour, t.minute, tz)
    if (due.getTime() <= now.getTime() && dateSource === 'weekday') {
      // "friday at 9am" said on a Friday afternoon → next Friday
      due = zonedWallTimeToUtc(date.year, date.month, date.day + 7, t.hour, t.minute, tz)
    }
    if (recurrence && recurrence.type === 'weekly' && recurrence.weekdays.length === 0) {
      recurrence = { ...recurrence, weekdays: [getZonedParts(due, tz).weekday] }
    }
    dueAtIso = due.toISOString()
  } else if (time && !isAllDay) {
    // time without a date → today (or tomorrow once today's time has passed)
    const np = getZonedParts(now, tz)
    let due = zonedWallTimeToUtc(np.year, np.month, np.day, time.hour, time.minute, tz)
    if (due.getTime() <= now.getTime()) {
      due = zonedWallTimeToUtc(np.year, np.month, np.day + 1, time.hour, time.minute, tz)
      rolledToTomorrow = true
    }
    dueAtIso = due.toISOString()
  }

  // 6) implicit list intent: "buy …" with no schedule → quick list ---------------
  if (!listName && !dueAtIso && !recurrence && !isAllDay) {
    const listStart = s.match(/^\s*(?:buy|grab|pick\s+up|order)\s+(?<item>.{2,})$/i)
    if (listStart?.groups) {
      const cleaned = cleanTitle(s)
      if (cleaned.length >= 2) listName = 'Shopping'
    }
  }

  // 7) title & category ----------------------------------------------------------
  const title = cleanTitle(s) || cleanTitle(original) || 'Reminder'
  const categoryKey = guessCategoryKey(`${title} ${original}`)

  // 8) confidence ------------------------------------------------------------------
  let confidence: 'high' | 'medium' | 'low'
  if (listName) confidence = 'high'
  else if (dueAtIso && recurrence) confidence = 'high'
  else if (dueAtIso && timeExplicit) confidence = 'high'
  else if (dueAtIso && !guessed && !rolledToTomorrow) confidence = 'high'
  else if (dueAtIso) confidence = 'medium'
  else confidence = 'low'

  const needsConfirm = confidence === 'medium'

  return finalize(title, dueAtIso, isAllDay, timeExplicit, recurrence, categoryKey, listName, confidence, tz, now, needsConfirm)
}

function finalize(
  title: string,
  dueAtIso: string | null,
  isAllDay: boolean,
  hasTime: boolean,
  recurrence: RecurrenceRule | null,
  categoryKey: CategoryKey,
  listName: string | null,
  confidence: 'high' | 'medium' | 'low',
  tz: string,
  now: Date,
  needsConfirm: boolean
): ParseResult {
  const rule: RecurrenceRule = recurrence ?? { type: 'none', interval: 1, weekdays: [] }

  const parts: string[] = []
  if (listName) {
    parts.push(`Add to ${listName} list`)
  } else {
    if (dueAtIso) {
      const due = new Date(dueAtIso)
      const p = getZonedParts(due, tz)
      const np = getZonedParts(now, tz)
      const dayDiff = Math.round((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(np.year, np.month - 1, np.day)) / 86_400_000)
      const dayName = dayDiff === 0 ? 'today' : dayDiff === 1 ? 'tomorrow' : dayDiff === -1 ? 'yesterday' : undefined
      const dateStr = dayName
        ? dayName
        : new Intl.DateTimeFormat('en-GB', {
            timeZone: tz,
            weekday: dayDiff > 1 && dayDiff <= 6 ? 'long' : 'short',
            day: 'numeric',
            month: 'short',
            year: p.year !== np.year ? 'numeric' : undefined,
          }).format(due)
      const timeStr =
        isAllDay || !hasTime
          ? null
          : new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(due)
      parts.push(`Due ${dateStr}${timeStr ? ` at ${timeStr}` : isAllDay ? ' (all day)' : ''}`)
    } else {
      parts.push('No reminder time — saved for later')
    }
    const recLabel = formatRuleLabel(rule)
    if (recLabel) parts.push(`Repeats ${recLabel.replace(/^Every /i, 'every ')}`)
  }

  return {
    title: title.length > 200 ? title.slice(0, 200) : title,
    dueAtIso,
    isAllDay,
    hasTime,
    recurrence: rule,
    categoryKey,
    listName,
    confidence,
    needsConfirm,
    explanation: parts.join(' · '),
  }
}

function formatRuleLabel(rule: RecurrenceRule): string | null {
  if (rule.type === 'none') return null
  const n = Math.max(1, rule.interval)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  switch (rule.type) {
    case 'daily':
      return n === 1 ? 'Every day' : `Every ${n} days`
    case 'weekly': {
      if (rule.weekdays.length > 0) {
        const label = [...rule.weekdays].sort((a, b) => a - b).map((d) => days[d]).join(' & ')
        return n === 1 ? `Every ${label}` : `Every ${n} weeks on ${label}`
      }
      return n === 1 ? 'Every week' : `Every ${n} weeks`
    }
    case 'monthly':
      return n === 12 ? 'Every year' : n === 1 ? 'Every month' : `Every ${n} months`
    case 'custom':
      return n === 1 ? 'Every day' : `Every ${n} days`
  }
}
