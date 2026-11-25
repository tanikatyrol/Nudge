import { cn } from '@/lib/utils'
import type { Category } from '@/types'

const COLOR_DOT: Record<string, string> = {
  lilac: 'bg-lilac-300',
  peach: 'bg-peach-300',
  sage: 'bg-sage-300',
  sky: 'bg-sky-300',
  butter: 'bg-butter-300',
  coral: 'bg-coral-300',
  navy: 'bg-navy-600',
}

const COLOR_TEXT: Record<string, string> = {
  lilac: 'text-lilac-500',
  peach: 'text-peach-500',
  sage: 'text-sage-500',
  sky: 'text-sky-500',
  butter: 'text-butter-500',
  coral: 'text-coral-500',
  navy: 'text-navy-600',
}

const COLOR_BG: Record<string, string> = {
  lilac: 'bg-lilac-200',
  peach: 'bg-peach-200',
  sage: 'bg-sage-200',
  sky: 'bg-sky-200',
  butter: 'bg-butter-200',
  coral: 'bg-coral-200',
  navy: 'bg-ink-100',
}

export function CategoryDot({ color, className }: { color?: string | null; className?: string }) {
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', COLOR_DOT[color ?? ''] ?? 'bg-ink-300', className)}
      aria-hidden
    />
  )
}

export function CategoryChip({ category, className }: { category?: Category | null; className?: string }) {
  if (!category) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        COLOR_BG[category.color] ?? 'bg-cream-200',
        COLOR_TEXT[category.color] ?? 'text-ink-500',
        className
      )}
    >
      <CategoryDot color={category.color} className="h-1.5 w-1.5" />
      {category.name}
    </span>
  )
}

export const categoryColorDotClass = COLOR_DOT
export const categoryColorTextClass = COLOR_TEXT
export const categoryColorBgClass = COLOR_BG
