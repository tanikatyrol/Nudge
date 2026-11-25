import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-2xl bg-navy-600 shadow-sm',
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Bell className="text-cream-50" style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.2} />
      <span
        className="absolute rounded-full bg-peach-300 ring-2 ring-navy-600"
        style={{ width: size * 0.22, height: size * 0.22, top: size * 0.14, right: size * 0.16 }}
      />
    </span>
  )
}

export function Logo({ size = 36, showWordmark = true, className }: { size?: number; showWordmark?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="font-display text-xl font-semibold tracking-tight text-ink-900">Nudge</span>
      )}
    </span>
  )
}
