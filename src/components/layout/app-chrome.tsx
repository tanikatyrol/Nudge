'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { History, ListTodo, Plus, Search, Settings, ShoppingBag, Sunrise } from 'lucide-react'
import { Logo, LogoMark } from '@/components/ui/logo'
import { QuickCaptureModal } from '@/components/reminders/quick-capture'
import { initialsOf, cn } from '@/lib/utils'
import type { Category, Profile } from '@/types'

// ── capture context ───────────────────────────────────────────────────────────

interface CaptureContextValue {
  openCapture: (prefill?: string) => void
}

const CaptureContext = createContext<CaptureContextValue>({ openCapture: () => {} })

export function useCapture() {
  return useContext(CaptureContext)
}

// ── chrome ────────────────────────────────────────────────────────────────────

export function AppChrome({
  profile,
  categories,
  children,
}: {
  profile: Profile
  categories: Category[]
  children: ReactNode
}) {
  const [captureOpen, setCaptureOpen] = useState(false)
  const [capturePrefill, setCapturePrefill] = useState<string | undefined>(undefined)

  const openCapture = useCallback((prefill?: string) => {
    setCapturePrefill(prefill)
    setCaptureOpen(true)
  }, [])

  const captureValue = useMemo(() => ({ openCapture }), [openCapture])

  return (
    <CaptureContext.Provider value={captureValue}>
      <div className="min-h-dvh">
        <DesktopSidebar profile={profile} />
        <div className="lg:pl-64">
          <MobileTopBar profile={profile} />
          <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5 sm:px-6 lg:pb-16 lg:pt-10">
            {children}
          </main>
        </div>
        <MobileBottomNav />
        <QuickCaptureModal
          open={captureOpen}
          onClose={() => setCaptureOpen(false)}
          timezone={profile.timezone}
          categories={categories}
          prefill={capturePrefill}
        />
      </div>
    </CaptureContext.Provider>
  )
}

const NAV_ITEMS = [
  { href: '/today', label: 'Today', icon: Sunrise },
  { href: '/reminders', label: 'Reminders', icon: ListTodo },
  { href: '/lists', label: 'Lists', icon: ShoppingBag },
  { href: '/memories', label: 'Memories', icon: History },
]

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Sunrise; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150',
        active ? 'bg-cream-200 text-ink-900' : 'text-ink-500 hover:bg-cream-200/60 hover:text-ink-800'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className={cn('h-[18px] w-[18px]', active ? 'text-navy-600' : 'text-ink-400')} strokeWidth={1.9} aria-hidden />
      {label}
    </Link>
  )
}

function DesktopSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-cream-300 bg-cream-100 px-4 py-6 lg:flex">
      <Link href="/today" className="px-2" aria-label="Nudge — go to Today">
        <Logo size={34} />
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      <div className="space-y-1 border-t border-cream-300 pt-4">
        <NavItem href="/search" label="Search" icon={Search} active={pathname === '/search'} />
        <NavItem href="/settings" label="Settings" icon={Settings} active={pathname === '/settings'} />
        <div className="mt-3 flex items-center gap-3 px-3 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lilac-200 text-xs font-bold text-lilac-500">
            {initialsOf(profile.displayName, profile.email)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-800">{profile.displayName ?? 'You'}</p>
            <p className="truncate text-xs text-ink-400">{profile.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function MobileTopBar({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-cream-300/70 bg-cream-100/85 px-4 py-3 backdrop-blur-md sm:px-6 lg:hidden">
      <Link href="/today" aria-label="Nudge — go to Today">
        <Logo size={30} showWordmark={false} />
      </Link>
      <div className="flex items-center gap-1">
        <Link
          href="/search"
          aria-label="Search"
          className="rounded-xl p-2.5 text-ink-500 transition-colors hover:bg-cream-200 hover:text-ink-800"
        >
          <Search className="h-5 w-5" strokeWidth={1.9} />
        </Link>
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-lilac-200 text-xs font-bold text-lilac-500"
        >
          {initialsOf(profile.displayName, profile.email)}
        </Link>
      </div>
    </header>
  )
}

function MobileBottomNav() {
  const pathname = usePathname()
  const { openCapture } = useCapture()

  const items = [
    { href: '/today', label: 'Today', icon: Sunrise },
    { href: '/reminders', label: 'Reminders', icon: ListTodo },
    { href: '/lists', label: 'Lists', icon: ShoppingBag },
    { href: '/memories', label: 'Memories', icon: History },
  ]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-300 bg-cream-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
        {items.slice(0, 2).map((item) => (
          <MobileNavItem key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + '/')} />
        ))}
        <div className="flex justify-center">
          <button
            onClick={() => openCapture()}
            aria-label="New reminder"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-600 text-white shadow-lifted transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            <Plus className="h-6 w-6" strokeWidth={2.2} />
          </button>
        </div>
        {items.slice(2).map((item) => (
          <MobileNavItem key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + '/')} />
        ))}
      </div>
    </nav>
  )
}

function MobileNavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Sunrise; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-medium transition-colors',
        active ? 'text-navy-600' : 'text-ink-400 hover:text-ink-700'
      )}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.1 : 1.8} aria-hidden />
      <span>{label}</span>
    </Link>
  )
}
