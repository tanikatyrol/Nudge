import { redirect } from 'next/navigation'
import { AppChrome } from '@/components/layout/app-chrome'
import { SetupNotice } from '@/components/setup-notice'
import {
  createSupabaseServerClient,
  getProfile,
  isSupabaseServerConfigured,
} from '@/lib/supabase/server'
import { serializeCategory } from '@/lib/serialize'

// everything inside (app) is authenticated, per-request, never prerendered
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseServerConfigured()) {
    return <SetupNotice />
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const profile = await getProfile(supabase, user.id)
  if (!profile) {
    return <SetupNotice variant="profile" />
  }

  const { data: categoryRows } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  return (
    <AppChrome profile={profile} categories={(categoryRows ?? []).map(serializeCategory)}>
      {children}
    </AppChrome>
  )
}
