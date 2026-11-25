'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BellRing, Check, ChevronDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { usePushStatus } from '@/components/push/use-push'
import { detectedTimezone } from '@/lib/time'
import { api, cn } from '@/lib/utils'
import type { Profile } from '@/types'

const SAMPLE_CAPTURES = [
  'Pay electricity bill tomorrow at 9 AM',
  'Change water filter next month',
  'Buy milk when I go shopping',
]

export function OnboardingWizard({ profile }: { profile: Profile }) {
  const router = useRouter()
  const { toast } = useToast()
  const push = usePushStatus()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(profile.displayName ?? '')
  const [timezone, setTimezone] = useState(profile.timezone || detectedTimezone())
  const [saving, setSaving] = useState(false)
  const [captured, setCaptured] = useState<string[]>([])
  const [captureText, setCaptureText] = useState('')

  async function saveProfile(fields: Record<string, unknown>) {
    setSaving(true)
    try {
      await api('/api/profile', { method: 'PATCH', body: JSON.stringify(fields) })
      return true
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not save', tone: 'error' })
      return false
    } finally {
      setSaving(false)
    }
  }

  async function finish() {
    await saveProfile({ onboarded: true })
    router.replace('/today')
    router.refresh()
  }

  async function skip() {
    await saveProfile({ onboarded: true })
    router.replace('/today')
    router.refresh()
  }

  async function tryCapture(text: string) {
    const value = text.trim()
    if (!value) return
    try {
      const res = await api<{ kind: string; title: string; listName?: string }>('/api/capture', {
        method: 'POST',
        body: JSON.stringify({ text: value }),
      })
      setCaptured((c) => [...c, res.kind === 'list_item' ? `${res.title} → ${res.listName} list` : res.title])
      setCaptureText('')
      toast({
        message: res.kind === 'list_item' ? `Added to ${res.listName} list` : `“${res.title}” — remembered`,
        tone: 'success',
      })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not save', tone: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* progress */}
      <div className="flex items-center justify-center gap-2 pt-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === step ? 'w-8 bg-navy-600' : i < step ? 'w-4 bg-sage-300' : 'w-4 bg-cream-300'
            )}
          />
        ))}
      </div>

      <div className="rounded-3xl border border-cream-300 bg-cream-50 p-6 shadow-card sm:p-8">
        {step === 0 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <span className="text-4xl" aria-hidden>
                👋
              </span>
              <h1 className="mt-3 font-display text-2xl font-semibold text-ink-900">
                Welcome to Nudge
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                A personal memory assistant for the little things — bills, filters, birthdays, milk.
                Type it once, forget about it, and Nudge remembers for you.
              </p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">What should we call you?</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Your name"
                autoFocus
                className="h-12 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 text-[16px] focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/10"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-700">
                Your timezone
              </span>
              <div className="relative">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-cream-300 bg-cream-50 px-4 pr-10 text-sm focus:border-navy-500 focus:outline-none"
                >
                  <option value={timezone}>{timezone.replace(/_/g, ' ')}</option>
                  <option value="Asia/Kuala_Lumpur">Asia / Kuala Lumpur</option>
                  <option value="Asia/Singapore">Asia / Singapore</option>
                  <option value="Europe/London">Europe / London</option>
                  <option value="America/New_York">America / New York</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
              </div>
              <span className="mt-1.5 block text-xs text-ink-400">Detected: {detectedTimezone().replace(/_/g, ' ')}</span>
            </label>
            <Button
              size="lg"
              className="w-full"
              loading={saving}
              disabled={!name.trim()}
              onClick={async () => {
                const ok = await saveProfile({ displayName: name.trim(), timezone })
                if (ok) setStep(1)
              }}
            >
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-200">
                <BellRing className="h-6 w-6 text-sky-500" aria-hidden />
              </span>
              <h1 className="mt-3 font-display text-2xl font-semibold text-ink-900">
                Gentle reminders, right on time
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                Nudge can send notifications to this device even when the app is closed. It only
                reminds you — never anything else. You can change this anytime in Settings.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full"
              loading={push.supported && !push.ready ? false : saving || undefined}
              onClick={async () => {
                try {
                  await push.enable()
                  toast({ message: 'Reminders enabled ✓', tone: 'success' })
                } catch {
                  toast({ message: 'You can enable reminders later in Settings.', tone: 'info' })
                }
                setStep(2)
              }}
            >
              <BellRing className="h-4.5 w-4.5" aria-hidden />
              Enable notifications
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>
              Maybe later
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lilac-200">
                <Sparkles className="h-6 w-6 text-lilac-500" aria-hidden />
              </span>
              <h1 className="mt-3 font-display text-2xl font-semibold text-ink-900">Try it now</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                Type something the way you&apos;d say it out loud. Nudge figures out the date, time and
                category.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                void tryCapture(captureText)
              }}
              className="flex gap-2"
            >
              <input
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                placeholder="e.g. Renew car insurance on the 15th"
                maxLength={300}
                className="h-12 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 text-[16px] focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/10"
              />
              <Button type="submit" className="h-12 shrink-0" disabled={!captureText.trim()}>
                Try
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              {SAMPLE_CAPTURES.filter((s) => !captured.some((c) => c.toLowerCase().includes(s.split(' ')[0].toLowerCase()))).map((sample) => (
                <button
                  key={sample}
                  onClick={() => void tryCapture(sample)}
                  className="rounded-full border border-cream-300 bg-cream-100 px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-cream-200"
                >
                  “{sample}”
                </button>
              ))}
            </div>

            {captured.length > 0 && (
              <div className="rounded-2xl bg-sage-200/40 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-sage-500">
                  <Check className="h-4 w-4" aria-hidden />
                  {captured.length === 1 ? 'Your first memory!' : `${captured.length} memories captured`}
                </p>
                <ul className="mt-2 space-y-1">
                  {captured.map((c, i) => (
                    <li key={i} className="truncate text-sm text-ink-600">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button size="lg" className="w-full" loading={saving} onClick={() => void finish()}>
              I&apos;m ready — take me to Today
            </Button>
          </div>
        )}
      </div>

      <button
        onClick={() => void skip()}
        className="mx-auto block text-sm text-ink-400 transition-colors hover:text-ink-700"
      >
        Skip setup
      </button>
    </div>
  )
}
