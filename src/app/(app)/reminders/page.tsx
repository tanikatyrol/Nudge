import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ListTodo, Plus } from 'lucide-react'
import Link from 'next/link'
import { ReminderCard } from '@/components/reminders/reminder-card'
import { EmptyState } from '@/components/ui/empty-state'
import { RemindersFilterBar } from '@/components/reminders/reminders-filter-bar'
import { createSupabaseServerClient, getProfile } from '@/lib/supabase/server'
import { serializeCategory, serializeReminder } from '@/lib/serialize'
import { formatDueLabel, localDayDiff, startOfLocalDay } from '@/lib/time'
import type { Category, SerializedReminder } from '@/types'

export const metadata: Metadata = { title: 'All Reminders' }

const STATUSES = ['open', 'completed'] as const

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>
}) {
  const params = await searchParams
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as (typeof STATUSES)[number])
    : 'open'
  const categoryFilter = params.category ?? ''

  if (!isBackendReady()) redirect('/login')
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await getProfile(supabase, user.id)
  if (!profile) redirect('/login')

  const tz = profile.timezone
  const now = new Date()
  const nowIso = now.toISOString()
  const dayStart = startOfLocalDay(now, tz)

  const [activeRes, completedRes, categoriesRes] = await Promise.all([
    supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('due_at', { ascending: true, nullsFirst: false }),
    supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(200),
    supabase.from('categories').select('*').eq('user_id', user.id).order('sort_order'),
  ])

  const categories: Category[] = (categoriesRes.data ?? []).map(serializeCategory)
  const matchesCategory = (r: SerializedReminder) =>
    !categoryFilter || r.categoryId === categoryFilter

  const activeRows: SerializedReminder[] = (activeRes.data ?? [])
    .map(serializeReminder)
    .filter(matchesCategory)

  const completedRows: SerializedReminder[] = (completedRes.data ?? [])
    .map(serializeReminder)
    .filter(matchesCategory)

  // group open reminders
  const overdue: SerializedReminder[] = []
  const today: SerializedReminder[] = []
  const futureGroups: { label: string; items: SerializedReminder[] }[] = []
  const someday: SerializedReminder[] = []

  const groupByDate = new Map<string, SerializedReminder[]>()
  for (const r of activeRows) {
    const eff = r.snoozedUntil ? new Date(r.snoozedUntil) : r.dueAt ? new Date(r.dueAt) : null
    if (!eff) {
      someday.push(r)
      continue
    }
    if (eff.getTime() < dayStart.getTime()) {
      overdue.push(r)
      continue
    }
    const diff = localDayDiff(now, eff, tz)
    if (diff <= 0) {
      today.push(r)
      continue
    }
    const key = `${diff}`
    const bucket = groupByDate.get(key) ?? []
    bucket.push(r)
    groupByDate.set(key, bucket)
  }

  const sortedFuture = [...groupByDate.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))
  for (const [diff, items] of sortedFuture) {
    const eff = new Date(items[0].snoozedUntil ?? items[0].dueAt!)
    const label = formatDueLabel(eff, tz, now)
    futureGroups.push({ label, items })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
            All reminders
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {activeRows.length > 0
              ? `${activeRows.length} open · ${completedRows.length && status === 'completed' ? completedRows.length + ' completed' : 'everything Nudge holds for you'}`
              : 'Everything Nudge holds for you'}
          </p>
        </div>
        <Link
          href="/reminders/new"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New reminder
        </Link>
      </div>

      <RemindersFilterBar
        status={status}
        category={categoryFilter}
        categories={categories}
      />

      {status === 'open' ? (
        <>
          {activeRows.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              tone="sky"
              title="No reminders yet"
              description="Capture your first one from the Today page — just type it naturally."
              action={
                <Link href="/today" className="text-sm font-semibold text-navy-600 hover:underline">
                  Go to Today →
                </Link>
              }
            />
          ) : (
            <>
              {overdue.length > 0 && (
                <Group title="Overdue" tone="coral" count={overdue.length}>
                  {overdue.map((r) => (
                    <ReminderCard key={r.id} reminder={r} categories={categories} timezone={tz} variant="overdue" now={nowIso} />
                  ))}
                </Group>
              )}
              {today.length > 0 && (
                <Group title="Today" tone="navy" count={today.length}>
                  {today.map((r) => (
                    <ReminderCard key={r.id} reminder={r} categories={categories} timezone={tz} variant="today" now={nowIso} />
                  ))}
                </Group>
              )}
              {futureGroups.map((g) => (
                <Group key={g.label} title={g.label} tone="muted" count={g.items.length}>
                  {g.items.map((r) => (
                    <ReminderCard key={r.id} reminder={r} categories={categories} timezone={tz} variant="upcoming" now={nowIso} />
                  ))}
                </Group>
              ))}
              {someday.length > 0 && (
                <Group title="Someday" tone="muted" count={someday.length}>
                  {someday.map((r) => (
                    <ReminderCard key={r.id} reminder={r} categories={categories} timezone={tz} variant="someday" now={nowIso} />
                  ))}
                </Group>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {completedRows.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              tone="sage"
              title="Nothing completed yet"
              description="Finished reminders and recurring occurrences will collect here."
            />
          ) : (
            <div className="space-y-2.5">
              {completedRows.map((r) => (
                <ReminderCard key={r.id} reminder={r} categories={categories} timezone={tz} variant="done" now={nowIso} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function isBackendReady(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function Group({
  title,
  tone,
  count,
  children,
}: {
  title: string
  tone: 'coral' | 'navy' | 'muted'
  count: number
  children: React.ReactNode
}) {
  const toneClasses = { coral: 'text-coral-500', navy: 'text-ink-900', muted: 'text-ink-500' }
  return (
    <section className="animate-slide-up">
      <div className="mb-2.5 flex items-baseline gap-2.5 px-1">
        <h2 className={`text-[13px] font-bold uppercase tracking-wider ${toneClasses[tone]}`}>{title}</h2>
        <span className="text-[13px] font-medium text-ink-300">{count}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}
