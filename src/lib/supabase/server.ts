import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/types'
import type { Profile } from '@/types'

export function isSupabaseServerConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Server-side Supabase client bound to the request's cookies.
 * Runs with the signed-in user's identity — every query is protected by RLS.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  // awaiting cookies() first marks the calling route as dynamic — important
  // so Next.js never attempts to prerender authenticated pages
  const cookieStore = await cookies()
  if (!isSupabaseServerConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see README).'
    )
  }
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component — safe to ignore when the
            // middleware is refreshing sessions.
          }
        },
      },
    }
  )
}

/** Authenticated user for the current request, or null. Never throws. */
export async function getAuthUser(): Promise<User | null> {
  try {
    if (!isSupabaseServerConfigured()) return null
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) return null
    return user ?? null
  } catch {
    return null
  }
}

function mapProfile(row: Database['public']['Tables']['profiles']['Row']): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    timezone: row.timezone,
    theme: row.theme,
    pushEnabled: row.push_enabled,
    briefingEnabled: row.briefing_enabled,
    briefingTime: row.briefing_time,
    onboarded: Boolean(row.onboarded_at),
  }
}

/** Fetch the signed-in user's profile, or null. Never throws. */
export async function getProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return null
    return mapProfile(data)
  } catch {
    return null
  }
}
