import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { createSupabaseServerClient, getProfile } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Welcome' }

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await getProfile(supabase, user.id)
  if (!profile) redirect('/login')

  return <OnboardingWizard profile={profile} />
}
