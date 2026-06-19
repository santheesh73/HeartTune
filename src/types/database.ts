export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      liked_songs: {
        Row: {
          id: string
          user_id: string
          song_id: string
          song_title: string
          artist_name: string
          album_name: string | null
          image_url: string | null
          audio_url: string | null
          duration: string | null
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          song_id: string
          song_title: string
          artist_name: string
          album_name?: string | null
          image_url?: string | null
          audio_url?: string | null
          duration?: string | null
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          song_id?: string
          song_title?: string
          artist_name?: string
          album_name?: string | null
          image_url?: string | null
          audio_url?: string | null
          duration?: string | null
          source?: string
          created_at?: string
        }
        Relationships: []
      }
      user_playlists: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          cover_image: string | null
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          cover_image?: string | null
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          cover_image?: string | null
          is_public?: boolean
          created_at?: string
        }
        Relationships: []
      }
      playlist_songs: {
        Row: {
          id: string
          playlist_id: string
          user_id: string
          song_id: string
          song_title: string
          artist_name: string
          album_name: string | null
          image_url: string | null
          audio_url: string | null
          duration: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          playlist_id: string
          user_id: string
          song_id: string
          song_title: string
          artist_name: string
          album_name?: string | null
          image_url?: string | null
          audio_url?: string | null
          duration?: string | null
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          playlist_id?: string
          user_id?: string
          song_id?: string
          song_title?: string
          artist_name?: string
          album_name?: string | null
          image_url?: string | null
          audio_url?: string | null
          duration?: string | null
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      recently_played: {
        Row: {
          id: string
          user_id: string
          song_id: string
          song_title: string
          artist_name: string
          album_name: string | null
          image_url: string | null
          audio_url: string | null
          duration: string | null
          played_at: string
        }
        Insert: {
          id?: string
          user_id: string
          song_id: string
          song_title: string
          artist_name: string
          album_name?: string | null
          image_url?: string | null
          audio_url?: string | null
          duration?: string | null
          played_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          song_id?: string
          song_title?: string
          artist_name?: string
          album_name?: string | null
          image_url?: string | null
          audio_url?: string | null
          duration?: string | null
          played_at?: string
        }
        Relationships: []
      }
      downloads: {
        Row: {
          id: string
          user_id: string
          song_id: string
          song_title: string
          artist_name: string
          album_name: string | null
          image_url: string | null
          audio_url: string | null
          downloaded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          song_id: string
          song_title: string
          artist_name: string
          album_name?: string | null
          image_url?: string | null
          audio_url?: string | null
          downloaded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          song_id?: string
          song_title?: string
          artist_name?: string
          album_name?: string | null
          image_url?: string | null
          audio_url?: string | null
          downloaded_at?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          metadata: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type LikedSongRow = Database['public']['Tables']['liked_songs']['Row']
export type PlaylistRow = Database['public']['Tables']['user_playlists']['Row']
export type PlaylistUpdate = Database['public']['Tables']['user_playlists']['Update']
export type PlaylistSongRow = Database['public']['Tables']['playlist_songs']['Row']
export type RecentlyPlayedRow = Database['public']['Tables']['recently_played']['Row']
export type DownloadRow = Database['public']['Tables']['downloads']['Row']
export type SecurityLogRow = Database['public']['Tables']['security_logs']['Row']
