import { TASK_PRIORITIES } from '../types/task'
import type { AuthCredentials, AuthFieldErrors } from '../types/auth'
import type { TaskDraft, TaskFieldErrors, TaskPriority } from '../types/task'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function getTodayDateInputValue(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && TASK_PRIORITIES.includes(value as TaskPriority)
}

export function normalizeOptionalDate(value: string | null): string | null {
  const trimmedValue = value?.trim() ?? ''
  return trimmedValue.length > 0 ? trimmedValue : null
}

export function validateAuthCredentials(credentials: AuthCredentials): AuthFieldErrors {
  const errors: AuthFieldErrors = {}

  if (!isValidEmail(credentials.email)) {
    errors.email = 'Ingresa un correo valido.'
  }

  if (credentials.password.trim().length < 6) {
    errors.password = 'La contrasena debe tener al menos 6 caracteres.'
  }

  return errors
}

export function validateTaskDraft(draft: TaskDraft): TaskFieldErrors {
  const errors: TaskFieldErrors = {}
  const title = draft.title.trim()
  const description = draft.description.trim()
  const dueDate = normalizeOptionalDate(draft.dueDate)

  if (title.length === 0) {
    errors.title = 'El titulo es obligatorio.'
  }

  if (title.length > 120) {
    errors.title = 'El titulo no puede superar 120 caracteres.'
  }

  if (description.length > 500) {
    errors.description = 'La descripcion no puede superar 500 caracteres.'
  }

  if (!isTaskPriority(draft.priority)) {
    errors.priority = 'Selecciona una prioridad valida.'
  }

  if (dueDate !== null) {
    if (!DATE_INPUT_PATTERN.test(dueDate)) {
      errors.dueDate = 'La fecha debe usar el formato YYYY-MM-DD.'
    } else if (dueDate < getTodayDateInputValue()) {
      errors.dueDate = 'La fecha de vencimiento no puede ser anterior a hoy.'
    }
  }

  return errors
}

export function hasValidationErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((error) => typeof error === 'string' && error.length > 0)
}
