import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ProtectedRoute } from '../../src/routes/ProtectedRoute'
import { PublicOnlyRoute } from '../../src/routes/PublicOnlyRoute'
import { AppRouter } from '../../src/routes/AppRouter'
import type { AppUser } from '../../src/types/auth'

interface MockAuthState {
  isChecking: boolean
  user: AppUser | null
}

const authState = vi.hoisted<{ current: MockAuthState }>(() => ({
  current: {
    isChecking: false,
    user: null,
  },
}))

vi.mock('../../src/features/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('../../src/features/auth/useAuth', () => ({
  useAuth: () => ({
    isChecking: authState.current.isChecking,
    user: authState.current.user,
    register: vi.fn(),
    login: vi.fn(),
    loginGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}))

describe('Route guards', () => {
  it('muestra loading mientras valida sesion', () => {
    authState.current = {
      isChecking: true,
      user: null,
    }

    render(
      <MemoryRouter initialEntries={['/tasks']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Private page</div>} path="/tasks" />
          </Route>
          <Route element={<div>Login page</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Verificando sesion...')).toBeInTheDocument()
  })

  it('redirige a login cuando no hay usuario en ruta protegida', () => {
    authState.current = {
      isChecking: false,
      user: null,
    }

    render(
      <MemoryRouter initialEntries={['/tasks']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Private page</div>} path="/tasks" />
          </Route>
          <Route element={<div>Login page</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('deja pasar al usuario autenticado en rutas protegidas', () => {
    authState.current = {
      isChecking: false,
      user: {
        uid: 'user-1',
        email: 'user@example.com',
        displayName: null,
      },
    }

    render(
      <MemoryRouter initialEntries={['/tasks']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Private page</div>} path="/tasks" />
          </Route>
          <Route element={<div>Login page</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Private page')).toBeInTheDocument()
  })

  it('en ruta publica redirige a /tasks cuando ya hay usuario', () => {
    authState.current = {
      isChecking: false,
      user: {
        uid: 'user-1',
        email: 'user@example.com',
        displayName: null,
      },
    }

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route element={<div>Login page</div>} path="/login" />
          </Route>
          <Route element={<div>Tasks page</div>} path="/tasks" />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Tasks page')).toBeInTheDocument()
  })

  it('resuelve /login/ y rutas inexistentes con el router SPA', () => {
    authState.current = {
      isChecking: false,
      user: null,
    }

    const loginRender = render(
      <MemoryRouter initialEntries={['/login/']}>
        <AppRouter />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Inicia sesion' })).toBeInTheDocument()

    loginRender.unmount()

    render(
      <MemoryRouter initialEntries={['/ruta-que-no-existe']}>
        <AppRouter />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Pagina no encontrada' })).toBeInTheDocument()
  })
})
