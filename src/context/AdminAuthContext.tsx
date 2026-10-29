import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { adminApi, AdminUserSession } from '@/lib/adminApi'

interface AdminAuthContextType {
  admin: AdminUserSession | null
  isLoading: boolean
  isDefaultPassword: boolean
  login: (id: string, pass: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  setIsDefaultPassword: (val: boolean) => void
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDefaultPassword, setIsDefaultPassword] = useState(false)

  const refreshMe = useCallback(async () => {
    try {
      const data = await adminApi.getMe()
      if (data?.user && data.user.role === 'admin') {
        setAdmin(data.user)
        setIsDefaultPassword(Boolean(data.isDefaultPassword))
      } else {
        setAdmin(null)
      }
    } catch {
      setAdmin(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshMe()
  }, [refreshMe])

  const login = async (id: string, pass: string) => {
    const data = await adminApi.login(id, pass)
    setAdmin(data.user)
    setIsDefaultPassword(Boolean(data.isDefaultPassword))
  }

  const logout = async () => {
    try {
      await adminApi.logout()
    } finally {
      setAdmin(null)
      setIsDefaultPassword(false)
    }
  }

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isLoading,
        isDefaultPassword,
        login,
        logout,
        refreshMe,
        setIsDefaultPassword,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}

