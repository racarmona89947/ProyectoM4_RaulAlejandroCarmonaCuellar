import type { ReactNode } from 'react'
import { Button } from '../ui/Button'

interface AppShellProps {
  children: ReactNode
  userEmail: string | null
  onLogout: () => Promise<void>
}

export function AppShell({ children, userEmail, onLogout }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <div className="app-brand__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p className="eyebrow">MateCode Startup</p>
            <h1>Gestor estrategico de tareas</h1>
          </div>
        </div>
        <div className="session-box">
          <div className="user-badge">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{userEmail ?? 'Usuario autenticado'}</span>
          </div>
          <Button onClick={onLogout} variant="secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Cerrar sesion</span>
          </Button>
        </div>
      </header>
      {children}
    </div>
  )
}
