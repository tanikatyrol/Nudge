import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sanitizeRedirect } from '@/lib/auth-redirect'

/**
 * OAuth / email-confirmation / password-recovery callback.
 * Exchanges the PKCE code for a session, then redirects on.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeRedirect(searchParams.get('next'), '/today')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    const message = encodeURIComponent(errorDescription ?? error)
    return NextResponse.redirect(`${origin}/login?error=${message}`)
  }

  if (code) {
    try {
      const supabase = await createSupabaseServerClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (!exchangeError) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      const message = encodeURIComponent('That sign-in link has expired. Please try again.')
      return NextResponse.redirect(`${origin}/login?error=${message}`)
    } catch {
      const message = encodeURIComponent('Sign-in failed. Please try again.')
      return NextResponse.redirect(`${origin}/login?error=${message}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
