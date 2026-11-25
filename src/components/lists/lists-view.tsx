'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Plus, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { TextField } from '@/components/ui/field'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { api, cn } from '@/lib/utils'
import type { ListSummary } from '@/types'

const EMOJI_CHOICES = ['🛒', '📝', '🏠', '🎁', '✈️', '💼', '🍳', '🎯', '📚', '🧺', '💡', '🌿']

export function ListsView({ lists }: { lists: ListSummary[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📝')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createList() {
    setError(null)
    if (!name.trim()) {
      setError('Name your list')
      return
    }
    setSubmitting(true)
    try {
      const created = await api<{ id: string }>('/api/lists', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), icon }),
      })
      toast({ message: `“${name.trim()}” list created`, tone: 'success' })
      setCreateOpen(false)
      setName('')
      setIcon('📝')
      router.push(`/lists/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the list')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Lists</h1>
          <p className="mt-1 text-sm text-ink-500">Shopping lists, packing, to-dos — the simple stuff.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          New list
        </Button>
      </div>

      {lists.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          tone="butter"
          title="No lists yet"
          description="Create your first list — say, groceries or errands — and tick things off as you go."
          action={<Button onClick={() => setCreateOpen(true)}>Create a list</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lists.map((list) => {
            const total = list.items.length
            const done = list.items.filter((i) => i.isCompleted).length
            const progress = total > 0 ? Math.round((done / total) * 100) : 0
            const preview = list.items.filter((i) => !i.isCompleted).slice(0, 3)
            return (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="group rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lifted"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cream-200 text-xl">
                    {list.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">{list.name}</p>
                    <p className="text-sm text-ink-400">
                      {total === 0
                        ? 'Empty — add something'
                        : done === total
                          ? 'All done ✓'
                          : `${done} of ${total} done`}
                    </p>
                  </div>
                </div>
                {total > 0 && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream-200">
                    <div
                      className="h-full rounded-full bg-sage-300 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                {preview.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {preview.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-sm text-ink-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-ink-200" aria-hidden />
                        <span className="truncate">{item.content}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Link>
            )
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New list">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void createList()
          }}
          className="space-y-4"
        >
          <TextField
            label="List name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Groceries"
            autoFocus
            error={error}
          />
          <div>
            <span className="mb-2 block text-sm font-medium text-ink-700">Icon</span>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-pressed={icon === emoji}
                  aria-label={`Icon ${emoji}`}
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition-colors',
                    icon === emoji
                      ? 'border-navy-600 bg-navy-600/10'
                      : 'border-cream-300 bg-cream-50 hover:border-cream-400'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Create list
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
