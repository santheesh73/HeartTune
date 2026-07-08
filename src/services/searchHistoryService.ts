import { supabase } from '../lib/supabase'

export async function addSearchHistory(userId: string, query: string, type: 'all' | 'song' | 'album' | 'artist' = 'all') {
  try {
    if (!supabase) return null

    const trimmed = query.trim()
    if (!trimmed) return null

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
      console.warn('Supabase Error (addSearchHistory)', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return null
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hearttune:recommendations-invalidate'))
    }

    return data
  } catch (err: any) {
    console.warn('Supabase Error (addSearchHistory catch)', {
      code: err?.code,
      message: err?.message,
      details: err?.details,
      hint: err?.hint
    })
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

    if (error) {
      console.warn('Supabase Error (getRecentSearchHistory)', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      throw error
    }
    return data
  } catch (err: any) {
    console.warn('Supabase Error (getRecentSearchHistory catch)', {
      code: err?.code,
      message: err?.message,
      details: err?.details,
      hint: err?.hint
    })
    return []
  }
}
