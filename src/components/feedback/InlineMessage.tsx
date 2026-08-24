interface InlineMessageProps {
  children: string
  tone?: 'error' | 'success' | 'info'
}

export function InlineMessage({ children, tone = 'info' }: InlineMessageProps) {
  const role = tone === 'error' ? 'alert' : 'status'

  return (
    <p className={`inline-message inline-message--${tone}`} role={role} aria-live="polite">
      {children}
    </p>
  )
}
