interface LoadingViewProps {
  message?: string
}

export function LoadingView({ message = 'Cargando...' }: LoadingViewProps) {
  return (
    <div className="loading-view" role="status" aria-live="polite">
      <span className="loading-view__dot" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
