import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthUser, getUser, signIn, signUp, signOut, signInWithGoogle } from '@/lib/auth'

interface AuthContextType {
  user:              AuthUser | null
  isLoading:         boolean
  login:             (email: string, password: string) => Promise<void>
  register:          (name: string, email: string, password: string) => Promise<void>
  loginWithGoogle:   () => Promise<void>
  logout:            () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]    = useState<AuthUser | null>(null)
  const [isLoading, setLoading] = useState(true)

  // Restore session on mount (synchronous from localStorage)
  useEffect(() => {
    setUser(getUser())
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const u = await signIn(email, password)
    setUser(u)
  }

  const register = async (name: string, email: string, password: string) => {
    const u = await signUp(name, email, password)
    setUser(u)
  }

  const loginWithGoogle = async () => {
    const u = await signInWithGoogle()
    setUser(u)
  }

  const logout = async () => {
    await signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
