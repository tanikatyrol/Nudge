'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { AlertCircle, History, ListTodo, Loader2, Search, X } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { CategoryChip } from '@/components/ui/category-dot'
import { api, cn } from '@/lib/utils'
import type { Category } from '@/types'

interface SearchResponse {
  reminders: Array<{
    id: string
    title: string
    notes: string | null
    status: 'active' | 'completed'
    dueAt: string | null
    categoryId: string | null
    category: { name: string; color: string } | null
  }>
  events: Array<{
    id: string
    title: string
    kind: string
    occurredAt: string
    categoryName: string | null
  }>
  listItems: Array<{
    id: string
    content: string
    isCompleted: boolean
    listId: string
    listName: string
    listIcon: string
  }>
}

export function SearchView() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const q = query.trim()
    const timer = setTimeout(async () => {
      if (q.length === 0) {
        setResults(null)
        setSearched(false)
        setError(null)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const res = await api<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`)
        setResults(res)
        setSearched(true)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults(null)
        setSearched(true)
      } finally {
        setLoading(false)
      }
    }, q ? 300 : 0)
    return () => clearTimeout(timer)
  }, [query])

  const hasResults =
    results && (results.reminders.length > 0 || results.events.length > 0 || results.listItems.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Search</h1>
        <p className="mt-1 text-sm text-ink-500">Find reminders and past activity across everything.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reminders, lists, past activity…"
          aria-label="Search"
          maxLength={100}
          className="h-14 w-full rounded-2xl border border-cream-300 bg-cream-50 pl-12 pr-12 text-[16px] shadow-card placeholder:text-ink-400 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/10"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-400 hover:bg-cream-200 hover:text-ink-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Searching…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-coral-300 bg-coral-200/30 px-4 py-3 text-sm text-coral-500">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      {!loading && !error && searched && !hasResults && (
        <EmptyState
          icon={Search}
          tone="sky"
          title={`No matches for “${query}”`}
          description="Try a different word — search covers reminder titles, notes, past activity and list items."
        />
      )}

      {!loading && !error && results && (
        <div className="space-y-6">
          {results.reminders.length > 0 && (
            <section>
              <h2 className="mb-2.5 px-1 text-[13px] font-bold uppercase tracking-wider text-ink-400">
                Reminders · {results.reminders.length}
              </h2>
              <div className="space-y-2">
                {results.reminders.map((r) => (
                  <Link
                    key={r.id}
                    href={`/reminders/${r.id}/edit`}
                    className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 transition-colors hover:border-cream-400 hover:bg-cream-200/40"
                  >
                    <ListTodo className="h-4.5 w-4.5 shrink-0 text-ink-400" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-[15px] font-medium', r.status === 'completed' ? 'text-ink-400 line-through' : 'text-ink-900')}>
                        {r.title}
                      </p>
                      {r.notes && <p className="truncate text-xs text-ink-400">{r.notes}</p>}
                    </div>
                    {r.category && (
                      <CategoryChip category={r.category as Category} className="hidden sm:inline-flex" />
                    )}
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        r.status === 'completed' ? 'bg-sage-200 text-sage-500' : 'bg-cream-200 text-ink-500'
                      )}
                    >
                      {r.status === 'completed' ? 'Done' : 'Open'}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.listItems.length > 0 && (
            <section>
              <h2 className="mb-2.5 px-1 text-[13px] font-bold uppercase tracking-wider text-ink-400">
                Lists · {results.listItems.length}
              </h2>
              <div className="space-y-2">
                {results.listItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/lists/${item.listId}`}
                    className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 transition-colors hover:border-cream-400 hover:bg-cream-200/40"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cream-200 text-base">
                      {item.listIcon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-[15px]', item.isCompleted ? 'text-ink-400 line-through' : 'text-ink-900')}>
                        {item.content}
                      </p>
                      <p className="text-xs text-ink-400">in {item.listName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.events.length > 0 && (
            <section>
              <h2 className="mb-2.5 px-1 text-[13px] font-bold uppercase tracking-wider text-ink-400">
                Past activity · {results.events.length}
              </h2>
              <div className="space-y-2">
                {results.events.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3"
                  >
                    <History className="h-4.5 w-4.5 shrink-0 text-ink-300" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-ink-900">{e.title}</p>
                      <p className="text-xs text-ink-400">
                        {e.kind === 'completed' ? 'Completed' : e.kind === 'recurring_advanced' ? 'Recurred' : 'Nudged'} ·{' '}
                        {new Date(e.occurredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {e.categoryName && (
                      <span className="hidden rounded-full bg-cream-200 px-2.5 py-0.5 text-xs font-medium text-ink-500 sm:block">
                        {e.categoryName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!searched && (
        <EmptyState
          icon={Search}
          tone="lilac"
          title="Search everything you've remembered"
          description="Reminder titles and notes, past completions, and everything on your lists."
        />
      )}
    </div>
  )
}
