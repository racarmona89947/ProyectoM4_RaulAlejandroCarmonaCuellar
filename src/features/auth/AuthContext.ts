import { createContext } from 'react'
import type { AppUser } from '../../types/auth'

export interface AuthContextValue {
  user: AppUser | null
  isChecking: boolean
  register: (email: string, password: string) => Promise<AppUser>
  login: (email: string, password: string) => Promise<AppUser>
  loginGoogle: () => Promise<AppUser>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)