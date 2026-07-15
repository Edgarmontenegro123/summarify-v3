import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type {Session, User} from '@supabase/supabase-js'
import {supabase} from '@/lib/supabase'
import {translateAuthError} from '@/lib/authErrors'

interface AuthResult {
  error: string | null
  needsEmailConfirmation?: boolean
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error ? translateAuthError(error.message) : null }
  }

  const signUp = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: translateAuthError(error.message) }

    // Si el proyecto de Supabase requiere confirmar el correo, signUp no
    // devuelve sesion todavia: hay que avisarle al usuario en vez de
    // asumir que ya quedo logueado.
    const needsEmailConfirmation = !data.session
    return { error: null, needsEmailConfirmation }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
