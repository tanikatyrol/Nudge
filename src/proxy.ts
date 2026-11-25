import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthPage, isProtectedPath, sanitizeRedirect } from '@/lib/auth-redirect'

/**
 * Session middleware (Next.js 16 "proxy").
 * - refreshes the Supabase auth session on every navigation
 * - protects authenticated routes
 * - redirects signed-in users away from auth pages
 * - routes brand-new accounts through onboarding
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    // Backend not configured — let pages render their setup notices.
    return response
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  if (!user) {
    if (isProtectedPath(pathname)) {
      const next = encodeURIComponent(pathname + search)
      const redirect = NextResponse.redirect(new URL(`/login?next=${next}`, request.url))
      // copy refreshed cookies onto the redirect
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
      return redirect
    }
    return response
  }

  // signed in → keep auth pages out of the way (except password reset)
  if (isAuthPage(pathname)) {
    const next = request.nextUrl.searchParams.get('next')
    return NextResponse.redirect(new URL(sanitizeRedirect(next), request.url))
  }

  // onboarding gate for protected app routes
  if (isProtectedPath(pathname) && pathname !== '/onboarding') {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded_at')
        .eq('id', user.id)
        .maybeSingle()
      if (profile && !profile.onboarded_at) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    } catch {
      // never block navigation on profile lookup failure
    }
  } else if (pathname === '/onboarding') {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded_at')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.onboarded_at) {
        return NextResponse.redirect(new URL('/today', request.url))
      }
    } catch {
      // ignore
    }
  }

  return response
}

export const config = {
  matcher: [
    // everything except static assets, the service worker, manifest and APIs
    '/((?!api|_next/static|_next/image|sw.js|offline.html|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?|ttf)$).*)',
  ],
}
