import { AlarmClock, CalendarDays, ListChecks } from 'lucide-react'
import { greetingFor, formatDateLong } from '@/lib/time'
import { pluralize } from '@/lib/utils'

export function BriefingCard({
  greeting,
  displayName,
  timezone,
  now,
  overdueCount,
  todayCount,
  upcomingCount,
  nextDue,
  nextDueTime,
}: {
  greeting: string
  displayName: string | null
  timezone: string
  now: string
  overdueCount: number
  todayCount: number
  upcomingCount: number
  nextDue: string | null
  nextDueTime: string | null
}) {
  const name = displayName?.trim() || 'friend'
  const parts: string[] = []
  if (overdueCount > 0) parts.push(`${pluralize(overdueCount, 'item')} overdue`)
  if (todayCount > 0) parts.push(`${pluralize(todayCount, 'thing')} today`)
  if (upcomingCount > 0) parts.push(`${pluralize(upcomingCount, 'reminder')} later this week`)

  const headline =
    parts.length > 0
      ? parts.join(' · ')
      : 'Nothing needs you right now — enjoy the calm.'

  return (
    <section className="rounded-3xl border border-cream-300 bg-cream-50 px-5 py-6 shadow-card sm:px-7 sm:py-7">
      <p className="text-sm font-medium text-ink-400">{greeting},</p>
      <h1 className="mt-0.5 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
        {name}.
      </h1>
      <p className="mt-2 text-[15px] text-ink-500">{headline}</p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-cream-200 pt-4 text-sm">
        <span className="inline-flex items-center gap-1.5 text-ink-500">
          <CalendarDays className="h-4 w-4 text-ink-300" aria-hidden />
          {formatDateLong(new Date(now), timezone)}
        </span>
        {overdueCount > 0 && (
          <span className="inline-flex items-center gap-1.5 font-medium text-coral-500">
            <AlarmClock className="h-4 w-4" aria-hidden />
            {pluralize(overdueCount, 'item')} overdue
          </span>
        )}
        {nextDue && (
          <span className="inline-flex items-center gap-1.5 text-ink-500">
            <ListChecks className="h-4 w-4 text-ink-300" aria-hidden />
            Next: {nextDue}
            {nextDueTime ? ` at ${nextDueTime}` : ''}
          </span>
        )}
      </div>
    </section>
  )
}
