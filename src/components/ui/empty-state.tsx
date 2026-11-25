import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'sky',
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  tone?: 'sky' | 'sage' | 'peach' | 'lilac' | 'butter'
  className?: string
}) {
  const toneClasses: Record<string, string> = {
    sky: 'bg-sky-200 text-sky-500',
    sage: 'bg-sage-200 text-sage-500',
    peach: 'bg-peach-200 text-peach-500',
    lilac: 'bg-lilac-200 text-lilac-500',
    butter: 'bg-butter-200 text-butter-500',
  }
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-in', className)}>
      <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', toneClasses[tone])}>
        <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
