import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { AppUser } from '../../src/types/auth'
import { AuthProvider } from '../../src/features/auth/AuthProvider'
import { useAuth } from '../../src/features/auth/useAuth'

const authServiceMocks = vi.hoisted(() => ({
  loginWithEmail: vi.fn(),
  loginWithGoogle: vi.fn(),
  logoutUser: vi.fn(),
  registerWithEmail: vi.fn(),
  subscribeToAuthChanges: vi.fn(),
}))

vi.mock('../../src/services/authService', () => authServiceMocks)

function AuthProbe() {
  const { isChecking, login, loginGoogle, logout, register, user } = useAuth()

  return (
    <section>
      <p data-testid="is-checking">{String(isChecking)}</p>
      <p data-testid="user-email">{user?.email ?? 'sin-sesion'}</p>
      <button
        onClick={async () => {
          await register('  user@example.com  ', '123456')
        }}
        type="button"
      >
        register
      </button>
      <button
        onClick={async () => {
          await login('  user@example.com  ', '123456')
        }}
        type="button"
      >
        login
      </button>
      <button
        onClick={async () => {
          await loginGoogle()
        }}
        type="button"
      >
        login-google
      </button>
      <button
        onClick={async () => {
          await logout()
        }}
        type="button"
      >
        logout
      </button>
    </section>
  )
}

function renderAuthProvider() {
  render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    authServiceMocks.registerWithEmail.mockResolvedValue({
      uid: 'user-1',
      email: 'user@example.com',
      displayName: null,
    } satisfies AppUser)

    authServiceMocks.loginWithEmail.mockResolvedValue({
      uid: 'user-1',
      email: 'user@example.com',
      displayName: null,
    } satisfies AppUser)

    authServiceMocks.loginWithGoogle.mockResolvedValue({
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
    } satisfies AppUser)

    authServiceMocks.logoutUser.mockResolvedValue(undefined)

    authServiceMocks.subscribeToAuthChanges.mockImplementation((observer: (user: AppUser | null) => void) => {
      observer(null)
      return vi.fn()
    })
  })

  it('resuelve inicializacion de sesion con onAuthStateChanged', async () => {
    renderAuthProvider()

    await waitFor(() => {
      expect(screen.getByTestId('is-checking').textContent).toBe('false')
    })
    expect(screen.getByTestId('user-email').textContent).toBe('sin-sesion')
  })

  it('muestra usuario cuando llega sesion autenticada', async () => {
    authServiceMocks.subscribeToAuthChanges.mockImplementationOnce((observer: (user: AppUser | null) => void) => {
      observer({
        uid: 'user-2',
        email: 'auth@example.com',
        displayName: null,
      })
      return vi.fn()
    })

    renderAuthProvider()

    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe('auth@example.com')
    })
  })

  it('normaliza email y ejecuta acciones de auth', async () => {
    const user = userEvent.setup()
    renderAuthProvider()

    await user.click(screen.getByRole('button', { name: 'register' }))
    await user.click(screen.getByRole('button', { name: 'login' }))
    await user.click(screen.getByRole('button', { name: 'login-google' }))
    await user.click(screen.getByRole('button', { name: 'logout' }))

    expect(authServiceMocks.registerWithEmail).toHaveBeenCalledWith('user@example.com', '123456')
    expect(authServiceMocks.loginWithEmail).toHaveBeenCalledWith('user@example.com', '123456')
    expect(authServiceMocks.loginWithGoogle).toHaveBeenCalledTimes(1)
    expect(authServiceMocks.logoutUser).toHaveBeenCalledTimes(1)
  })
})
