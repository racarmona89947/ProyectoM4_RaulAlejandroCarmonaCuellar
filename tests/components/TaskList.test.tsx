import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaskList } from '../../src/features/tasks/components/TaskList'
import type { Task } from '../../src/types/task'

const tasks: Task[] = [
  {
    id: 'task-1',
    userId: 'user-1',
    title: 'Preparar informe',
    description: 'Resumen semanal',
    completed: false,
    priority: 'high',
    dueDate: '2026-08-25',
    order: 1,
    createdAt: '2026-08-20T12:00:00.000Z',
    updatedAt: '2026-08-20T12:00:00.000Z',
  },
  {
    id: 'task-2',
    userId: 'user-1',
    title: 'Cerrar sprint',
    description: '',
    completed: true,
    priority: 'low',
    dueDate: null,
    order: 2,
    createdAt: '2026-08-20T12:00:00.000Z',
    updatedAt: '2026-08-20T12:00:00.000Z',
  },
]

function renderTaskList(overrides: Partial<Parameters<typeof TaskList>[0]> = {}) {
  const props = {
    canReorder: false,
    error: null,
    isActionPending: false,
    pendingTaskId: null,
    isLoading: false,
    onDelete: vi.fn(async () => undefined),
    onReorder: vi.fn(async () => undefined),
    onToggle: vi.fn(async () => undefined),
    onUpdate: vi.fn(async () => undefined),
    tasks,
    ...overrides,
  }

  render(<TaskList {...props} />)
  return props
}

describe('TaskList', () => {
  it('muestra estado vacio', () => {
    renderTaskList({ tasks: [] })

    expect(screen.getByText('No hay tareas para esta vista')).toBeInTheDocument()
  })

  it('renderiza tareas y permite marcar completada', async () => {
    const user = userEvent.setup()
    const props = renderTaskList()

    await user.click(screen.getByRole('button', { name: 'Completar' }))

    expect(props.onToggle).toHaveBeenCalledWith('task-1', true)
  })

  it('permite eliminar una tarea', async () => {
    const user = userEvent.setup()
    const props = renderTaskList()

    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i })
    expect(deleteButtons[0]).toBeDefined()
    await user.click(deleteButtons[0]!)

    expect(props.onDelete).toHaveBeenCalledWith('task-1')
  })
})
