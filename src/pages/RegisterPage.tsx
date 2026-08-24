import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthForm } from '../features/auth/components/AuthForm'
import { useAuth } from '../features/auth/useAuth'
import type { AuthCredentials } from '../types/auth'

export function RegisterPage() {
  const { loginGoogle, register } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(credentials: AuthCredentials): Promise<void> {
    setError(null)
    setIsSubmitting(true)

    try {
      await register(credentials.email, credentials.password)
      navigate('/tasks', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear la cuenta.')
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
      setError(submitError instanceof Error ? submitError.message : 'No se pudo continuar con Google.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthForm
      error={error}
      footer={
        <p>
          Ya tienes cuenta? <Link to="/login">Iniciar sesion</Link>
        </p>
      }
      isSubmitting={isSubmitting}
      mode="register"
      onGoogleSubmit={handleGoogleSubmit}
      onSubmit={handleSubmit}
      submitLabel="Crear cuenta"
      title="Crea tu cuenta"
    />
  )
}
