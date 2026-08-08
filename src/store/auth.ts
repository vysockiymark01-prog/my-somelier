import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured, type Profile } from '../lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  signInWithEmail: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  ensureProfile: (username: string, displayName: string) => Promise<{ error: string | null }>
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  init: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ initialized: true })
      return
    }
    const { data } = await supabase.auth.getSession()
    set({ session: data.session, user: data.session?.user ?? null })
    if (data.session?.user) {
      await get().refreshProfile()
    }
    set({ initialized: true })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session?.user) {
        get().refreshProfile()
      } else {
        set({ profile: null })
      }
    })
  },

  signInWithEmail: async (email: string) => {
    if (!supabase) return { error: 'Бэкенд не подключён' }
    set({ loading: true })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    set({ loading: false })
    return { error: error?.message ?? null }
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
  },

  refreshProfile: async () => {
    if (!supabase) return
    const user = get().user
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    set({ profile: (data as Profile) ?? null })
  },

  ensureProfile: async (username: string, displayName: string) => {
    if (!supabase) return { error: 'Бэкенд не подключён' }
    const user = get().user
    if (!user) return { error: 'Нужно войти в аккаунт' }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username: username.trim().toLowerCase(),
      display_name: displayName.trim() || username.trim(),
    })
    if (error) return { error: error.message }
    await get().refreshProfile()
    return { error: null }
  },
}))
