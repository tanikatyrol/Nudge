'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AlarmClock, BellOff, Check, MoreVertical, Pencil, Repeat as RepeatIcon, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CategoryChip } from '@/components/ui/category-dot'
import { useToast } from '@/components/ui/toast'
import { formatDueLabel, formatTime } from '@/lib/time'
import { formatRecurrence } from '@/lib/recurrence'
import { api, cn } from '@/lib/utils'
import type { Category, SerializedReminder } from '@/types'

export type ReminderVariant = 'overdue' | 'today' | 'upcoming' | 'someday' | 'done'

const SNOOZE_OPTIONS: { preset: '10m' | '30m' | '1h' | '3h' | 'tomorrow'; label: string }[] = [
  { preset: '10m', label: '10 minutes' },
  { preset: '30m', label: '30 minutes' },
  { preset: '1h', label: '1 hour' },
  { preset: '3h', label: '3 hours' },
  { preset: 'tomorrow', label: 'Tomorrow 9 AM' },
]

export function ReminderCard({
  reminder,
  categories,
  timezone,
  variant = 'today',
  now,
  showCategory = true,
}: {
  reminder: SerializedReminder
  categories: Category[]
  timezone: string
  variant?: ReminderVariant
  /** server-rendered "now" instant so labels match SSR output */
  now: string
  showCategory?: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, setPending] = useState(false)

  const category = categories.find((c) => c.id === reminder.categoryId) ?? null
  const completed = reminder.status === 'completed'
  const due = reminder.dueAt ? new Date(reminder.dueAt) : null
  const snoozed = reminder.snoozedUntil ? new Date(reminder.snoozedUntil) : null

  const nowDate = new Date(now)
  const timeLabel = due && !reminder.isAllDay ? formatTime(due, timezone) : null
  let dueLabel: string | null = null
  if (due) {
    dueLabel = formatDueLabel(due, timezone, nowDate, timeLabel ?? undefined)
  } else if (!due) {
    dueLabel = 'Someday'
  }
  if (snoozed && !completed) {
    dueLabel = `Snoozed until ${formatTime(snoozed, timezone)}`
  }

  const recLabel = reminder.recurrence.type !== 'none' ? formatRecurrence(reminder.recurrence) : null
  const overdue = variant === 'overdue'

  async function toggleComplete() {
    const nextDone = !completed
    setPending(true)
    try {
      await api(`/api/reminders/${reminder.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ done: nextDone }),
      })
      toast({
        message: nextDone ? 'Nice — done!' : 'Moved back to your list',
        tone: 'success',
        action: nextDone
          ? {
              label: 'Undo',
              onClick: () => {
                void api(`/api/reminders/${reminder.id}/complete`, {
                  method: 'POST',
                  body: JSON.stringify({ done: false }),
                })
                  .then(() => router.refresh())
                  .catch(() => undefined)
              },
            }
          : undefined,
      })
      router.refresh()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Something went wrong', tone: 'error' })
    } finally {
      setPending(false)
    }
  }

  async function snooze(preset: (typeof SNOOZE_OPTIONS)[number]['preset']) {
    setMenuOpen(false)
    setPending(true)
    try {
      await api(`/api/reminders/${reminder.id}/snooze`, {
        method: 'POST',
        body: JSON.stringify({ preset }),
      })
      toast({ message: 'Snoozed — Nudge will nudge you again', tone: 'success' })
      router.refresh()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not snooze', tone: 'error' })
    } finally {
      setPending(false)
    }
  }

  async function deleteReminder() {
    setPending(true)
    try {
      await api(`/api/reminders/${reminder.id}`, { method: 'DELETE' })
      toast({ message: 'Reminder deleted', tone: 'success' })
      setConfirmDelete(false)
      router.refresh()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not delete', tone: 'error' })
    } finally {
      setPending(false)
    }
  }

  const canSnooze = !completed && due !== null && (overdue || variant === 'today') && !snoozed

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 rounded-2xl border bg-cream-50 px-4 py-3.5 transition-all duration-150',
        'hover:shadow-card',
        overdue ? 'border-coral-300 bg-coral-200/20' : 'border-cream-300',
        completed && 'opacity-70',
        pending && 'opacity-50 pointer-events-none'
      )}
    >
      <button
        onClick={() => void toggleComplete()}
        disabled={pending}
        aria-label={completed ? `Mark "${reminder.title}" as not done` : `Mark "${reminder.title}" as done`}
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
          completed
            ? 'border-sage-500 bg-sage-500 text-white'
            : 'border-ink-300 text-transparent hover:border-sage-500 hover:text-sage-500/40'
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[15px] font-medium leading-snug text-ink-900',
            completed && 'line-through decoration-ink-300 text-ink-500'
          )}
        >
          {reminder.title}
        </p>
        {reminder.notes && (
          <p className="mt-0.5 truncate text-sm text-ink-400">{reminder.notes}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          {dueLabel && (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-medium',
                overdue ? 'text-coral-500' : completed ? 'text-ink-400' : 'text-ink-500'
              )}
            >
              {snoozed && !completed ? (
                <BellOff className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <AlarmClock className="h-3.5 w-3.5" aria-hidden />
              )}
              {dueLabel}
            </span>
          )}
          {recLabel && (
            <span className="inline-flex items-center gap-1 text-ink-400">
              <RepeatIcon className="h-3.5 w-3.5" aria-hidden />
              {recLabel}
            </span>
          )}
          {showCategory && <CategoryChip category={category} />}
        </div>
      </div>

      {!completed && (
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`Actions for "${reminder.title}"`}
            aria-expanded={menuOpen}
            className="rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-cream-200 hover:text-ink-700"
          >
            <MoreVertical className="h-[18px] w-[18px]" aria-hidden />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
              <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-cream-300 bg-cream-50 py-1.5 shadow-pop animate-pop">
                <Link
                  href={`/reminders/${reminder.id}/edit`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-700 hover:bg-cream-200"
                >
                  <Pencil className="h-4 w-4 text-ink-400" aria-hidden />
                  Edit
                </Link>
                {canSnooze && (
                  <>
                    <div className="my-1 border-t border-cream-200" />
                    <p className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
                      Snooze
                    </p>
                    {SNOOZE_OPTIONS.map((opt) => (
                      <button
                        key={opt.preset}
                        onClick={() => void snooze(opt.preset)}
                        className="flex w-full items-center px-3.5 py-2 text-left text-sm text-ink-700 hover:bg-cream-200"
                      >
                        <BellOff className="mr-2.5 h-4 w-4 text-ink-400" aria-hidden />
                        {opt.label}
                      </button>
                    ))}
                  </>
                )}
                <div className="my-1 border-t border-cream-200" />
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setConfirmDelete(true)
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-coral-500 hover:bg-coral-200/40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this reminder?"
        message={`“${reminder.title}” will be removed. This can't be undone.`}
        confirmLabel="Delete reminder"
        destructive
        loading={pending}
        onConfirm={() => void deleteReminder()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
