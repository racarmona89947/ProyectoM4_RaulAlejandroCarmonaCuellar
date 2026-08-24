import { Navigate, Outlet } from 'react-router-dom'
import { LoadingView } from '../components/feedback/LoadingView'
import { useAuth } from '../features/auth/useAuth'

export function PublicOnlyRoute() {
  const { isChecking, user } = useAuth()

  if (isChecking) {
    return <LoadingView message="Verificando sesion..." />
  }

  if (user !== null) {
    return <Navigate replace to="/tasks" />
  }

  return <Outlet />
}
