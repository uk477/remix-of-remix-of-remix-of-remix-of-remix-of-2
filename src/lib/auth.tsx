import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

type AuthContextType = {
  user: User | null
  loading: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false

    // Keep the user object reference stable while the identity is unchanged.
    // Supabase fires TOKEN_REFRESHED / SIGNED_IN whenever the tab regains
    // focus; replacing the object there would cascade re-mounts through every
    // consumer and wipe in-progress screens (checkout, top-up, forms).
    const applyUser = (next: User | null) =>
      setUser((prev) => (prev && next && prev.id === next.id ? prev : next))

    async function ensureSession() {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session?.user) {
        applyUser(data.session.user)
        return data.session.user
      }
      // No session — silently sign in anonymously (no UI).
      const { data: anon, error } = await supabase.auth.signInAnonymously()
      if (error) {
        console.error('[auth] anonymous sign-in failed', error)
        setLoading(false)
        return null
      }
      if (!cancelled) applyUser(anon.user ?? null)
      return anon.user ?? null
    }

    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null)
    })

    ensureSession().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
      sub.data.subscription.unsubscribe()
    }
  }, [])


  // Check admin role whenever user changes.
  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      return
    }
    let cancelled = false
    async function check() {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle()
      if (cancelled) return
      if (data) {
        setIsAdmin(true)
        return
      }
      // TODO(admin-bootstrap): временная выдача админки первому вошедшему,
      // пока в проекте нет ни одного админа. Убрать когда назначим реального.
      const { data: bootstrapped } = await supabase.rpc('bootstrap_admin_if_none')
      if (!cancelled && bootstrapped) setIsAdmin(true)
    }
    check()
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
