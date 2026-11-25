'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { MailCheck, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/field'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (resetError) {
        setError(resetError.message)
        return
      }
      setSent(true)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-3xl border border-cream-300 bg-cream-50 p-6 text-center shadow-card sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-200">
          <MailCheck className="h-7 w-7 text-sky-500" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">Reset link sent</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-500">
          If an account exists for <strong className="text-ink-800">{email}</strong>, a password
          reset link is on its way. Check your inbox.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-cream-300 bg-white px-5 text-sm font-semibold text-ink-800 transition-colors hover:bg-cream-200"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-cream-300 bg-cream-50 p-6 shadow-card sm:p-8">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Forgot your password?</h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Enter your email and we&apos;ll send you a link to set a new one.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          error={error}
        />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          <Send className="h-4.5 w-4.5" aria-hidden />
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-navy-600 hover:text-navy-700">
          Sign in
        </Link>
      </p>
    </div>
  )
}
