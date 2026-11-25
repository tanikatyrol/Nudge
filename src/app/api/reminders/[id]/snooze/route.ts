import { NextRequest } from 'next/server'
import { ApiError, jsonOk, readJson, requireAuth, withRoute } from '@/lib/api'
import { snoozeSchema } from '@/lib/validation'
import { fetchReminder } from '@/lib/server/reminders'
import { getZonedParts, zonedWallTimeToUtc } from '@/lib/time'

export const runtime = 'nodejs'

const PRESET_MINUTES: Record<string, number> = {
  '10m': 10,
  '30m': 30,
  '1h': 60,
  '3h': 180,
}

export const POST = withRoute(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { supabase, profile } = await requireAuth()
    const { preset } = await readJson(request, snoozeSchema)
    const row = await fetchReminder(supabase, profile.id, id)
    const now = new Date()

    let snoozedUntil: Date
    if (preset === 'tomorrow') {
      // tomorrow at 9:00 in the reminder's timezone
      const tz = row.timezone || profile.timezone
      const tomorrow = new Date(now.getTime() + 86_400_000)
      const p = getZonedParts(tomorrow, tz)
      snoozedUntil = zonedWallTimeToUtc(p.year, p.month, p.day, 9, 0, tz)
    } else {
      snoozedUntil = new Date(now.getTime() + PRESET_MINUTES[preset] * 60_000)
    }

    const { error } = await supabase
      .from('reminders')
      .update({ snoozed_until: snoozedUntil.toISOString() })
      .eq('id', id)
    if (error) throw new ApiError(500, 'Could not snooze the reminder.')

    return jsonOk({ ok: true, snoozedUntil: snoozedUntil.toISOString() })
  }
)
