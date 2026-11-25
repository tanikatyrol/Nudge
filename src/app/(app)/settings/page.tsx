import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SettingsView } from '@/components/settings/settings-view'
import { createSupabaseServerClient, getProfile } from '@/lib/supabase/server'
import { serializeCategory } from '@/lib/serialize'
import type { Category } from '@/types'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
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

  return <SettingsView profile={profile} categories={categories} />
}
