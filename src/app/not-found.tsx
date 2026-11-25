import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Logo } from '@/components/ui/logo'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-cream-100 px-4 text-center">
      <Logo size={44} showWordmark={false} />
      <span className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-200">
        <Compass className="h-7 w-7 text-ink-400" aria-hidden />
      </span>
      <h1 className="mt-4 font-display text-3xl font-semibold text-ink-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
        This page seems to have slipped away. Your reminders, however, are right where you left them.
      </p>
      <Link
        href="/today"
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-navy-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
      >
        Back to Today
      </Link>
    </div>
  )
}
