import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingView } from '../components/feedback/LoadingView'
import { useAuth } from '../features/auth/useAuth'

export function ProtectedRoute() {
  const { isChecking, user } = useAuth()
  const location = useLocation()

  if (isChecking) {
    return <LoadingView message="Verificando sesion..." />
  }

  if (user === null) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}
