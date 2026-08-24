import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  isLoading?: boolean
  loadingLabel?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

export function Button({
  children,
  className = '',
  disabled,
  isLoading = false,
  loadingLabel = 'Procesando...',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const classes = ['button', `button--${variant}`, className].filter(Boolean).join(' ')

  return (
    <button className={classes} disabled={disabled || isLoading} type={type} {...props}>
      {isLoading ? loadingLabel : children}
    </button>
  )
}
