import { Terminal } from 'lucide-react'
import { Logo } from '@/components/ui/logo'

export function SetupNotice({ variant = 'env' }: { variant?: 'env' | 'profile' }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream-100 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-cream-300 bg-cream-50 p-8 shadow-card">
        <Logo size={40} />
        {variant === 'env' ? (
          <>
            <h1 className="mt-6 font-display text-2xl font-semibold text-ink-900">
              One more step: connect Supabase
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Nudge is deployed, but its database and authentication aren&apos;t connected yet.
              Follow the setup guide — it takes about five minutes.
            </p>
            <ol className="mt-5 space-y-3 text-sm text-ink-700">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream-200 text-xs font-bold">
                  1
                </span>
                <span>
                  Create a project at <strong>supabase.com</strong> and copy the URL, anon key and
                  service-role key.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream-200 text-xs font-bold">
                  2
                </span>
                <span>
                  Run the migration in <code className="rounded bg-cream-200 px-1.5 py-0.5 text-xs">supabase/migrations/0001_init.sql</code>{' '}
                  from the SQL editor.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream-200 text-xs font-bold">
                  3
                </span>
                <span>
                  Set the <code className="rounded bg-cream-200 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_*</code> variables
                  in your environment and redeploy.
                </span>
              </li>
            </ol>
            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-cream-200/70 px-4 py-3 text-sm text-ink-600">
              <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
              <p>
                Full instructions live in the project&apos;s <strong>README.md</strong>.
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 font-display text-2xl font-semibold text-ink-900">
              Your profile isn&apos;t ready yet
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              You&apos;re signed in, but the automatic profile setup trigger hasn&apos;t run for this
              account. This usually means the database migration (which creates the signup trigger)
              hasn&apos;t been applied yet — run{' '}
              <code className="rounded bg-cream-200 px-1.5 py-0.5 text-xs">supabase/migrations/0001_init.sql</code>{' '}
              and try again.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
