import { ApiError, jsonOk, requireAuth, withRoute } from '@/lib/api'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * Permanently deletes the signed-in user's account.
 * Requires the service-role key; the database FKs cascade so every reminder,
 * list, event and subscription is removed with it.
 */
export const POST = withRoute(async () => {
  const { user } = await requireAuth()
  const admin = createSupabaseAdminClient()

  if (!admin) {
    throw new ApiError(
      500,
      'Account deletion is unavailable because SUPABASE_SERVICE_ROLE_KEY is not configured on the server.'
    )
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    throw new ApiError(500, 'Could not delete the account. Please try again or contact support.')
  }

  return jsonOk({ ok: true })
})
