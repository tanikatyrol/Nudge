'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { api, cn } from '@/lib/utils'
import type { ListSummary } from '@/types'

export function ListDetail({ list: initialList }: { list: ListSummary }) {
  const router = useRouter()
  const { toast } = useToast()
  const [list, setList] = useState(initialList)
  const [newItem, setNewItem] = useState('')
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(list.name)
  const [confirmDeleteList, setConfirmDeleteList] = useState(false)
  const [confirmClearDone, setConfirmClearDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const open = list.items.filter((i) => !i.isCompleted)
  const done = list.items.filter((i) => i.isCompleted)

  // ── item actions ────────────────────────────────────────────────────────────

  async function addItem() {
    const content = newItem.trim()
    if (!content) return
    setAdding(true)
    try {
      const item = await api<{ id: string; content: string; is_completed: boolean; completed_at: string | null; position: number }>(
        `/api/lists/${list.id}/items`,
        { method: 'POST', body: JSON.stringify({ content }) }
      )
      setList((l) => ({
        ...l,
        items: [
          ...l.items,
          {
            id: item.id,
            content: item.content,
            isCompleted: item.is_completed,
            completedAt: item.completed_at,
            position: item.position,
          },
        ],
      }))
      setNewItem('')
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not add the item', tone: 'error' })
    } finally {
      setAdding(false)
    }
  }

  async function toggleItem(itemId: string) {
    const item = list.items.find((i) => i.id === itemId)
    if (!item) return
    const next = !item.isCompleted
    // optimistic
    setList((l) => ({
      ...l,
      items: l.items.map((i) => (i.id === itemId ? { ...i, isCompleted: next } : i)),
    }))
    try {
      await api(`/api/list-items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isCompleted: next }),
      })
    } catch (err) {
      // revert
      setList((l) => ({
        ...l,
        items: l.items.map((i) => (i.id === itemId ? { ...i, isCompleted: !next } : i)),
      }))
      toast({ message: err instanceof Error ? err.message : 'Could not update the item', tone: 'error' })
    }
  }

  async function deleteItem(itemId: string) {
    const removed = list.items.find((i) => i.id === itemId)
    setList((l) => ({ ...l, items: l.items.filter((i) => i.id !== itemId) }))
    try {
      await api(`/api/list-items/${itemId}`, { method: 'DELETE' })
      if (removed) {
        toast({
          message: `Removed “${removed.content}”`,
          tone: 'success',
          action: {
            label: 'Undo',
            onClick: () => {
              void api(`/api/lists/${list.id}/items`, {
                method: 'POST',
                body: JSON.stringify({ content: removed.content }),
              }).then(() => router.refresh())
            },
          },
        })
      }
    } catch (err) {
      setList(initialList)
      toast({ message: err instanceof Error ? err.message : 'Could not delete the item', tone: 'error' })
    }
  }

  async function clearCompleted() {
    setBusy(true)
    try {
      await api(`/api/lists/${list.id}/clear-completed`, { method: 'POST' })
      setList((l) => ({ ...l, items: l.items.filter((i) => !i.isCompleted) }))
      setConfirmClearDone(false)
      toast({ message: 'Completed items cleared', tone: 'success' })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not clear completed items', tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  // ── list actions ────────────────────────────────────────────────────────────

  async function saveRename() {
    const name = renameValue.trim()
    if (!name || name === list.name) {
      setRenaming(false)
      return
    }
    try {
      await api(`/api/lists/${list.id}`, { method: 'PATCH', body: JSON.stringify({ name }) })
      setList((l) => ({ ...l, name }))
      setRenaming(false)
      toast({ message: 'List renamed', tone: 'success' })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not rename the list', tone: 'error' })
    }
  }

  async function deleteList() {
    setBusy(true)
    try {
      await api(`/api/lists/${list.id}`, { method: 'DELETE' })
      toast({ message: `“${list.name}” deleted`, tone: 'success' })
      router.push('/lists')
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not delete the list', tone: 'error' })
    } finally {
      setBusy(false)
      setConfirmDeleteList(false)
    }
  }

  const total = list.items.length
  const doneCount = done.length
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cream-200 text-2xl">
            {list.icon}
          </span>
          {renaming ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveRename()
                  if (e.key === 'Escape') setRenaming(false)
                }}
                autoFocus
                maxLength={60}
                className="h-10 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 text-lg font-semibold focus:border-navy-500 focus:outline-none"
                aria-label="List name"
              />
              <button
                onClick={() => void saveRename()}
                aria-label="Save name"
                className="rounded-lg p-2 text-sage-500 hover:bg-cream-200"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setRenaming(false)}
                aria-label="Cancel rename"
                className="rounded-lg p-2 text-ink-400 hover:bg-cream-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-semibold text-ink-900">{list.name}</h1>
              <p className="mt-0.5 text-sm text-ink-400">
                {total === 0 ? 'Nothing here yet' : doneCount === total ? 'All done ✓' : `${doneCount} of ${total} done`}
              </p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {!renaming && (
            <button
              onClick={() => {
                setRenameValue(list.name)
                setRenaming(true)
              }}
              aria-label="Rename list"
              className="rounded-xl p-2.5 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-700"
            >
              <Pencil className="h-4.5 w-4.5" />
            </button>
          )}
          <button
            onClick={() => setConfirmDeleteList(true)}
            aria-label="Delete list"
            className="rounded-xl p-2.5 text-ink-400 transition-colors hover:bg-coral-200/50 hover:text-coral-500"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {total > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-cream-200">
          <div className="h-full rounded-full bg-sage-300 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* add item */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void addItem()
        }}
        className="flex gap-2"
      >
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add an item…"
          aria-label="Add an item"
          maxLength={300}
          className="h-12 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 text-[15px] placeholder:text-ink-400 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/10"
        />
        <Button type="submit" size="icon" className="h-12 w-12 shrink-0" loading={adding} disabled={!newItem.trim()} aria-label="Add item">
          {!adding && <Plus className="h-5 w-5" />}
        </Button>
      </form>

      {/* open items */}
      <div className="space-y-2">
        {open.map((item) => (
          <ItemRow key={item.id} content={item.content} completed={false} onToggle={() => void toggleItem(item.id)} onDelete={() => void deleteItem(item.id)} />
        ))}
      </div>

      {done.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-300">
              Completed · {doneCount}
            </h2>
            <button
              onClick={() => setConfirmClearDone(true)}
              className="text-[13px] font-medium text-ink-400 transition-colors hover:text-coral-500"
            >
              Clear completed
            </button>
          </div>
          {done.map((item) => (
            <ItemRow key={item.id} content={item.content} completed onToggle={() => void toggleItem(item.id)} onDelete={() => void deleteItem(item.id)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteList}
        title={`Delete “${list.name}”?`}
        message="All items on this list will be removed too. This can't be undone."
        confirmLabel="Delete list"
        destructive
        loading={busy}
        onConfirm={() => void deleteList()}
        onCancel={() => setConfirmDeleteList(false)}
      />
      <ConfirmDialog
        open={confirmClearDone}
        title="Clear completed items?"
        message={`${doneCount} completed item${doneCount === 1 ? '' : 's'} will be removed from this list.`}
        confirmLabel="Clear"
        destructive
        loading={busy}
        onConfirm={() => void clearCompleted()}
        onCancel={() => setConfirmClearDone(false)}
      />
    </div>
  )
}

function ItemRow({
  content,
  completed,
  onToggle,
  onDelete,
}: {
  content: string
  completed: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
        completed ? 'border-cream-200 bg-cream-100' : 'border-cream-300 bg-cream-50 hover:border-cream-400'
      )}
    >
      <button
        onClick={onToggle}
        aria-label={completed ? `Mark "${content}" as not done` : `Mark "${content}" as done`}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
          completed
            ? 'border-sage-500 bg-sage-500 text-white'
            : 'border-ink-300 text-transparent hover:border-sage-500 hover:text-sage-500/40'
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
      </button>
      <span className={cn('min-w-0 flex-1 text-[15px]', completed ? 'text-ink-400 line-through' : 'text-ink-900')}>
        {content}
      </span>
      <button
        onClick={onDelete}
        aria-label={`Delete "${content}"`}
        className="shrink-0 rounded-lg p-1.5 text-ink-200 transition-colors hover:bg-coral-200/50 hover:text-coral-500"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
