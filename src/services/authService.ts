import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { assertNoSupabaseError, requireSupabase } from './serviceUtils'

export async function signUpUser(email: string, password: string, fullName: string) {
  const client = requireSupabase(supabase)
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  assertNoSupabaseError(error, 'Unable to create account')
  return data
}

export async function loginUser(email: string, password: string) {
  const client = requireSupabase(supabase)
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  assertNoSupabaseError(error, 'Unable to sign in')
  return data
}

export async function logoutUser() {
  const client = requireSupabase(supabase)
  const { error } = await client.auth.signOut()
  assertNoSupabaseError(error, 'Unable to sign out')
}

export async function getCurrentUser(): Promise<SupabaseUser | null> {
  const client = requireSupabase(supabase)
  const { data, error } = await client.auth.getUser()
  assertNoSupabaseError(error, 'Unable to get current user')
  return data.user
}
