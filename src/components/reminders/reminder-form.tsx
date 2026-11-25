'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, Repeat, StickyNote, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextArea, TextField } from '@/components/ui/field'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { RecurrencePicker } from './recurrence-picker'
import { CategoryDot } from '@/components/ui/category-dot'
import { formatRecurrence } from '@/lib/recurrence'
import { getZonedParts, zonedWallTimeToUtc } from '@/lib/time'
import { api, cn } from '@/lib/utils'
import type { Category, RecurrenceRule } from '@/types'

export interface ReminderFormInitial {
  id?: string
  title: string
  /** ISO UTC instant (null = someday) */
  dueAtIso: string | null
  isAllDay: boolean
  /** whether the original reminder specified a time */
  hasTime: boolean
  recurrence: RecurrenceRule
  categoryId: string | null
  notes: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoToLocalFields(iso: string | null, tz: string, isAllDay: boolean, hasTime: boolean) {
  if (!iso) return { date: '', time: '' }
  const p = getZonedParts(new Date(iso), tz)
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: isAllDay || !hasTime ? '' : `${pad(p.hour)}:${pad(p.minute)}`,
  }
}

function fieldsToDueIso(date: string, time: string, tz: string): string | null {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time ? time.split(':').map(Number) : [9, 0]
  return zonedWallTimeToUtc(y, m, d, hh, mm, tz).toISOString()
}

export function ReminderForm({
  timezone,
  categories,
  initial,
  submitLabel = 'Save reminder',
  onDone,
  onCancel,
  onDeleted,
}: {
  timezone: string
  categories: Category[]
  initial?: ReminderFormInitial
  submitLabel?: string
  onDone?: () => void
  onCancel?: () => void
  onDeleted?: () => void
}) {
  const router = useRouter()
  const { toast } = useToast()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null)
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(
    initial?.recurrence ?? { type: 'none', interval: 1, weekdays: [] }
  )
  const [isAllDay, setIsAllDay] = useState(initial?.isAllDay ?? false)
  const initialFields = isoToLocalFields(initial?.dueAtIso ?? null, timezone, initial?.isAllDay ?? false, initial?.hasTime ?? true)
  const [date, setDate] = useState(initialFields.date)
  const [time, setTime] = useState(initialFields.time)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Give this reminder a title')
      return
    }
    const dueAtIso = fieldsToDueIso(date, isAllDay ? '' : time, timezone)
    setSubmitting(true)
    try {
      const body = {
        title: trimmed,
        notes: notes.trim() || null,
        dueAt: dueAtIso,
        isAllDay: isAllDay && Boolean(date),
        timezone,
        recurrence,
        categoryId,
      }
      if (initial?.id) {
        await api(`/api/reminders/${initial.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        toast({ message: 'Reminder updated', tone: 'success' })
      } else {
        const created = await api<{ id: string }>('/api/reminders', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        toast({ message: 'Reminder created', tone: 'success' })
        void created
      }
      onDone?.()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save — try again')
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete() {
    if (!initial?.id) return
    setSubmitting(true)
    try {
      await api(`/api/reminders/${initial.id}`, { method: 'DELETE' })
      toast({ message: 'Reminder deleted', tone: 'success' })
      setConfirmDelete(false)
      onDeleted?.()
      router.refresh()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not delete', tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const recurrencePreview = formatRecurrence(recurrence)

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <TextField
        label="What should you remember?"
        placeholder="e.g. Pay electricity bill"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        error={error}
        autoFocus={!initial?.title}
      />

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          leading={<CalendarDays className="h-4 w-4" />}
        />
        {isAllDay ? (
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-ink-700">Time</span>
            <div className="flex h-11 items-center rounded-xl border border-cream-300 bg-cream-200 px-3.5 text-sm text-ink-400">
              All day
            </div>
          </div>
        ) : (
          <TextField
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            hint={time ? undefined : 'Defaults to 9:00 AM'}
            leading={<Clock className="h-4 w-4" />}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
            className="h-4 w-4 rounded border-cream-400 accent-navy-600"
            disabled={!date}
          />
          All day
        </label>
        {(date || time) && (
          <button
            type="button"
            onClick={() => {
              setDate('')
              setTime('')
            }}
            className="text-sm text-ink-400 hover:text-coral-500"
          >
            Clear date
          </button>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-ink-700">
          <Repeat className="h-3.5 w-3.5 text-ink-400" aria-hidden />
          Repeat
        </label>
        <RecurrencePicker value={recurrence} onChange={setRecurrence} />
        {recurrence.type === 'none' && !date && (
          <p className="text-sm text-ink-400">No date — Nudge will keep it on your Someday list.</p>
        )}
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-ink-700">Category</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryId(null)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              categoryId === null
                ? 'border-navy-600 bg-navy-600 text-white'
                : 'border-cream-300 bg-cream-50 text-ink-500 hover:border-cream-400'
            )}
          >
            <CategoryDot color={null} className="h-1.5 w-1.5 bg-ink-300" />
            None
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                categoryId === c.id
                  ? 'border-navy-600 bg-navy-600 text-white'
                  : 'border-cream-300 bg-cream-50 text-ink-500 hover:border-cream-400'
              )}
            >
              <CategoryDot color={c.color} className="h-1.5 w-1.5" />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <TextArea
        label="Notes"
        placeholder="Any extra details…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={2000}
      />

      {recurrencePreview && recurrence.type !== 'none' && (
        <p className="-mt-3 text-sm text-ink-400">
          This will remind you {recurrencePreview.toLowerCase()} at the same time.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div>
          {initial?.id && (
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={() => setConfirmDelete(true)}
              disabled={submitting}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this reminder?"
        message={`“${title || 'this reminder'}” will be removed. This can't be undone.`}
        confirmLabel="Delete reminder"
        destructive
        loading={submitting}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  )
}
