import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

// Если переменные окружения не заданы, приложение не падает — просто
// социальные функции (друзья/вечеринки) остаются недоступны, а каталог
// рецептов и голос бариста работают полностью автономно.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_emoji: string | null
  created_at: string
}

export interface FriendshipRow {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export interface PartyRow {
  id: string
  host_id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  created_at: string
}

export interface PartyGuestRow {
  id: string
  party_id: string
  guest_id: string
  status: 'invited' | 'going' | 'maybe' | 'declined'
  created_at: string
}

export interface PartyMenuVoteRow {
  id: string
  party_id: string
  voter_id: string
  recipe_id: string
  created_at: string
}

export interface CustomRecipeRow {
  id: string
  owner_id: string
  name: string
  emoji: string
  category: string
  glass: string
  abv: string
  time: string
  ingredients: { name: string; amount: string }[]
  steps: string[]
  garnish: string | null
  tip: string | null
  is_public: boolean
  created_at: string
}

export interface PublicCustomRecipeRow extends CustomRecipeRow {
  owner: Pick<Profile, 'username' | 'display_name'> | null
}
