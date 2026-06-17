export function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function requireSupabase<T>(value: T | null, fallback?: string): T {
  if (value) return value

  throw new Error(
    fallback ||
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment file.'
  )
}

export function assertNoSupabaseError(
  error: { message?: string } | null,
  fallback = 'Supabase request failed'
) {
  if (error) {
    throw new Error(error.message || fallback)
  }
}
