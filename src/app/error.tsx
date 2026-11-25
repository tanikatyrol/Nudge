'use client'

import { useEffect } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] unhandled error:', error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-cream-100 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-peach-200">
        <TriangleAlert className="h-7 w-7 text-peach-500" aria-hidden />
      </span>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
        An unexpected error interrupted Nudge. It&apos;s not you — try again, and if it keeps
        happening your data is safe regardless.
      </p>
      <Button className="mt-6" onClick={reset}>
        <RefreshCw className="h-4 w-4" aria-hidden />
        Try again
      </Button>
    </div>
  )
}
