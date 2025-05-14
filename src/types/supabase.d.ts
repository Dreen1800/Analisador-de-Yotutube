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
      api_keys: {
        Row: {
          id: string
          name: string
          key: string
          created_at: string
          user_id: string
          is_active: boolean
          usage_count: number
        }
        Insert: {
          id?: string
          name: string
          key: string
          created_at?: string
          user_id?: string
          is_active?: boolean
          usage_count?: number
        }
        Update: {
          id?: string
          name?: string
          key?: string
          created_at?: string
          user_id?: string
          is_active?: boolean
          usage_count?: number
        }
      }
      channels: {
        Row: {
          id: string
          channel_id: string
          title: string
          thumbnail_url: string
          subscriber_count: number
          video_count: number
          view_count: number
          created_at: string
          user_id: string
          is_main: boolean
        }
        Insert: {
          id?: string
          channel_id: string
          title: string
          thumbnail_url: string
          subscriber_count: number
          video_count: number
          view_count: number
          created_at?: string
          user_id?: string
          is_main: boolean
        }
        Update: {
          id?: string
          channel_id?: string
          title?: string
          thumbnail_url?: string
          subscriber_count?: number
          video_count?: number
          view_count?: number
          created_at?: string
          user_id?: string
          is_main: boolean
        }
      }
      channel_analyses: {
        Row: {
          id: string
          channel_id: string
          videos: Json
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          channel_id: string
          videos: Json
          created_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          channel_id?: string
          videos?: Json
          created_at?: string
          user_id?: string
        }
      }
      competitors: {
        Row: {
          id: string
          channel_id: string
          title: string
          parent_channel_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          title: string
          parent_channel_id: string
          user_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          title?: string
          parent_channel_id?: string
          user_id?: string
          created_at?: string
        }
      }
      ai_analyses: {
        Row: {
          id: string
          channel_id: string
          analysis: Json
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          analysis: Json
          user_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          analysis?: Json
          user_id?: string
          created_at?: string
        }
      }
    }
  }
}