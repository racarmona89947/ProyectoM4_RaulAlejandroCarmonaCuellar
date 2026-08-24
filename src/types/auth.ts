export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
}

export interface AuthCredentials {
  email: string
  password: string
}

export type AuthFieldErrors = Partial<Record<keyof AuthCredentials, string>>
