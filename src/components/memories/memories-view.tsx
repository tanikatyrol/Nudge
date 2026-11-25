'use client'

import { useMemo, useState } from 'react'
import { Bell, CheckCircle2, History, RefreshCw, Search } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { Segmented } from '@/components/ui/segmented'
import { CategoryChip } from '@/components/ui/category-dot'
import { getZonedParts, localDateKey } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { SerializedEvent } from '@/types'

type Filter = 'all' | 'completed' | 'recurring_advanced' | 'notification_sent'

const KIND_META = {
  completed: { icon: CheckCircle2, label: 'Completed', classes: 'text-sage-500 bg-sage-200/60' },
  recurring_advanced: { icon: RefreshCw, label: 'Recurred', classes: 'text-sky-500 bg-sky-200/60' },
  notification_sent: { icon: Bell, label: 'Nudged', classes: 'text-butter-500 bg-butter-200/60' },
} as const

export function MemoriesView({ events, timezone }: { events: SerializedEvent[]; timezone: string }) {
  const [filter, setFilter] = useState<Filter>('all')

  const groups = useMemo(() => {
    const filtered = filter === 'all' ? events : events.filter((e) => e.kind === filter)
    const byDay = new Map<string, SerializedEvent[]>()
    for (const event of filtered) {
      const key = localDateKey(new Date(event.occurredAt), timezone)
      const bucket = byDay.get(key) ?? []
      bucket.push(event)
      byDay.set(key, bucket)
    }
    return [...byDay.entries()].map(([key, items]) => ({
      key,
      label: dayLabel(key, timezone),
      items,
    }))
  }, [events, filter, timezone])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Memories</h1>
          <p className="mt-1 text-sm text-ink-500">
            Everything you&apos;ve remembered — completions, recurrences and nudges delivered.
          </p>
        </div>
        <Link
          href="/search"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-4 text-sm font-semibold text-ink-700 shadow-sm transition-colors hover:bg-cream-200"
        >
          <Search className="h-4 w-4" aria-hidden />
          Search
        </Link>
      </div>

      <Segmented
        ariaLabel="Filter memories"
        size="sm"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'completed', label: 'Completed' },
          { value: 'recurring_advanced', label: 'Recurred' },
          { value: 'notification_sent', label: 'Nudged' },
        ]}
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={History}
          tone="peach"
          title={events.length === 0 ? 'Your memory history starts here' : 'Nothing matches this filter'}
          description={
            events.length === 0
              ? 'As you complete reminders and routines roll forward, they collect here as a calm timeline of your life.'
              : 'Try another filter — or complete something today and it will show up here.'
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} className="animate-fade-in">
              <h2 className="mb-3 px-1 text-[13px] font-bold uppercase tracking-wider text-ink-400">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.items.map((event) => {
                  const meta = KIND_META[event.kind]
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3"
                    >
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.classes)}>
                        <meta.icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-ink-900">{event.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                          <span>{meta.label}</span>
                          <span aria-hidden>·</span>
                          <span>{formatLocalTime(event.occurredAt, timezone)}</span>
                        </p>
                      </div>
                      {event.categoryName && (
                        <span className="hidden sm:block">
                          <ChipFromName name={event.categoryName} />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function ChipFromName({ name }: { name: string }) {
  return <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-xs font-medium text-ink-500">{name}</span>
}

function dayLabel(dateKey: string, timezone: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  const nowKey = localDateKey(new Date(), timezone)
  const now = new Date()
  const np = getZonedParts(now, timezone)
  const todayKey = `${np.year}-${String(np.month).padStart(2, '0')}-${String(np.day).padStart(2, '0')}`
  if (dateKey === todayKey || dateKey === nowKey) return 'Today'
  const yesterday = new Date(now.getTime() - 86_400_000)
  const yp = getZonedParts(yesterday, timezone)
  const yesterdayKey = `${yp.year}-${String(yp.month).padStart(2, '0')}-${String(yp.day).padStart(2, '0')}`
  if (dateKey === yesterdayKey) return 'Yesterday'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function formatLocalTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}
