import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaskForm } from '../../src/features/tasks/components/TaskForm'
import type { TaskDraft } from '../../src/types/task'

function getTomorrowDateInputValue(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  return [tomorrow.getFullYear(), String(tomorrow.getMonth() + 1).padStart(2, '0'), String(tomorrow.getDate()).padStart(2, '0')].join('-')
}

describe('TaskForm', () => {
  it('muestra error cuando el titulo esta vacio', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn(async () => undefined)

    render(<TaskForm error={null} isSubmitting={false} onSubmit={handleSubmit} />)

    await user.click(screen.getByRole('button', { name: /crear tarea/i }))

    expect(await screen.findByText('El titulo es obligatorio.')).toBeInTheDocument()
    expect(handleSubmit).not.toHaveBeenCalled()
  })

  it('envia una tarea valida y limpia el formulario', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn(async (_draft: TaskDraft) => undefined)
    const dueDate = getTomorrowDateInputValue()

    render(<TaskForm error={null} isSubmitting={false} onSubmit={handleSubmit} />)

    await user.type(screen.getByLabelText(/titulo/i), 'Preparar demo')
    await user.type(screen.getByLabelText(/descripcion/i), 'Validar flujo completo')
    await user.selectOptions(screen.getByLabelText(/prioridad/i), 'high')
    await user.type(screen.getByLabelText(/fecha de vencimiento/i), dueDate)
    await user.click(screen.getByRole('button', { name: /crear tarea/i }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        title: 'Preparar demo',
        description: 'Validar flujo completo',
        priority: 'high',
        dueDate,
      })
    })
    expect(screen.getByLabelText(/titulo/i)).toHaveValue('')
    expect(screen.getByLabelText(/descripcion/i)).toHaveValue('')
    expect(screen.getByLabelText(/prioridad/i)).toHaveValue('medium')
    expect(screen.getByLabelText(/fecha de vencimiento/i)).toHaveValue('')
  })
})
