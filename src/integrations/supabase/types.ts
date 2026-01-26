export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          role: 'admin' | 'partner' | 'user'
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'partner' | 'user'
        }
        Update: {
          display_name?: string | null
          avatar_url?: string | null
        }
      }
      markets: {
        Row: {
          id: string
          owner_id: string | null
          name: string
          description: string | null
          category: string
          amenities: string[] | null
          address: string | null
          latitude: number
          longitude: number
          cover_image: string | null
          rating: number
        }
        Insert: {
          owner_id?: string | null
          name: string
          description?: string | null
          category: string
          amenities?: string[] | null
          address?: string | null
          latitude: number
          longitude: number
          cover_image?: string | null
        }
      }
      menu_items: {
        Row: {
          id: string
          market_id: string
          name: string
          description: string | null
          price: number
          category: string | null
          image_url: string | null
        }
        Insert: {
          market_id: string
          name: string
          description?: string | null
          price: number
          category?: string | null
          image_url?: string | null
        }
      }
    }
  }
}