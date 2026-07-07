import { supabase } from '../lib/supabase'

export async function addSearchHistory(userId: string, query: string, type: 'all' | 'song' | 'album' | 'artist' = 'all') {
  try {
    const trimmed = query.trim()
    if (!trimmed) return null
    if (!supabase) return null

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
      console.error('Error tracking search history:', error)
      return null
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hearttune:recommendations-invalidate'))
    }

    return data
  } catch (err) {
    console.error('Error tracking search history:', err)
    return null
  }
}

export async function getRecentSearchHistory(userId: string, limit = 10) {
  try {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  } catch (err) {
    // Silently fail if table doesn't exist or other errors occur, 
    // to avoid console spam before migration is applied.
    return []
  }
}
