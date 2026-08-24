import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import type { Task, TaskDraft, TaskFieldErrors, TaskPriority } from '../../../types/task'
import { isTaskOverdue } from '../../../utils/tasks'
import { getTodayDateInputValue, normalizeOptionalDate, validateTaskDraft } from '../../../utils/validators'

interface TaskItemProps {
  dragHandle?: ReactNode
  isDisabled: boolean
  isDragging?: boolean
  isSelected?: boolean
  onSelectToggle?: (taskId: string) => void
  onDelete: (taskId: string) => Promise<void>
  onToggle: (taskId: string, completed: boolean) => Promise<void>
  onUpdate: (taskId: string, draft: TaskDraft) => Promise<void>
  task: Task
}

function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    high: 'Alta',
    low: 'Baja',
    medium: 'Media',
  }

  return labels[priority]
}

function toDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate,
  }
}

export function TaskItem({
  dragHandle,
  isDisabled,
  isDragging = false,
  isSelected = false,
  onSelectToggle,
  onDelete,
  onToggle,
  onUpdate,
  task,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<TaskDraft>(toDraft(task))
  const [fieldErrors, setFieldErrors] = useState<TaskFieldErrors>({})
  const overdue = isTaskOverdue(task)

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

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const nextErrors = validateTaskDraft(draft)
    setFieldErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) {
      return
    }

    await onUpdate(task.id, {
      ...draft,
      dueDate: normalizeOptionalDate(draft.dueDate),
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <article className="task-card task-card--editing">
        <form className="task-edit-form" onSubmit={handleEditSubmit} noValidate>
          <div className="field">
            <label htmlFor={`edit-title-${task.id}`}>Titulo</label>
            <input
              aria-describedby={fieldErrors.title ? `edit-title-${task.id}-error` : undefined}
              aria-invalid={Boolean(fieldErrors.title)}
              disabled={isDisabled}
              id={`edit-title-${task.id}`}
              name="title"
              onChange={handleTextChange}
              value={draft.title}
            />
            {fieldErrors.title ? (
              <span className="field-error" id={`edit-title-${task.id}-error`}>
                {fieldErrors.title}
              </span>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor={`edit-description-${task.id}`}>Descripcion</label>
            <textarea
              disabled={isDisabled}
              id={`edit-description-${task.id}`}
              name="description"
              onChange={handleTextChange}
              rows={2}
              value={draft.description}
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor={`edit-priority-${task.id}`}>Prioridad</label>
              <select
                disabled={isDisabled}
                id={`edit-priority-${task.id}`}
                onChange={handlePriorityChange}
                value={draft.priority}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor={`edit-due-date-${task.id}`}>Vencimiento</label>
              <input
                disabled={isDisabled}
                id={`edit-due-date-${task.id}`}
                name="dueDate"
                onChange={handleTextChange}
                min={getTodayDateInputValue()}
                type="date"
                value={draft.dueDate ?? ''}
              />
            </div>
          </div>
          <div className="task-actions">
            <Button disabled={isDisabled} type="submit">
              Guardar
            </Button>
            <Button
              disabled={isDisabled}
              onClick={() => {
                setDraft(toDraft(task))
                setFieldErrors({})
                setIsEditing(false)
              }}
              variant="ghost"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </article>
    )
  }

  return (
    <article
      className={[
        'task-card',
        task.completed ? 'task-card--done' : '',
        overdue ? 'task-card--overdue' : '',
        isDragging ? 'task-card--dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="task-card__main">
        <div className="task-card__leading">
          {dragHandle}
          {onSelectToggle ? (
            <label className="task-select-label" title={`Seleccionar ${task.title}`}>
              <input
                type="checkbox"
                className="task-select-checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => onSelectToggle(task.id)}
                aria-label={`Seleccionar ${task.title}`}
              />
              <span className="task-select-custom" />
            </label>
          ) : null}
        </div>
        <div className="task-content">
          <div className="task-title-row">
            <h3>{task.title}</h3>
            <span className={`priority-badge priority-badge--${task.priority}`}>
              {getPriorityLabel(task.priority)}
            </span>
          </div>
          {task.description ? <p>{task.description}</p> : null}
          <div className="task-meta">
            <span className={`status-chip status-chip--${task.completed ? 'completed' : 'pending'}`}>
              {task.completed ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Completada
                </>
              ) : (
                'Pendiente'
              )}
            </span>
            <span className="due-date-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {task.dueDate ? `Vence: ${task.dueDate}` : 'Sin fecha'}
            </span>
            {overdue ? (
              <span className="overdue-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Vencida
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="task-actions">
        <Button
          disabled={isDisabled}
          onClick={() => onToggle(task.id, !task.completed)}
          variant="secondary"
        >
          {task.completed ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Completada</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span>Completar</span>
            </>
          )}
        </Button>
        <Button
          disabled={isDisabled}
          onClick={() => {
            setDraft(toDraft(task))
            setFieldErrors({})
            setIsEditing(true)
          }}
          variant="secondary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span>Editar</span>
        </Button>
        <Button disabled={isDisabled} onClick={() => onDelete(task.id)} variant="danger">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          <span>Eliminar</span>
        </Button>
      </div>
    </article>
  )
}
