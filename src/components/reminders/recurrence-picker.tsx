'use client'

import { formatRecurrence, WEEKDAY_LABELS } from '@/lib/recurrence'
import { Segmented } from '@/components/ui/segmented'
import { cn } from '@/lib/utils'
import type { RecurrenceRule, RecurrenceType } from '@/types'

export function RecurrencePicker({
  value,
  onChange,
}: {
  value: RecurrenceRule
  onChange: (rule: RecurrenceRule) => void
}) {
  const typeOptions: { value: RecurrenceType; label: string }[] = [
    { value: 'none', label: 'Once' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom' },
  ]

  function update(patch: Partial<RecurrenceRule>) {
    onChange({ ...value, ...patch })
  }

  const preview = value.type === 'none' ? null : formatRecurrence(value)

  return (
    <div className="space-y-3">
      <Segmented
        ariaLabel="Repeat"
        options={typeOptions}
        value={value.type}
        onChange={(t) => {
          if (t === 'weekly' && value.weekdays.length === 0) {
            onChange({ ...value, type: t, weekdays: [] })
          } else {
            onChange({ ...value, type: t })
          }
        }}
        size="sm"
        className="w-full justify-between sm:w-auto sm:justify-start"
      />

      {value.type !== 'none' && (
        <div className="flex flex-wrap items-center gap-3">
          {value.type !== 'weekly' || value.weekdays.length === 0 ? (
            <label className="flex items-center gap-2 text-sm text-ink-600">
              Every
              <input
                type="number"
                min={1}
                max={365}
                value={value.interval}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 1))
                  update({ interval: n })
                }}
                className="h-9 w-16 rounded-lg border border-cream-300 bg-cream-50 px-2 text-center text-sm focus:border-navy-500 focus:outline-none"
                aria-label={`Repeat every N ${value.type === 'daily' || value.type === 'custom' ? 'days' : value.type === 'weekly' ? 'weeks' : 'months'}`}
              />
              {value.type === 'daily' || value.type === 'custom' ? (value.interval === 1 ? 'day' : 'days')
                : value.type === 'weekly' ? (value.interval === 1 ? 'week' : 'weeks')
                : (value.interval === 1 ? 'month' : 'months')}
            </label>
          ) : null}

          {value.type === 'weekly' && (
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS.map((label, idx) => {
                const active = value.weekdays.includes(idx)
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      const weekdays = active
                        ? value.weekdays.filter((d) => d !== idx)
                        : [...value.weekdays, idx]
                      onChange({ ...value, weekdays })
                    }}
                    className={cn(
                      'h-8 w-11 rounded-lg border text-xs font-semibold transition-colors',
                      active
                        ? 'border-navy-600 bg-navy-600 text-white'
                        : 'border-cream-300 bg-cream-50 text-ink-500 hover:border-cream-400 hover:text-ink-800'
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {preview && <p className="text-sm text-sage-500">{preview}</p>}
    </div>
  )
}
