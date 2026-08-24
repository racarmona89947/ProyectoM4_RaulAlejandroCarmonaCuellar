import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { InlineMessage } from '../../../components/feedback/InlineMessage'
import { Button } from '../../../components/ui/Button'
import type { TaskDraft, TaskFieldErrors, TaskPriority } from '../../../types/task'
import { getTodayDateInputValue, normalizeOptionalDate, validateTaskDraft } from '../../../utils/validators'

const initialDraft: TaskDraft = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: null,
}

interface TaskFormProps {
  error: string | null
  isSubmitting: boolean
  onSubmit: (draft: TaskDraft) => Promise<void>
}

export function TaskForm({ error, isSubmitting, onSubmit }: TaskFormProps) {
  const [draft, setDraft] = useState<TaskDraft>(initialDraft)
  const [fieldErrors, setFieldErrors] = useState<TaskFieldErrors>({})

  function resetForm(): void {
    setDraft({ ...initialDraft })
    setFieldErrors({})
  }

  function updateDraft(field: keyof TaskDraft, value: string): void {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: field === 'dueDate' ? normalizeOptionalDate(value) : value,
    }))
  }

  function handleTextChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    const { name, value } = event.currentTarget

    if (name === 'title' || name === 'description' || name === 'dueDate') {
      updateDraft(name, value)
    }
  }

  function handlePriorityChange(event: ChangeEvent<HTMLSelectElement>): void {
    updateDraft('priority', event.currentTarget.value as TaskPriority)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const nextErrors = validateTaskDraft(draft)
    setFieldErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) {
      return
    }

    await onSubmit({
      ...draft,
      dueDate: normalizeOptionalDate(draft.dueDate),
    })
    resetForm()
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="task-title">Titulo</label>
        <input
          aria-describedby={fieldErrors.title ? 'task-title-error' : undefined}
          aria-invalid={Boolean(fieldErrors.title)}
          disabled={isSubmitting}
          id="task-title"
          name="title"
          onChange={handleTextChange}
          placeholder="Ej: Revisar backlog del dia"
          type="text"
          value={draft.title}
        />
        {fieldErrors.title ? (
          <span className="field-error" id="task-title-error">
            {fieldErrors.title}
          </span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="task-description">Descripcion</label>
        <textarea
          aria-describedby={fieldErrors.description ? 'task-description-error' : undefined}
          aria-invalid={Boolean(fieldErrors.description)}
          disabled={isSubmitting}
          id="task-description"
          name="description"
          onChange={handleTextChange}
          placeholder="Agrega contexto, alcance o notas utiles"
          rows={3}
          value={draft.description}
        />
        {fieldErrors.description ? (
          <span className="field-error" id="task-description-error">
            {fieldErrors.description}
          </span>
        ) : null}
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="task-priority">Prioridad</label>
          <select
            disabled={isSubmitting}
            id="task-priority"
            name="priority"
            onChange={handlePriorityChange}
            value={draft.priority}
          >
            <option value="low">🟢 Baja</option>
            <option value="medium">🟡 Media</option>
            <option value="high">🔴 Alta</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="task-due-date">Fecha de vencimiento</label>
          <input
            aria-describedby={fieldErrors.dueDate ? 'task-due-date-error' : undefined}
            aria-invalid={Boolean(fieldErrors.dueDate)}
            disabled={isSubmitting}
            id="task-due-date"
            name="dueDate"
            onChange={handleTextChange}
            min={getTodayDateInputValue()}
            type="date"
            value={draft.dueDate ?? ''}
          />
          {fieldErrors.dueDate ? (
            <span className="field-error" id="task-due-date-error">
              {fieldErrors.dueDate}
            </span>
          ) : null}
        </div>
      </div>

      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

      <Button isLoading={isSubmitting} loadingLabel="Creando..." type="submit">
        Crear tarea
      </Button>
    </form>
  )
}
