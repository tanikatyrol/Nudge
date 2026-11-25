import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '@/types'
import { getProfile } from '@/lib/supabase/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data as unknown as Record<string, unknown>, { status })
}

export function jsonError(status: number, message: string, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, details }, { status })
}

/** True when the app's Supabase env vars are present. */
export function isBackendConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export interface AuthContext {
  supabase: SupabaseClient<Database>
  user: User
  profile: Profile
}

/**
 * Resolve the signed-in user + profile for a route handler.
 * Throws ApiError(401) when unauthenticated and ApiError(500) when the
 * backend is not configured.
 */
export async function requireAuth(): Promise<AuthContext> {
  if (!isBackendConfigured()) {
    throw new ApiError(500, 'Nudge backend is not configured. Set the Supabase environment variables (see README).')
  }
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    throw new ApiError(401, 'You need to sign in to do that.')
  }
  const profile = await getProfile(supabase, user.id)
  if (!profile) {
    throw new ApiError(500, 'Your profile is missing. Please contact support or re-create your account.')
  }
  return { supabase, user, profile }
}

/** Wrap a route handler with consistent error → JSON mapping. */
export function withRoute<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (err) {
      if (err instanceof ApiError) {
        return jsonError(err.status, err.message)
      }
      if (err instanceof z.ZodError) {
        const first = err.issues[0]
        const message = first ? `${first.path.join('.') || 'Input'}: ${first.message}` : 'Invalid input'
        return jsonError(400, message)
      }
      console.error('[api] unexpected error:', err)
      const message =
        process.env.NODE_ENV === 'production'
          ? 'Something went wrong on our side. Please try again.'
          : err instanceof Error
            ? err.message
            : 'Unexpected error'
      return jsonError(500, message)
    }
  }
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError(400, 'Expected a JSON request body.')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    throw new ApiError(400, first ? `${first.path.join('.') || 'Input'}: ${first.message}` : 'Invalid input')
  }
  return parsed.data
}
