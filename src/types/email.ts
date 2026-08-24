import type { TaskPriority } from './task'

export interface EmailTaskSummaryItem {
  title: string
  description: string
  completed: boolean
  priority: TaskPriority
  dueDate: string | null
}

export interface SendTaskSummaryPayload {
  recipientEmail: string
  tasks: EmailTaskSummaryItem[]
}

export interface ApiSuccessResponse {
  ok: true
  message: string
}

export interface ApiErrorResponse {
  ok: false
  error: string
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse
