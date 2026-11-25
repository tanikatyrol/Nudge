import Link from 'next/link'
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  ListChecks,
  Lock,
  PenLine,
  Smartphone,
  Sparkles,
  Undo2,
  Wallet,
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { getAuthUser } from '@/lib/supabase/server'

export const metadata = {
  title: 'Nudge — Your Life, Remembered',
}

const STEPS = [
  {
    icon: PenLine,
    tone: 'lilac' as const,
    title: 'Capture',
    text: 'Type it the way you would say it. “Pay electricity bill tomorrow at 9 AM.” Nudge understands the when, the what and the how often.',
  },
  {
    icon: BellRing,
    tone: 'peach' as const,
    title: 'Remember',
    text: 'At the right moment, a gentle notification arrives — on your phone, even when Nudge is closed. Recurring routines roll forward on their own.',
  },
  {
    icon: Sparkles,
    tone: 'sage' as const,
    title: 'Relax',
    text: 'Stop holding it all in your head. Your daily briefing shows what matters today, so the little things never slip again.',
  },
]

const FEATURES = [
  {
    icon: PenLine,
    title: 'Natural language capture',
    text: 'Dates, times, repeats and categories — parsed from plain words, with ambiguous ones confirmed before saving.',
  },
  {
    icon: CalendarClock,
    title: 'Recurring life maintenance',
    text: 'Bedsheets weekly, air conditioner service every 6 months, toothbrushes every 3 — set once, remembered forever.',
  },
  {
    icon: ListChecks,
    title: 'Quick lists',
    text: '“Buy milk when I go shopping” lands straight on your Shopping list. Simple checklists for everything else.',
  },
  {
    icon: BellRing,
    title: 'Reliable push reminders',
    text: 'Server-side scheduling delivers notifications even when your browser is closed. Snooze with one tap.',
  },
  {
    icon: Lock,
    title: 'Private by design',
    text: 'Your memories are yours alone — every record is protected by database-level row security.',
  },
  {
    icon: Smartphone,
    title: 'Installable app',
    text: 'Add Nudge to your home screen and it behaves like a native app — light or dark, your timezone, your device.',
  },
]

function toneClasses(tone: 'lilac' | 'peach' | 'sage' | 'sky' | 'butter') {
  return {
    lilac: 'bg-lilac-200 text-lilac-500',
    peach: 'bg-peach-200 text-peach-500',
    sage: 'bg-sage-200 text-sage-500',
    sky: 'bg-sky-200 text-sky-500',
    butter: 'bg-butter-200 text-butter-500',
  }[tone]
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="rounded-[2rem] border border-cream-300 bg-cream-50 p-5 shadow-lifted sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-ink-900">Good morning, Maya</p>
            <p className="text-sm text-ink-400">Tuesday · 3 things today · 1 overdue</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lilac-200 text-xs font-bold text-lilac-500">
            M
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-cream-300 bg-white px-3.5 py-3">
          <Sparkles className="h-4 w-4 shrink-0 text-lilac-500" aria-hidden />
          <p className="text-sm text-ink-400">What should Nudge remember?</p>
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="flex items-start gap-3 rounded-xl border border-coral-300 bg-coral-200/20 px-3.5 py-3">
            <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-coral-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900">Pay electricity bill</p>
              <p className="mt-0.5 text-xs font-medium text-coral-500">Yesterday, 9:00 AM · 🧾 Bills</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-cream-300 bg-white px-3.5 py-3">
            <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900">Water the plants</p>
              <p className="mt-0.5 text-xs text-ink-500">Today, 6:00 PM · 🏡 Home</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-cream-300 bg-white px-3.5 py-3">
            <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900">Mum&apos;s birthday gift</p>
              <p className="mt-0.5 text-xs text-ink-500">Tomorrow, 9:00 AM · 🌿 Personal</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-sage-200/40 px-3.5 py-2.5">
            <Undo2 className="h-3.5 w-3.5 text-sage-500" aria-hidden />
            <p className="text-xs font-medium text-sage-500">Done today · Change bedsheets, Call the dentist</p>
          </div>
        </div>
      </div>

      <div className="absolute -right-3 -top-4 hidden rotate-3 rounded-xl border border-cream-300 bg-butter-200 px-3.5 py-2.5 shadow-card sm:block">
        <p className="text-xs font-semibold text-butter-500">
          <Wallet className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Road tax renewal · 1 Dec
        </p>
      </div>
      <div className="absolute -bottom-4 -left-4 hidden -rotate-2 rounded-xl border border-cream-300 bg-sky-200 px-3.5 py-2.5 shadow-card sm:block">
        <p className="text-xs font-semibold text-sky-500">
          <BellRing className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Nudge: Service the car every 6 months
        </p>
      </div>
    </div>
  )
}

export default async function LandingPage() {
  const user = await getAuthUser()
  const ctaHref = user ? '/today' : '/signup'

  return (
    <div className="min-h-dvh bg-cream-100">
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-cream-300/60 bg-cream-100/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo size={32} />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how" className="text-sm font-medium text-ink-500 transition-colors hover:text-ink-900">
              How it works
            </a>
            <a href="#features" className="text-sm font-medium text-ink-500 transition-colors hover:text-ink-900">
              Features
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {!user && (
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-200"
              >
                Log in
              </Link>
            )}
            <Link
              href={ctaHref}
              className="inline-flex h-10 items-center rounded-xl bg-navy-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-700"
            >
              Start remembering
            </Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-peach-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-64 -left-32 h-[360px] w-[420px] rounded-full bg-sage-200/40 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-10 lg:pb-28 lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cream-300 bg-cream-50 px-3.5 py-1.5 text-xs font-semibold text-ink-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-lilac-500" aria-hidden />
              Your personal memory assistant
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl lg:text-[4.25rem]">
              Your life,
              <br />
              remembered.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-500">
              Remember the little things. Focus on the big things.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={ctaHref}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-navy-600 px-6 text-base font-semibold text-white shadow-sm transition-all hover:bg-navy-700 active:scale-[0.98]"
              >
                Start remembering
                <ArrowRight className="h-4.5 w-4.5" aria-hidden />
              </Link>
              <a
                href="#how"
                className="inline-flex h-12 items-center rounded-xl border border-cream-300 bg-cream-50 px-6 text-base font-semibold text-ink-800 shadow-sm transition-colors hover:bg-cream-200"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-ink-400">Free to use · Works on any device · Your data stays private</p>
          </div>
          <ProductPreview />
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="border-t border-cream-300/60 bg-cream-50/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
              How Nudge works
            </h2>
            <p className="mt-3 text-ink-500">
              Three steps. No folders, no tagging, no organizing. That&apos;s the whole point.
            </p>
          </div>
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative text-center md:text-left">
                <div className="flex items-center gap-4 md:flex-col md:items-start">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClasses(step.tone)}`}
                  >
                    <step.icon className="h-6 w-6" strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="font-display text-sm font-semibold text-ink-300 md:hidden">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">
                  <span className="mr-2 hidden text-ink-300 md:inline">{i + 1}.</span>
                  {step.title}
                </h3>
                <p className="mt-2 leading-relaxed text-ink-500">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="border-t border-cream-300/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
              Quietly powerful
            </h2>
            <p className="mt-3 text-ink-500">
              Everything Nudge does serves one goal: the right thought, at the right moment.
            </p>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-card transition-transform duration-200 hover:-translate-y-0.5"
              >
                <f.icon className="h-5 w-5 text-navy-600" strokeWidth={1.9} aria-hidden />
                <h3 className="mt-4 font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* closing CTA */}
      <section className="border-t border-cream-300/60 bg-cream-50/50">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:py-24">
          <h2 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
            What will you remember first?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-ink-500">
            The bill, the filter, the birthday, the milk. Hand them to Nudge and get your head back.
          </p>
          <Link
            href={ctaHref}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-navy-600 px-8 text-base font-semibold text-white shadow-sm transition-all hover:bg-navy-700 active:scale-[0.98]"
          >
            Start remembering
            <ArrowRight className="h-4.5 w-4.5" aria-hidden />
          </Link>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-cream-300/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6">
          <Logo size={28} />
          <p className="text-sm text-ink-400">
            Your life, remembered. Built for calm productivity.
          </p>
          <p className="text-sm text-ink-400">© {new Date().getFullYear()} Nudge</p>
        </div>
      </footer>
    </div>
  )
}
