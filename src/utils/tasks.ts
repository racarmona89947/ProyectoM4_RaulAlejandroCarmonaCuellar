import type { EmailTaskSummaryItem } from '../types/email'
import type { Task, TaskFilter, TaskSort, TaskStats } from '../types/task'

const PRIORITY_WEIGHT: Record<Task['priority'], number> = {
  high: 3,
  medium: 2,
  low: 1,
}

function toComparableDate(value: string | null): number {
  return value === null ? Number.POSITIVE_INFINITY : new Date(`${value}T00:00:00`).getTime()
}

export function isTaskOverdue(task: Task, now = new Date()): boolean {
  if (task.completed || task.dueDate === null) {
    return false
  }

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  return toComparableDate(task.dueDate) < today.getTime()
}

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  if (filter === 'completed') {
    return tasks.filter((task) => task.completed)
  }

  if (filter === 'pending') {
    return tasks.filter((task) => !task.completed)
  }

  return tasks
}

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const nextTasks = [...tasks]

  if (sort === 'priority') {
    return nextTasks.sort((current, next) => {
      const priorityDifference = PRIORITY_WEIGHT[next.priority] - PRIORITY_WEIGHT[current.priority]

      if (priorityDifference !== 0) {
        return priorityDifference
      }

      return toComparableDate(current.dueDate) - toComparableDate(next.dueDate)
    })
  }

  if (sort === 'dueDate') {
    return nextTasks.sort((current, next) => {
      const dateDifference = toComparableDate(current.dueDate) - toComparableDate(next.dueDate)

      if (dateDifference !== 0) {
        return dateDifference
      }

      return PRIORITY_WEIGHT[next.priority] - PRIORITY_WEIGHT[current.priority]
    })
  }

  return nextTasks.sort((current, next) => current.order - next.order)
}

export function getTaskStats(tasks: Task[], now = new Date()): TaskStats {
  const completed = tasks.filter((task) => task.completed).length

  return {
    total: tasks.length,
    completed,
    pending: tasks.length - completed,
    overdue: tasks.filter((task) => isTaskOverdue(task, now)).length,
  }
}

export function toEmailSummaryItems(tasks: Task[]): EmailTaskSummaryItem[] {
  return tasks.map((task) => ({
    title: task.title,
    description: task.description,
    completed: task.completed,
    priority: task.priority,
    dueDate: task.dueDate,
  }))
}
