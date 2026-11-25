'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!data.user) router.replace('/forgot-password')
      })
      .catch(() => router.replace('/forgot-password'))
      .finally(() => setChecking(false))
  }, [router])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Passwords need at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords don’t match.')
      return
    }
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      toast({ message: 'Password updated — you’re all set', tone: 'success' })
      router.replace('/today')
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="rounded-3xl border border-cream-300 bg-cream-50 p-8 text-center shadow-card">
        <p className="text-sm text-ink-400">Checking your reset link…</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-cream-300 bg-cream-50 p-6 shadow-card sm:p-8">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Set a new password</h1>
      <p className="mt-1.5 text-sm text-ink-500">Pick something memorable — Nudge will remember the rest.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <TextField
          label="New password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
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
        <TextField
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type it once more"
          error={error}
        />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          <KeyRound className="h-4.5 w-4.5" aria-hidden />
          Update password
        </Button>
      </form>
    </div>
  )
}
