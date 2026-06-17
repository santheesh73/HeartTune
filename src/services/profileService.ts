import type { Profile } from '../types'
import type { ProfileInsert, ProfileUpdate } from '../types/database'
import { supabase } from '../lib/supabase'
import { assertNoSupabaseError, requireSupabase } from './serviceUtils'

interface ProfileInput {
  username?: string | null
  full_name?: string | null
  avatar_url?: string | null
}

export async function createUserProfile(userId: string, profile: ProfileInput) {
  const client = requireSupabase(supabase)
  const payload: ProfileInsert = {
    id: userId,
    username: profile.username || null,
    full_name: profile.full_name || null,
    avatar_url: profile.avatar_url || null,
  }

  const { data, error } = await client
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single()

  assertNoSupabaseError(error, 'Unable to create profile')
  return data as Profile
}

export async function getProfile(userId: string) {
  const client = requireSupabase(supabase)
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  assertNoSupabaseError(error, 'Unable to load profile')
  return data as Profile | null
}

export async function updateProfile(userId: string, updates: ProfileInput) {
  const client = requireSupabase(supabase)
  const payload: ProfileUpdate = {
    username: updates.username,
    full_name: updates.full_name,
    avatar_url: updates.avatar_url,
  }

  const { data, error } = await client
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single()

  assertNoSupabaseError(error, 'Unable to update profile')
  return data as Profile
}

export const getUserProfile = getProfile
