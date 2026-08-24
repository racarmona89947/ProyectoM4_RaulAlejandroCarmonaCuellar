export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_FILTERS = ['all', 'pending', 'completed'] as const
export type TaskFilter = (typeof TASK_FILTERS)[number]

export const TASK_SORTS = ['manual', 'priority', 'dueDate'] as const
export type TaskSort = (typeof TASK_SORTS)[number]

export interface Task {
  id: string
  userId: string
  title: string
  description: string
  completed: boolean
  priority: TaskPriority
  dueDate: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface TaskDraft {
  title: string
  description: string
  priority: TaskPriority
  dueDate: string | null
}

export type TaskFieldErrors = Partial<Record<keyof TaskDraft, string>>

export interface TaskStats {
  total: number
  completed: number
  pending: number
  overdue: number
}
