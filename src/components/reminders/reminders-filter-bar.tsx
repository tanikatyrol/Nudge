'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Segmented } from '@/components/ui/segmented'
import { CategoryDot } from '@/components/ui/category-dot'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

export function RemindersFilterBar({
  status,
  category,
  categories,
}: {
  status: 'open' | 'completed'
  category: string
  categories: Category[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  function update(next: { status?: string; category?: string }) {
    const params = new URLSearchParams()
    const s = next.status ?? status
    const c = next.category ?? category
    if (s && s !== 'open') params.set('status', s)
    if (c) params.set('category', c)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Segmented
        ariaLabel="Filter by status"
        options={[
          { value: 'open', label: 'Open' },
          { value: 'completed', label: 'Completed' },
        ]}
        value={status}
        onChange={(v) => update({ status: v })}
        size="sm"
      />
      <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => update({ category: '' })}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            category === ''
              ? 'border-navy-600 bg-navy-600 text-white'
              : 'border-cream-300 bg-cream-50 text-ink-500 hover:border-cream-400'
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => update({ category: category === c.id ? '' : c.id })}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              category === c.id
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
  )
}
