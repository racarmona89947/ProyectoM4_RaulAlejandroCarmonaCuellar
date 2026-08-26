import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTasks } from '../../src/hooks/useTasks'
import type { Task, TaskDraft } from '../../src/types/task'

const taskServiceMocks = vi.hoisted(() => ({
  createTaskForUser: vi.fn(),
  deleteTaskForUser: vi.fn(),
  reorderTasksForUser: vi.fn(),
  subscribeToUserTasks: vi.fn(),
  toggleTaskForUser: vi.fn(),
  updateTaskForUser: vi.fn(),
}))

vi.mock('../../src/services/taskService', () => taskServiceMocks)

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const baseTask: Task = {
  id: 'task-1',
  userId: 'user-1',
  title: 'Tarea base',
  description: 'Descripcion base',
  completed: false,
  priority: 'medium',
  dueDate: null,
  order: 1,
  createdAt: '2026-08-20T12:00:00.000Z',
  updatedAt: '2026-08-20T12:00:00.000Z',
}

const validDraft: TaskDraft = {
  title: 'Nueva tarea',
  description: 'Descripcion',
  priority: 'high',
  dueDate: null,
}

describe('useTasks', () => {
  let onNext: ((tasks: Task[]) => void) | null = null
  let onError: ((error: Error) => void) | null = null
  let unsubscribeSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    onNext = null
    onError = null
    unsubscribeSpy = vi.fn()

    taskServiceMocks.subscribeToUserTasks.mockImplementation(
      (_userId: string, next: (tasks: Task[]) => void, error: (error: Error) => void) => {
        onNext = next
        onError = error
        return unsubscribeSpy
      },
    )

    taskServiceMocks.createTaskForUser.mockResolvedValue(undefined)
    taskServiceMocks.updateTaskForUser.mockResolvedValue(undefined)
    taskServiceMocks.toggleTaskForUser.mockResolvedValue(undefined)
    taskServiceMocks.deleteTaskForUser.mockResolvedValue(undefined)
    taskServiceMocks.reorderTasksForUser.mockResolvedValue(undefined)
  })

  it('se suscribe por usuario y limpia listener al desmontar', () => {
    const { result, unmount } = renderHook(() => useTasks('user-1'))

    expect(taskServiceMocks.subscribeToUserTasks).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    )

    act(() => {
      onNext?.([baseTask])
    })

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.isLoading).toBe(false)

    unmount()
    expect(unsubscribeSpy).toHaveBeenCalledTimes(1)
  })

  it('mantiene loading hasta resolver mutacion y luego marca success', async () => {
    const deferred = createDeferredPromise<void>()
    taskServiceMocks.createTaskForUser.mockReturnValueOnce(deferred.promise)

    const { result } = renderHook(() => useTasks('user-1'))

    act(() => {
      onNext?.([])
    })

    let mutationPromise: Promise<void>

    act(() => {
      mutationPromise = result.current.createTask(validDraft)
    })

    await waitFor(() => {
      expect(result.current.actionStatus).toBe('loading')
      expect(result.current.pendingTarget).toBe('create')
    })

    await act(async () => {
      deferred.resolve(undefined)
      await mutationPromise!
    })

    await waitFor(() => {
      expect(result.current.actionStatus).toBe('success')
      expect(result.current.pendingTarget).toBeNull()
    })
  })

  it('agrega la tarea creada a la lista sin esperar una recarga', async () => {
    taskServiceMocks.createTaskForUser.mockResolvedValueOnce({
      ...baseTask,
      id: 'task-2',
      title: validDraft.title,
      description: validDraft.description,
      priority: validDraft.priority,
      dueDate: validDraft.dueDate,
      order: 2,
    })

    const { result } = renderHook(() => useTasks('user-1'))

    act(() => {
      onNext?.([])
    })

    await act(async () => {
      await result.current.createTask(validDraft)
    })

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0]?.title).toBe('Nueva tarea')
  })

  it('expone error de mutacion y conserva mensaje de fallo', async () => {
    taskServiceMocks.createTaskForUser.mockRejectedValueOnce(new Error('fallo al crear'))

    const { result } = renderHook(() => useTasks('user-1'))

    act(() => {
      onNext?.([])
    })

    await act(async () => {
      await expect(result.current.createTask(validDraft)).rejects.toThrow('fallo al crear')
    })

    await waitFor(() => {
      expect(result.current.actionStatus).toBe('error')
      expect(result.current.error).toBe('fallo al crear')
    })
  })

  it('revierte cambio optimista cuando update falla', async () => {
    taskServiceMocks.updateTaskForUser.mockRejectedValueOnce(new Error('update rechazado'))

    const { result } = renderHook(() => useTasks('user-1'))

    act(() => {
      onNext?.([baseTask])
    })

    await act(async () => {
      await expect(
        result.current.updateTask('task-1', {
          title: 'Titulo editado',
          description: 'Nueva descripcion',
          priority: 'low',
          dueDate: null,
        }),
      ).rejects.toThrow('update rechazado')
    })

    await waitFor(() => {
      const firstTask = result.current.tasks[0]
      expect(firstTask).toBeDefined()
      expect(firstTask?.title).toBe('Tarea base')
      expect(firstTask?.description).toBe('Descripcion base')
      expect(firstTask?.priority).toBe('medium')
    })
  })

  it('captura errores de suscripcion', () => {
    const { result } = renderHook(() => useTasks('user-1'))

    act(() => {
      onError?.(new Error('permiso denegado'))
    })

    expect(result.current.error).toBe('permiso denegado')
    expect(result.current.isLoading).toBe(false)
  })
})
