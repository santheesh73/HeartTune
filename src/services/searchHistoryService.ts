import { supabase } from '../lib/supabase'

// Flag to prevent console spam if the table hasn't been created yet
let tableMissing = false;

export async function addSearchHistory(userId: string, query: string, type: 'all' | 'song' | 'album' | 'artist' = 'all') {
  try {
    if (tableMissing || !supabase) return null

    const trimmed = query.trim()
    if (!trimmed) return null

    // We don't want to block the UI, so we just fire and forget mostly, but handle it properly.
    const { data, error } = await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        query: trimmed,
        type,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01' || error.message?.includes('not found')) tableMissing = true;
      // Silently fail if table doesn't exist or other errors occur
      return null
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hearttune:recommendations-invalidate'))
    }

    return data
  } catch (err: any) {
    if (err?.message?.includes('not found') || err?.status === 404) tableMissing = true;
    // Silently fail if table doesn't exist or other errors occur
    return null
  }
}

export async function getRecentSearchHistory(userId: string, limit = 10) {
  try {
    if (tableMissing || !supabase) return []

    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (error.code === '42P01' || error.message?.includes('not found')) tableMissing = true;
      throw error
    }
    return data
  } catch (err: any) {
    if (err?.code === '42P01' || err?.message?.includes('not found') || err?.status === 404) tableMissing = true;
    // Silently fail if table doesn't exist or other errors occur, 
    // to avoid console spam before migration is applied.
    return []
  }
}
