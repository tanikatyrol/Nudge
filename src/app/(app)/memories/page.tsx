import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MemoriesView } from '@/components/memories/memories-view'
import { createSupabaseServerClient, getProfile } from '@/lib/supabase/server'
import { serializeEvent } from '@/lib/serialize'
import type { SerializedEvent } from '@/types'

export const metadata: Metadata = { title: 'Memories' }

export default async function MemoriesPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await getProfile(supabase, user.id)
  if (!profile) redirect('/login')

  const { data: eventRows } = await supabase
    .from('reminder_events')
    .select('*')
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .limit(300)

  const events: SerializedEvent[] = (eventRows ?? []).map(serializeEvent)

  return <MemoriesView events={events} timezone={profile.timezone} />
}
