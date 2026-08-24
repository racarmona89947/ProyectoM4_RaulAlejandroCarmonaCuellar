import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthForm } from '../features/auth/components/AuthForm'
import { useAuth } from '../features/auth/useAuth'
import type { AuthCredentials } from '../types/auth'

function getRedirectPath(state: unknown): string {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof (state as { from?: unknown }).from === 'object' &&
    (state as { from?: unknown }).from !== null &&
    'pathname' in (state as { from: { pathname?: unknown } }).from &&
    typeof (state as { from: { pathname?: unknown } }).from.pathname === 'string'
  ) {
    return (state as { from: { pathname: string } }).from.pathname
  }

  return '/tasks'
}

export function LoginPage() {
  const { login, loginGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(credentials: AuthCredentials): Promise<void> {
    setError(null)
    setIsSubmitting(true)

    try {
      await login(credentials.email, credentials.password)
      navigate(getRedirectPath(location.state), { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo iniciar sesion.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSubmit(): Promise<void> {
    setError(null)
    setIsSubmitting(true)

    try {
      await loginGoogle()
      navigate('/tasks', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo iniciar con Google.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthForm
      error={error}
      footer={
        <p>
          No tienes cuenta? <Link to="/register">Crear cuenta</Link>
        </p>
      }
      isSubmitting={isSubmitting}
      mode="login"
      onGoogleSubmit={handleGoogleSubmit}
      onSubmit={handleSubmit}
      submitLabel="Iniciar sesion"
      title="Inicia sesion"
    />
  )
}
