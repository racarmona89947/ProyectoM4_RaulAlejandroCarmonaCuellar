import { describe, expect, it } from 'vitest'
import type { Task } from '../../src/types/task'
import { filterTasks, getTaskStats, sortTasks } from '../../src/utils/tasks'
import { validateTaskDraft } from '../../src/utils/validators'

const baseTask: Task = {
  id: 'task-1',
  userId: 'user-1',
  title: 'Preparar informe',
  description: 'Resumen semanal',
  completed: false,
  priority: 'medium',
  dueDate: '2026-08-25',
  order: 1,
  createdAt: '2026-08-20T12:00:00.000Z',
  updatedAt: '2026-08-20T12:00:00.000Z',
}

describe('task utils', () => {
  it('filtra tareas pendientes y completadas', () => {
    const tasks = [
      baseTask,
      { ...baseTask, id: 'task-2', completed: true, title: 'Cerrar sprint' },
    ]

    expect(filterTasks(tasks, 'pending')).toHaveLength(1)
    expect(filterTasks(tasks, 'completed')).toHaveLength(1)
    expect(filterTasks(tasks, 'all')).toHaveLength(2)
  })

  it('ordena por prioridad y usa fecha como desempate', () => {
    const tasks = [
      { ...baseTask, id: 'low', priority: 'low', dueDate: '2026-08-22' },
      { ...baseTask, id: 'high-late', priority: 'high', dueDate: '2026-08-30' },
      { ...baseTask, id: 'high-early', priority: 'high', dueDate: '2026-08-21' },
    ] satisfies Task[]

    expect(sortTasks(tasks, 'priority').map((task) => task.id)).toEqual([
      'high-early',
      'high-late',
      'low',
    ])
  })

  it('calcula estadisticas incluyendo tareas vencidas', () => {
    const tasks = [
      { ...baseTask, dueDate: '2026-08-20' },
      { ...baseTask, id: 'task-2', completed: true, dueDate: '2026-08-19' },
    ]

    expect(getTaskStats(tasks, new Date('2026-08-21T12:00:00.000Z'))).toEqual({
      total: 2,
      completed: 1,
      pending: 1,
      overdue: 1,
    })
  })

  it('valida una tarea sin titulo', () => {
    expect(
      validateTaskDraft({
        title: '   ',
        description: '',
        priority: 'medium',
        dueDate: null,
      }).title,
    ).toBe('El titulo es obligatorio.')
  })

    it('rechaza fechas de vencimiento anteriores a hoy', () => {
      expect(
        validateTaskDraft({
          title: 'Tarea atrasada',
          description: '',
          priority: 'medium',
          dueDate: '1900-01-01',
        }).dueDate,
      ).toBe('La fecha de vencimiento no puede ser anterior a hoy.')
    })
})
