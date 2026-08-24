import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RegisterPage } from '../pages/RegisterPage'
import { TasksPage } from '../pages/TasksPage'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<Navigate replace to="/tasks" />} path="/" />
      <Route element={<PublicOnlyRoute />}>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<RegisterPage />} path="/register" />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<TasksPage />} path="/tasks" />
      </Route>
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  )
}
