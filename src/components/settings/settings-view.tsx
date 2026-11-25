'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BellRing,
  ChevronDown,
  Download,
  Globe2,
  LogOut,
  Palette,
  Save,
  Send,
  Tag,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextField, SelectField } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Segmented } from '@/components/ui/segmented'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useTheme } from '@/components/theme'
import { usePushStatus } from '@/components/push/use-push'
import { categoryColorDotClass } from '@/components/ui/category-dot'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { api, cn } from '@/lib/utils'
import { PASTEL_COLORS } from '@/lib/categories'
import type { Category, Profile, ThemeSetting } from '@/types'

export function SettingsView({ profile, categories }: { profile: Profile; categories: Category[] }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ink-500">Make Nudge feel like home.</p>
      </div>
      <ProfileSection profile={profile} />
      <AppearanceSection profile={profile} />
      <NotificationsSection profile={profile} />
      <CategoriesSection categories={categories} />
      <DataSection email={profile.email} />
    </div>
  )
}

// ── profile ───────────────────────────────────────────────────────────────────

function timezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return ['Asia/Kuala_Lumpur', 'Asia/Singapore', 'Europe/London', 'America/New_York']
  }
}

function ProfileSection({ profile }: { profile: Profile }) {
  const router = useRouter()
  const { toast } = useToast()
  const [name, setName] = useState(profile.displayName ?? '')
  const [timezone, setTimezone] = useState(profile.timezone)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    setSaving(true)
    try {
      await api('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: name.trim(), timezone }),
      })
      toast({ message: 'Profile saved', tone: 'success' })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const tzList = timezones()
  const regions = [...new Set(tzList.map((tz) => tz.split('/')[0]))]

  return (
    <section className="rounded-3xl border border-cream-300 bg-cream-50 p-5 shadow-card sm:p-6">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
        <UserRound className="h-4.5 w-4.5 text-lilac-500" aria-hidden />
        Profile
      </h2>
      <div className="mt-4 space-y-4">
        <TextField
          label="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          hint="Nudge uses this in your daily greeting."
        />
        <div className="text-sm text-ink-500">
          <span className="block text-sm font-medium text-ink-700">Email</span>
          <p className="mt-1">{profile.email}</p>
        </div>
        <div>
          <label htmlFor="timezone" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-700">
            <Globe2 className="h-3.5 w-3.5 text-ink-400" aria-hidden />
            Timezone
          </label>
          <div className="relative">
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-cream-300 bg-cream-50 px-3.5 pr-9 text-sm focus:border-navy-500 focus:outline-none"
            >
              {regions.map((region) => (
                <optgroup key={region} label={region.replace('_', ' ')}>
                  {tzList
                    .filter((tz) => tz.startsWith(region + '/'))
                    .map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
          </div>
          <p className="mt-1.5 text-sm text-ink-400">
            New reminders are scheduled in this timezone. Defaults to Asia/Kuala_Lumpur.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void save()} loading={saving} disabled={!name.trim()}>
            <Save className="h-4 w-4" aria-hidden />
            Save profile
          </Button>
        </div>
        {error && <p className="text-sm text-coral-500">{error}</p>}
      </div>
    </section>
  )
}

// ── appearance ────────────────────────────────────────────────────────────────

function AppearanceSection(_props: { profile: Profile }) {
  const { theme, setTheme } = useTheme()
  return (
    <section className="rounded-3xl border border-cream-300 bg-cream-50 p-5 shadow-card sm:p-6">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
        <Palette className="h-4.5 w-4.5 text-peach-500" aria-hidden />
        Appearance
      </h2>
      <p className="mt-1 text-sm text-ink-500">Warm and bright, or calm and dark — Nudge follows your choice.</p>
      <div className="mt-4">
        <Segmented
          ariaLabel="Theme"
          value={theme}
          onChange={(t) => setTheme(t as ThemeSetting)}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
      </div>
    </section>
  )
}

// ── notifications ─────────────────────────────────────────────────────────────

function NotificationsSection({ profile }: { profile: Profile }) {
  const router = useRouter()
  const { toast } = useToast()
  const push = usePushStatus()
  const [briefingEnabled, setBriefingEnabled] = useState(profile.briefingEnabled)
  const [briefingTime, setBriefingTime] = useState(profile.briefingTime)
  const [savingBriefing, setSavingBriefing] = useState(false)
  const [testing, setTesting] = useState(false)

  async function saveBriefing() {
    setSavingBriefing(true)
    try {
      await api('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ briefingEnabled, briefingTime }),
      })
      toast({ message: 'Daily briefing preferences saved', tone: 'success' })
      router.refresh()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not save', tone: 'error' })
    } finally {
      setSavingBriefing(false)
    }
  }

  async function onTest() {
    setTesting(true)
    try {
      await push.sendTest()
      toast({ message: 'Test notification sent — check this device', tone: 'success' })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not send the test', tone: 'error', durationMs: 7000 })
    } finally {
      setTesting(false)
    }
  }

  return (
    <section className="rounded-3xl border border-cream-300 bg-cream-50 p-5 shadow-card sm:p-6">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
        <BellRing className="h-4.5 w-4.5 text-sky-500" aria-hidden />
        Notifications
      </h2>

      <div className="mt-4 space-y-4">
        {!push.supported ? (
          <p className="rounded-xl bg-cream-200/70 px-4 py-3 text-sm text-ink-500">
            This browser doesn&apos;t support push notifications. Install Nudge on your phone (Add to
            Home Screen) to get reminders there.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-cream-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink-900">This device</p>
                <p className="mt-0.5 text-sm text-ink-500">
                  {push.ready
                    ? push.subscribed
                      ? 'Reminders enabled ✓'
                      : push.permission === 'denied'
                        ? 'Blocked in browser settings'
                        : 'Not enabled yet'
                    : 'Checking…'}
                </p>
              </div>
              {push.subscribed ? (
                <Button variant="secondary" size="sm" onClick={() => void push.disable().catch(() => undefined)}>
                  Turn off
                </Button>
              ) : (
                <Button size="sm" onClick={() => push.enable().catch(() => toast({ message: 'Notifications were not enabled', tone: 'error' }))} disabled={push.permission === 'denied'}>
                  Enable
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-ink-500">Send a real test notification to this device.</p>
              <Button variant="secondary" size="sm" onClick={() => void onTest()} loading={testing} disabled={!push.subscribed}>
                <Send className="h-3.5 w-3.5" aria-hidden />
                Test
              </Button>
            </div>
          </>
        )}

        <div className="border-t border-cream-200 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink-900">Daily briefing</p>
              <p className="mt-0.5 text-sm text-ink-500">
                A morning summary of what&apos;s due, overdue and coming up.
              </p>
            </div>
            <Switch checked={briefingEnabled} onChange={setBriefingEnabled} label="Daily briefing" />
          </div>
          {briefingEnabled && (
            <div className="mt-3 flex items-center justify-end gap-3">
              <label htmlFor="briefing-time" className="text-sm text-ink-500">
                At
              </label>
              <input
                id="briefing-time"
                type="time"
                value={briefingTime}
                onChange={(e) => setBriefingTime(e.target.value)}
                className="h-10 rounded-xl border border-cream-300 bg-cream-50 px-3 text-sm focus:border-navy-500 focus:outline-none"
              />
              <Button size="sm" onClick={() => void saveBriefing()} loading={savingBriefing}>
                Save
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ── categories ────────────────────────────────────────────────────────────────

function CategoriesSection({ categories: initial }: { categories: Category[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [categories, setCategories] = useState(initial)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<(typeof PASTEL_COLORS)[number]>('navy')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function addCategory() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const created = await api<Category>('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      setCategories((c) => [...c, created])
      setNewName('')
      toast({ message: `“${created.name}” added`, tone: 'success' })
      router.refresh()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not add the category', tone: 'error' })
    } finally {
      setAdding(false)
    }
  }

  async function saveRename(category: Category) {
    const name = editName.trim()
    if (!name || name === category.name) {
      setEditingId(null)
      return
    }
    try {
      const updated = await api<Category>(`/api/categories/${category.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      })
      setCategories((c) => c.map((x) => (x.id === updated.id ? updated : x)))
      setEditingId(null)
      router.refresh()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not rename', tone: 'error' })
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api(`/api/categories/${deleteTarget.id}`, { method: 'DELETE' })
      setCategories((c) => c.filter((x) => x.id !== deleteTarget.id))
      toast({ message: `“${deleteTarget.name}” deleted`, tone: 'success' })
      router.refresh()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not delete', tone: 'error' })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <section className="rounded-3xl border border-cream-300 bg-cream-50 p-5 shadow-card sm:p-6">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
        <Tag className="h-4.5 w-4.5 text-sage-500" aria-hidden />
        Categories
      </h2>
      <p className="mt-1 text-sm text-ink-500">Life areas to organize your reminders.</p>

      <div className="mt-4 space-y-1">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-cream-200/50">
            {editingId === category.id ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveRename(category)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                autoFocus
                maxLength={40}
                className="h-9 w-full max-w-xs rounded-lg border border-cream-300 bg-cream-50 px-3 text-sm focus:border-navy-500 focus:outline-none"
              />
            ) : (
              <span className="flex items-center gap-2.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', categoryColorDotClass[category.color])} aria-hidden />
                <span className="text-sm font-medium text-ink-900">{category.name}</span>
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              {editingId === category.id ? (
                <button
                  onClick={() => void saveRename(category)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sage-500 hover:bg-cream-200"
                >
                  Save
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingId(category.id)
                    setEditName(category.name)
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-400 hover:bg-cream-200 hover:text-ink-700"
                >
                  Rename
                </button>
              )}
              <button
                onClick={() => setDeleteTarget(category)}
                aria-label={`Delete ${category.name}`}
                className="rounded-lg p-1.5 text-ink-300 hover:bg-coral-200/50 hover:text-coral-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void addCategory()
        }}
        className="mt-4 flex items-center gap-2 border-t border-cream-200 pt-4"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category…"
          maxLength={40}
          aria-label="New category name"
          className="h-10 w-full rounded-xl border border-cream-300 bg-cream-50 px-3.5 text-sm focus:border-navy-500 focus:outline-none"
        />
        <div className="flex shrink-0 gap-1">
          {PASTEL_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Color ${color}`}
              aria-pressed={newColor === color}
              onClick={() => setNewColor(color)}
              className={cn(
                'h-6 w-6 rounded-full transition-transform',
                categoryColorDotClass[color],
                newColor === color ? 'scale-110 ring-2 ring-ink-400 ring-offset-1 ring-offset-cream-50' : 'opacity-60 hover:opacity-100'
              )}
            />
          ))}
        </div>
        <Button size="sm" type="submit" loading={adding} disabled={!newName.trim()}>
          Add
        </Button>
      </form>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete “${deleteTarget?.name ?? ''}”?`}
        message="Reminders in this category stay, but will no longer have a category."
        confirmLabel="Delete category"
        destructive
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}

// ── data & account ────────────────────────────────────────────────────────────

function DataSection({ email }: { email: string | null }) {
  const router = useRouter()
  const { toast } = useToast()
  const [signingOut, setSigningOut] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function signOut() {
    setSigningOut(true)
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
      router.replace('/login')
      router.refresh()
    } catch {
      toast({ message: 'Could not sign out — try again', tone: 'error' })
      setSigningOut(false)
    }
  }

  async function deleteAccount() {
    setDeleting(true)
    try {
      await api('/api/account/delete', { method: 'POST' })
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
      router.replace('/')
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not delete the account', tone: 'error', durationMs: 7000 })
      setDeleting(false)
    }
  }

  return (
    <section className="rounded-3xl border border-cream-300 bg-cream-50 p-5 shadow-card sm:p-6">
      <h2 className="text-[15px] font-semibold text-ink-900">Data &amp; account</h2>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink-900">Export your data</p>
            <p className="mt-0.5 text-sm text-ink-500">Download everything as JSON — it&apos;s yours.</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const anchor = document.createElement('a')
              anchor.href = '/api/export'
              anchor.rel = 'noopener'
              document.body.appendChild(anchor)
              anchor.click()
              anchor.remove()
            }}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-cream-200 pt-3">
          <div>
            <p className="text-sm font-medium text-ink-900">Sign out</p>
            <p className="mt-0.5 text-sm text-ink-500">Come back anytime — Nudge will keep remembering.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void signOut()} loading={signingOut}>
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-coral-200 pt-3">
          <div>
            <p className="text-sm font-medium text-coral-500">Delete account</p>
            <p className="mt-0.5 text-sm text-ink-500">Permanently removes your account and every memory.</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete
          </Button>
        </div>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-600">
            This permanently deletes your account{email ? ` (${email})` : ''} along with all reminders,
            lists, memories and notification settings. There is no undo.
          </p>
          <TextField
            label="Type DELETE to confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" disabled={confirmText !== 'DELETE'} loading={deleting} onClick={() => void deleteAccount()}>
              Delete everything
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
