import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ReminderForm } from '@/components/reminders/reminder-form'
import { createSupabaseServerClient, getProfile } from '@/lib/supabase/server'
import { serializeCategory, serializeReminder } from '@/lib/serialize'

export const metadata: Metadata = { title: 'Edit Reminder' }

export default async function EditReminderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await getProfile(supabase, user.id)
  if (!profile) redirect('/login')

  const [{ data: row }, { data: categoryRows }] = await Promise.all([
    supabase.from('reminders').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('categories').select('*').eq('user_id', user.id).order('sort_order'),
  ])

  if (!row) notFound()

  const reminder = serializeReminder(row)
  const categories = (categoryRows ?? []).map(serializeCategory)

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <Link
          href="/reminders"
          className="inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All reminders
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
          Edit reminder
        </h1>
      </div>
      <div className="rounded-3xl border border-cream-300 bg-cream-50 p-5 shadow-card sm:p-6">
        <ReminderForm
          timezone={profile.timezone}
          categories={categories}
          initial={{
            id: reminder.id,
            title: reminder.title,
            dueAtIso: reminder.dueAt,
            isAllDay: reminder.isAllDay,
            hasTime: !reminder.isAllDay,
            recurrence: reminder.recurrence,
            categoryId: reminder.categoryId,
            notes: reminder.notes ?? '',
          }}
          submitLabel="Save changes"
          onDeleted={undefined}
        />
      </div>
    </div>
  )
}
