import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-cream-100">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-lilac-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-peach-200/40 blur-3xl"
      />
      <header className="relative z-10 px-4 pt-6 sm:px-6">
        <Link href="/" className="inline-flex" aria-label="Nudge — back to home">
          <Logo size={32} />
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="relative z-10 pb-8 text-center">
        <Link href="/" className="text-sm text-ink-400 transition-colors hover:text-ink-600">
          ← Back to nudge.app
        </Link>
      </footer>
    </div>
  )
}
