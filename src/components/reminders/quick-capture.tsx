'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ListPlus, PencilLine, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ReminderForm, type ReminderFormInitial } from './reminder-form'
import { parseReminder, type ParseResult } from '@/lib/parse'
import { categoryIdForKey } from '@/lib/categories'
import { api, cn } from '@/lib/utils'
import type { Category } from '@/types'

export interface CaptureComposerProps {
  timezone: string
  categories: Category[]
  autoFocus?: boolean
  onDone?: () => void
  /** start in the full editor (used by /reminders/new) */
  startInEditor?: boolean
  editorInitial?: ReminderFormInitial
}

interface CaptureResponse {
  kind: 'reminder' | 'list_item'
  title: string
  listName?: string
}

/**
 * The heart of Nudge: one input that understands dates, times, recurrence,
 * categories and list intents. High-confidence captures are created in a
 * single submit; ambiguous ones expand into the full editor pre-filled.
 */
export function CaptureComposer({
  timezone,
  categories,
  autoFocus,
  onDone,
  startInEditor,
  editorInitial,
}: CaptureComposerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editor, setEditor] = useState<ReminderFormInitial | null>(
    startInEditor ? editorInitial ?? emptyInitial() : null
  )
  // remount the form when the editor draft changes (it owns its own state)
  const [editorKey, setEditorKey] = useState(0)

  function openEditor(initial: ReminderFormInitial) {
    setEditor(initial)
    setEditorKey((k) => k + 1)
  }

  const parse: ParseResult | null = useMemo(
    () => (text.trim().length > 1 ? parseReminder(text.trim(), new Date(), timezone) : null),
    [text, timezone]
  )

  function emptyInitial(): ReminderFormInitial {
    return {
      title: '',
      dueAtIso: null,
      isAllDay: false,
      hasTime: false,
      recurrence: { type: 'none', interval: 1, weekdays: [] },
      categoryId: null,
      notes: '',
    }
  }

  async function quickCreate() {
    const value = text.trim()
    if (!value) return
    setSubmitting(true)
    try {
      const res = await api<CaptureResponse>('/api/capture', {
        method: 'POST',
        body: JSON.stringify({ text: value }),
      })
      toast({
        message:
          res.kind === 'list_item'
            ? `Added to your ${res.listName ?? 'Shopping'} list`
            : `“${res.title}” — remembered`,
        tone: 'success',
      })
      setText('')
      onDone?.()
      router.refresh()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not save — try again', tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  function openEditorFromParse() {
    if (!parse) return
    openEditor({
      title: parse.title,
      dueAtIso: parse.dueAtIso,
      isAllDay: parse.isAllDay,
      hasTime: parse.hasTime,
      recurrence: parse.recurrence,
      categoryId: categoryIdForKey(parse.categoryKey, categories),
      notes: '',
    })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!parse) return
    if (parse.needsConfirm) {
      openEditorFromParse()
    } else {
      void quickCreate()
    }
  }

  if (editor) {
    return (
      <ReminderForm
        key={editorKey}
        timezone={timezone}
        categories={categories}
        initial={editor}
        submitLabel="Save reminder"
        onDone={() => {
          setEditor(null)
          setText('')
          onDone?.()
        }}
        onCancel={startInEditor ? undefined : () => setEditor(null)}
        onDeleted={startInEditor ? undefined : onDone}
      />
    )
  }

  const showHint = Boolean(parse) && !submitting

  return (
    <form onSubmit={onSubmit}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-2xl border bg-cream-50 shadow-card transition-all duration-200',
          'border-cream-300 focus-within:border-navy-500/60 focus-within:ring-2 focus-within:ring-navy-500/10'
        )}
      >
        <Sparkles className="ml-4 h-5 w-5 shrink-0 text-lilac-500" aria-hidden />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What should Nudge remember?"
          aria-label="Capture something to remember"
          autoFocus={autoFocus}
          maxLength={300}
          className="h-14 w-full min-w-0 bg-transparent text-[16px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
        <Button
          type="submit"
          size="md"
          className="mr-2 h-10 shrink-0"
          loading={submitting}
          disabled={!text.trim()}
        >
          Remember
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="flex min-h-[32px] flex-wrap items-center gap-x-3 gap-y-1 px-1.5 pt-2 text-sm">
        {showHint && parse ? (
          <>
            <span className="text-ink-500">{parse.explanation}</span>
            {parse.needsConfirm && (
              <button
                type="button"
                onClick={openEditorFromParse}
                className="inline-flex items-center gap-1 font-semibold text-navy-600 hover:underline"
              >
                <PencilLine className="h-3.5 w-3.5" aria-hidden />
                Check
              </button>
            )}
          </>
        ) : (
          <span className="text-ink-400">
            Try{' '}
            <button
              type="button"
              onClick={() => setText('Pay electricity bill tomorrow at 9 AM')}
              className="rounded-md px-0.5 font-medium text-ink-500 hover:bg-cream-200 hover:text-ink-800"
            >
              “Pay electricity bill tomorrow at 9 AM”
            </button>{' '}
            or{' '}
            <button
              type="button"
              onClick={() => setText('Change water filter next month')}
              className="rounded-md px-0.5 font-medium text-ink-500 hover:bg-cream-200 hover:text-ink-800"
            >
              “Change water filter next month”
            </button>
          </span>
        )}
        {text.trim() && (
          <button
            type="button"
            onClick={openEditorFromParse}
            className="inline-flex items-center gap-1 text-ink-400 hover:text-ink-700"
          >
            <ListPlus className="h-3.5 w-3.5" aria-hidden />
            More options
          </button>
        )}
      </div>
    </form>
  )
}

export function QuickCaptureModal({
  open,
  onClose,
  timezone,
  categories,
  prefill,
}: {
  open: boolean
  onClose: () => void
  timezone: string
  categories: Category[]
  prefill?: string
}) {
  // remount the composer each time the modal opens so prefill applies
  const key = open ? (prefill ?? 'blank') : 'closed'
  return (
    <Modal open={open} onClose={onClose} title="Capture something" subtitle="Nudge figures out the details">
      {open && (
        <CaptureComposer
          key={key}
          timezone={timezone}
          categories={categories}
          autoFocus
          onDone={onClose}
          startInEditor={Boolean(prefill)}
          editorInitial={prefill ? { title: prefill, dueAtIso: null, isAllDay: false, hasTime: false, recurrence: { type: 'none', interval: 1, weekdays: [] }, categoryId: null, notes: '' } : undefined}
        />
      )}
    </Modal>
  )
}
