import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { getProfile } from '../services/auth'

export function useAuth() {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile()
    })

    // Cambios de sesión (login, logout, refresco de token)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadProfile()
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile() {
    try {
      const p = await getProfile()
      setProfile(p)
    } catch {
      setProfile(null)
    }
  }

  return {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.prof_role ?? null,       // 'user' | 'admin' | null
    isAdmin: profile?.prof_role === 'admin',
    isActive: profile?.prof_is_active ?? true,
    loading: session === undefined,
    reloadProfile: loadProfile,
  }
}
