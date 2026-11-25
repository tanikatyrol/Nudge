import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CaptureComposer } from '@/components/reminders/quick-capture'
import { ReminderCard } from '@/components/reminders/reminder-card'
import { BriefingCard } from '@/components/dashboard/briefing-card'
import { PushBanner } from '@/components/push/push-banner'
import { EmptyState } from '@/components/ui/empty-state'
import { Sparkles } from 'lucide-react'
import {
  createSupabaseServerClient,
  getProfile,
  isSupabaseServerConfigured,
} from '@/lib/supabase/server'
import { serializeCategory, serializeEvent, serializeReminder } from '@/lib/serialize'
import {
  addWallDays,
  formatDueLabel,
  formatTime,
  greetingFor,
  startOfLocalDay,
} from '@/lib/time'
import type { SerializedReminder, Category } from '@/types'

export const metadata: Metadata = { title: 'Today' }

export default async function TodayPage() {
  if (!isSupabaseServerConfigured()) {
    redirect('/login')
  }
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
  const dayEnd = addWallDays(dayStart, 1, tz)
  const weekEnd = addWallDays(dayStart, 8, tz)
  const dayStartIso = dayStart.toISOString()
  const dayEndIso = dayEnd.toISOString()
  const weekEndIso = weekEnd.toISOString()

  const [activeRes, doneRes, categoriesRes] = await Promise.all([
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
      .gte('completed_at', dayStartIso)
      .order('completed_at', { ascending: false }),
    supabase.from('categories').select('*').eq('user_id', user.id).order('sort_order'),
  ])

  const categories: Category[] = (categoriesRes.data ?? []).map(serializeCategory)
  const allActive: SerializedReminder[] = (activeRes.data ?? []).map(serializeReminder)

  const effectiveDue = (r: SerializedReminder): Date | null => {
    if (!r.dueAt) return null
    const snoozed = r.snoozedUntil ? new Date(r.snoozedUntil) : null
    return snoozed ?? new Date(r.dueAt)
  }

  const overdue: SerializedReminder[] = []
  const today: SerializedReminder[] = []
  const upcoming: SerializedReminder[] = []
  const someday: SerializedReminder[] = []

  for (const r of allActive) {
    const eff = effectiveDue(r)
    if (!eff) {
      someday.push(r)
    } else if (eff.getTime() < dayStart.getTime()) {
      overdue.push(r)
    } else if (eff.getTime() < dayEnd.getTime()) {
      today.push(r)
    } else if (eff.getTime() < weekEnd.getTime()) {
      upcoming.push(r)
    }
    // reminders further out live on the All Reminders page
  }

  const doneToday: SerializedReminder[] = (doneRes.data ?? []).map(serializeReminder)

  const nextDue = today[0] ?? upcoming[0] ?? null
  const nextDueTime = nextDue?.dueAt
    ? nextDue.isAllDay
      ? null
      : formatTime(new Date(nextDue.dueAt), tz)
    : null

  const greeting = greetingFor(now, tz)

  return (
    <div className="space-y-5">
      <BriefingCard
        greeting={greeting}
        displayName={profile.displayName}
        timezone={tz}
        now={nowIso}
        overdueCount={overdue.length}
        todayCount={today.length}
        upcomingCount={upcoming.length}
        nextDue={nextDue?.dueAt ? formatDueLabel(new Date(nextDue.dueAt), tz, now, undefined) : null}
        nextDueTime={nextDueTime}
      />

      <PushBanner />

      <section id="capture" aria-label="Quick capture">
        <CaptureComposer key={nowIso} timezone={tz} categories={categories} />
      </section>

      {overdue.length > 0 && (
        <Section title="Overdue" count={overdue.length} tone="coral">
          {overdue.map((r) => (
            <ReminderCard key={r.id} reminder={r} categories={categories} timezone={tz} variant="overdue" now={nowIso} />
          ))}
        </Section>
      )}

      {today.length > 0 && (
        <Section title="Today" count={today.length} tone="navy">
          {today.map((r) => (
            <ReminderCard key={r.id} reminder={r} categories={categories} timezone={tz} variant="today" now={nowIso} />
          ))}
        </Section>
      )}

      {today.length === 0 && overdue.length === 0 && someday.length === 0 && doneToday.length === 0 && (
        <EmptyState
          icon={Sparkles}
          tone="lilac"
          title="All clear for today"
          description="Capture anything you don't want to forget above — Nudge will remind you at the right time."
        />
      )}

      {upcoming.length > 0 && (
        <Section title="Coming up" count={upcoming.length} tone="muted">
          {upcoming.map((r) => (
            <ReminderCard key={r.id} reminder={r} categories={categories} timezone={tz} variant="upcoming" now={nowIso} />
          ))}
        </Section>
      )}

      {someday.length > 0 && (
        <Section title="Someday" count={someday.length} tone="muted">
          {someday.map((r) => (
            <ReminderCard key={r.id} reminder={r} categories={categories} timezone={tz} variant="someday" now={nowIso} />
          ))}
        </Section>
      )}

      {doneToday.length > 0 && (
        <Section title="Done today" count={doneToday.length} tone="sage">
          {doneToday.map((r) => (
            <ReminderCard key={r.id} reminder={r} categories={categories} timezone={tz} variant="done" now={nowIso} />
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  count,
  tone,
  children,
}: {
  title: string
  count: number
  tone: 'coral' | 'navy' | 'sage' | 'muted'
  children: React.ReactNode
}) {
  const toneClasses = {
    coral: 'text-coral-500',
    navy: 'text-ink-900',
    sage: 'text-sage-500',
    muted: 'text-ink-500',
  }
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
