import 'server-only'
import { z } from 'zod'
import type { ParseResult } from '@/lib/parse'
import { getZonedParts, zonedWallTimeToUtc } from '@/lib/time'
import type { RecurrenceRule } from '@/types'

const aiResponseSchema = z.object({
  title: z.string().min(1).max(200),
  dueAtLocal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    .nullable(),
  allDay: z.boolean(),
  recurrence: z.object({
    type: z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']),
    interval: z.number().int().min(1).max(365),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7),
  }),
  category: z.enum(['personal', 'shopping', 'bills', 'home', 'health', 'work']),
  listName: z.string().max(60).nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
})

/**
 * Optional AI assist for natural-language parsing. Used only when an
 * OPENAI_API_KEY is configured AND the rule-based parser was unsure.
 * Any failure falls back to the rule-based result — the app never depends
 * on the AI being available.
 */
export async function aiParse(text: string, now: Date, tz: string): Promise<ParseResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('AI parsing is not configured')

  const localNow = getZonedParts(now, tz)
  const nowLocal = `${localNow.year}-${String(localNow.month).padStart(2, '0')}-${String(localNow.day).padStart(2, '0')} ${String(localNow.hour).padStart(2, '0')}:${String(localNow.minute).padStart(2, '0')}`
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][localNow.weekday]

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You parse personal reminder requests. Today is ' +
              `${nowLocal} (${weekday}), timezone ${tz}. ` +
              'Return STRICT JSON with keys: title (cleaned, no date phrases), ' +
              'dueAtLocal ("YYYY-MM-DD HH:mm" local time or null if no time is implied), ' +
              'allDay (boolean), recurrence ({type: none|daily|weekly|monthly|custom, interval, weekdays: [] 0-6}), ' +
              'category (personal|shopping|bills|home|health|work), listName (string|null — set when the ' +
              'request is clearly a list item like shopping), confidence (high|medium|low). ' +
              'If no date is mentioned, dueAtLocal is null. Resolve vague words (tomorrow, next monday, tonight) ' +
              'to exact dates. "buy/get X when I go shopping" → listName "Shopping".',
          },
          { role: 'user', content: text },
        ],
      }),
    })
    if (!res.ok) throw new Error(`AI request failed (${res.status})`)
    const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = payload.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty AI response')
    const parsed = aiResponseSchema.parse(JSON.parse(content))

    let dueAtIso: string | null = null
    if (parsed.dueAtLocal) {
      const [datePart, timePart] = parsed.dueAtLocal.split(' ')
      const [y, m, d] = datePart.split('-').map(Number)
      const [hh, mm] = timePart.split(':').map(Number)
      dueAtIso = zonedWallTimeToUtc(y, m, d, hh, mm, tz).toISOString()
    }

    const recurrence: RecurrenceRule = parsed.recurrence
    return {
      title: parsed.title.trim().slice(0, 200),
      dueAtIso,
      isAllDay: parsed.allDay && Boolean(dueAtIso),
      hasTime: Boolean(parsed.dueAtLocal) && !parsed.allDay,
      recurrence,
      categoryKey: parsed.category,
      listName: parsed.listName,
      confidence: parsed.confidence,
      needsConfirm: parsed.confidence !== 'high',
      explanation: dueAtIso
        ? 'Due (AI-parsed)'
        : parsed.listName
          ? `Add to ${parsed.listName} list`
          : 'No reminder time — saved for later',
    }
  } finally {
    clearTimeout(timeout)
  }
}
