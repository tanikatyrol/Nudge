'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/field'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Passwords need at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      })
      if (signUpError) {
        setError(
          signUpError.message === 'User already registered'
            ? 'An account with this email already exists — try logging in.'
            : signUpError.message
        )
        return
      }
      if (data.session) {
        // email confirmation disabled → straight to onboarding
        router.replace('/onboarding')
        router.refresh()
        return
      }
      setCheckEmail(true)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkEmail) {
    return (
      <div className="rounded-3xl border border-cream-300 bg-cream-50 p-6 text-center shadow-card sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-200">
          <MailCheck className="h-7 w-7 text-sage-500" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">Check your inbox</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-500">
          We sent a confirmation link to <strong className="text-ink-800">{email}</strong>. Click it to
          activate your account, then you can sign in.
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
      <h1 className="font-display text-2xl font-semibold text-ink-900">Start remembering</h1>
      <p className="mt-1.5 text-sm text-ink-500">
        A calmer way to keep track of the little things.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <TextField
          label="Your name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Maya"
          hint="Nudge will greet you by name."
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          error={error}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="text-ink-400 transition-colors hover:text-ink-700"
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          }
        />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          <CheckCircle2 className="h-4.5 w-4.5" aria-hidden />
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already remembering with Nudge?{' '}
        <Link href="/login" className="font-semibold text-navy-600 hover:text-navy-700">
          Sign in
        </Link>
      </p>
    </div>
  )
}
