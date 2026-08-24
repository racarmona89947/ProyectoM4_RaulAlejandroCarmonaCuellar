import type { TaskFilter, TaskSort } from '../../../types/task'

interface TaskControlsProps {
  filter: TaskFilter
  onFilterChange: (filter: TaskFilter) => void
  onSortChange: (sort: TaskSort) => void
  sort: TaskSort
}

export function TaskControls({ filter, onFilterChange, onSortChange, sort }: TaskControlsProps) {
  return (
    <div className="task-controls" aria-label="Controles de tareas">
      <div className="segmented-control" aria-label="Filtrar tareas">
        <button
          aria-pressed={filter === 'all'}
          onClick={() => onFilterChange('all')}
          type="button"
        >
          Todas
        </button>
        <button
          aria-pressed={filter === 'pending'}
          onClick={() => onFilterChange('pending')}
          type="button"
        >
          Pendientes
        </button>
        <button
          aria-pressed={filter === 'completed'}
          onClick={() => onFilterChange('completed')}
          type="button"
        >
          Completadas
        </button>
      </div>

      <label className="select-label" htmlFor="task-sort">
        Orden
        <select id="task-sort" onChange={(event) => onSortChange(event.currentTarget.value as TaskSort)} value={sort}>
          <option value="manual">Manual</option>
          <option value="priority">Prioridad</option>
          <option value="dueDate">Vencimiento</option>
        </select>
      </label>
    </div>
  )
}
