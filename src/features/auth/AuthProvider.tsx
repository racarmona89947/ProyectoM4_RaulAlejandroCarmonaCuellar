import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  registerWithEmail,
  subscribeToAuthChanges,
} from '../../services/authService'
import type { AppUser } from '../../types/auth'
import { mapAuthError } from '../../utils/authErrors'
import { AuthContext } from './AuthContext'
import type { AuthContextValue } from './AuthContext'

interface AuthProviderProps {
  children: ReactNode
}

async function executeAuthAction<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (error) {
    throw new Error(mapAuthError(error))
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      setUser(nextUser)
      setIsChecking(false)
    })

    return unsubscribe
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isChecking,
      register: (email, password) =>
        executeAuthAction(() => registerWithEmail(email.trim(), password)),
      login: (email, password) => executeAuthAction(() => loginWithEmail(email.trim(), password)),
      loginGoogle: () => executeAuthAction(loginWithGoogle),
      logout: () => executeAuthAction(logoutUser),
    }),
    [isChecking, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
