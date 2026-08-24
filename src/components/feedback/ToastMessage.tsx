interface ToastMessageProps {
  children: string
  tone?: 'error' | 'success' | 'info'
  onClose: () => void
}

export function ToastMessage({ children, tone = 'info', onClose }: ToastMessageProps) {
  const role = tone === 'error' ? 'alert' : 'status'

  return (
    <div className={`toast-message toast-message--${tone}`} role={role} aria-live="polite">
      <p>{children}</p>
      <button
        aria-label="Cerrar notificacion"
        className="toast-message__close"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
    </div>
  )
}
