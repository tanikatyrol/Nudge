/** Only allow same-site relative redirect targets ("next" params). */
export function sanitizeRedirect(next: string | null | undefined, fallback = '/today'): string {
  if (!next) return fallback
  if (!next.startsWith('/')) return fallback
  if (next.startsWith('//') || next.includes('\\')) return fallback
  if (next.startsWith('/auth/')) return fallback
  return next
}

export const PROTECTED_PREFIXES = ['/today', '/reminders', '/lists', '/memories', '/search', '/settings', '/onboarding']

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function isAuthPage(pathname: string): boolean {
  return ['/login', '/signup', '/forgot-password'].some((p) => pathname === p)
}
