import { useCallback, useEffect, useState } from 'react'
import {
  createTaskForUser,
  deleteTaskForUser,
  reorderTasksForUser,
  subscribeToUserTasks,
  toggleTaskForUser,
  updateTaskForUser,
} from '../services/taskService'
import type { AsyncStatus } from '../types/status'
import type { Task, TaskDraft } from '../types/task'

interface UseTasksResult {
  tasks: Task[]
  isLoading: boolean
  error: string | null
  actionStatus: AsyncStatus
  pendingTarget: 'create' | string | null
  createTask: (draft: TaskDraft) => Promise<void>
  updateTask: (taskId: string, draft: TaskDraft) => Promise<void>
  toggleTask: (taskId: string, completed: boolean) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  reorderTasks: (orderedTaskIds: string[]) => Promise<void>
  clearError: () => void
}

function getActionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operacion.'
}

export function useTasks(userId: string | null): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [error, setError] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<AsyncStatus>('idle')
  const [pendingTarget, setPendingTarget] = useState<'create' | string | null>(null)

  useEffect(() => {
    if (userId === null) {
      return undefined
    }

    const unsubscribe = subscribeToUserTasks(
      userId,
      (nextTasks) => {
        setTasks(nextTasks)
        setIsLoading(false)
      },
      (nextError) => {
        setError(nextError.message)
        setIsLoading(false)
      },
    )

    return unsubscribe
  }, [userId])

  const runMutation = useCallback(
    async (target: 'create' | string, operation: (ownerId: string) => Promise<void>) => {
      if (userId === null) {
        throw new Error('Necesitas iniciar sesion para gestionar tareas.')
      }

      setActionStatus('loading')
      setPendingTarget(target)
      setError(null)

      try {
        await operation(userId)
        setActionStatus('success')
      } catch (operationError: unknown) {
        const message = getActionErrorMessage(operationError)
        setActionStatus('error')
        setError(message)
        throw operationError
      } finally {
        setPendingTarget(null)
      }
    },
    [userId],
  )

  const createTask = useCallback(
    async (draft: TaskDraft) => {
      let createdTask: Task | undefined

      await runMutation('create', async (ownerId) => {
        createdTask = await createTaskForUser(ownerId, draft)
      })

      if (createdTask !== undefined) {
        setTasks((currentTasks) =>
          currentTasks.some((task) => task.id === createdTask?.id)
            ? currentTasks
            : [...currentTasks, createdTask!],
        )
      }
    },
    [runMutation],
  )

  const updateTask = useCallback(
    async (taskId: string, draft: TaskDraft) => {
      const previousTasks = tasks
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                title: draft.title.trim(),
                description: draft.description.trim(),
                priority: draft.priority,
                dueDate: draft.dueDate,
              }
            : task,
        ),
      )

      try {
        await runMutation(taskId, (ownerId) => updateTaskForUser(ownerId, taskId, draft))
      } catch (error) {
        setTasks(previousTasks)
        throw error
      }
    },
    [runMutation, tasks],
  )

  const toggleTask = useCallback(
    async (taskId: string, completed: boolean) => {
      const previousTasks = tasks
      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === taskId ? { ...task, completed } : task)),
      )

      try {
        await runMutation(taskId, (ownerId) => toggleTaskForUser(ownerId, taskId, completed))
      } catch (error) {
        setTasks(previousTasks)
        throw error
      }
    },
    [runMutation, tasks],
  )

  const deleteTask = useCallback(
    async (taskId: string) => {
      const previousTasks = tasks
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId))

      try {
        await runMutation(taskId, (ownerId) => deleteTaskForUser(ownerId, taskId))
      } catch (error) {
        setTasks(previousTasks)
        throw error
      }
    },
    [runMutation, tasks],
  )

  const reorderTasks = useCallback(
    (orderedTaskIds: string[]) =>
      runMutation('reorder', (ownerId) => reorderTasksForUser(ownerId, orderedTaskIds)),
    [runMutation],
  )

  return {
    tasks: userId === null ? [] : tasks,
    isLoading: userId === null ? false : isLoading,
    error,
    actionStatus,
    pendingTarget,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    reorderTasks,
    clearError: () => setError(null),
  }
}
