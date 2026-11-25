import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ReminderForm } from '@/components/reminders/reminder-form'
import { createSupabaseServerClient, getProfile } from '@/lib/supabase/server'
import { serializeCategory } from '@/lib/serialize'
import type { Category } from '@/types'

export const metadata: Metadata = { title: 'New Reminder' }

export default async function NewReminderPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await getProfile(supabase, user.id)
  if (!profile) redirect('/login')

  const { data: categoryRows } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order')
  const categories: Category[] = (categoryRows ?? []).map(serializeCategory)

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <Link
          href="/today"
          className="inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Today
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
          New reminder
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Set the details exactly as you like — or use quick capture next time.
        </p>
      </div>
      <div className="rounded-3xl border border-cream-300 bg-cream-50 p-5 shadow-card sm:p-6">
        <ReminderForm timezone={profile.timezone} categories={categories} submitLabel="Create reminder" />
      </div>
    </div>
  )
}
