import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { InlineMessage } from '../../../components/feedback/InlineMessage'
import { LoadingView } from '../../../components/feedback/LoadingView'
import type { Task, TaskDraft } from '../../../types/task'
import { TaskItem } from './TaskItem'

interface TaskListProps {
  canReorder: boolean
  error: string | null
  isActionPending: boolean
  pendingTaskId: string | null
  isLoading: boolean
  selectedTaskIds?: Set<string>
  onSelectToggle?: (taskId: string) => void
  onDelete: (taskId: string) => Promise<void>
  onReorder: (orderedTaskIds: string[]) => Promise<void>
  onToggle: (taskId: string, completed: boolean) => Promise<void>
  onUpdate: (taskId: string, draft: TaskDraft) => Promise<void>
  tasks: Task[]
}

interface SortableTaskItemProps {
  isDisabled: boolean
  isSelected: boolean
  onSelectToggle?: (taskId: string) => void
  onDelete: (taskId: string) => Promise<void>
  onToggle: (taskId: string, completed: boolean) => Promise<void>
  onUpdate: (taskId: string, draft: TaskDraft) => Promise<void>
  task: Task
}

function SortableTaskItem({
  isDisabled,
  isSelected,
  onSelectToggle,
  onDelete,
  onToggle,
  onUpdate,
  task,
}: SortableTaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dragHandle = (
    <button
      aria-label={`Reordenar ${task.title}`}
      className="drag-handle"
      disabled={isDisabled}
      type="button"
      {...attributes}
      {...listeners}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="5" r="1.5" fill="currentColor"/>
        <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="9" cy="19" r="1.5" fill="currentColor"/>
        <circle cx="15" cy="5" r="1.5" fill="currentColor"/>
        <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="15" cy="19" r="1.5" fill="currentColor"/>
      </svg>
    </button>
  )

  return (
    <li ref={setNodeRef} style={style}>
      <TaskItem
        dragHandle={dragHandle}
        isDisabled={isDisabled}
        isDragging={isDragging}
        isSelected={isSelected}
        onSelectToggle={onSelectToggle}
        onDelete={onDelete}
        onToggle={onToggle}
        onUpdate={onUpdate}
        task={task}
      />
    </li>
  )
}

export function TaskList({
  canReorder,
  error,
  isActionPending,
  pendingTaskId,
  isLoading,
  selectedTaskIds,
  onSelectToggle,
  onDelete,
  onReorder,
  onToggle,
  onUpdate,
  tasks,
}: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  if (isLoading) {
    return <LoadingView message="Sincronizando tareas..." />
  }

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
        <h2>No hay tareas para esta vista</h2>
        <p>Crea una tarea o cambia el filtro para ver otros resultados.</p>
      </div>
    )
  }

  function handleDragEnd(event: DragEndEvent): void {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null

    if (overId === null || activeId === overId) {
      return
    }

    const oldIndex = tasks.findIndex((task) => task.id === activeId)
    const newIndex = tasks.findIndex((task) => task.id === overId)

    if (oldIndex < 0 || newIndex < 0) {
      return
    }

    const orderedTasks = arrayMove(tasks, oldIndex, newIndex)
    void onReorder(orderedTasks.map((task) => task.id))
  }

  const listContent = (
    <ul className="task-list">
      {tasks.map((task) => (
        <li key={task.id}>
          <TaskItem
            isDisabled={isActionPending && pendingTaskId === task.id}
            isSelected={selectedTaskIds?.has(task.id) ?? false}
            onSelectToggle={onSelectToggle}
            onDelete={onDelete}
            onToggle={onToggle}
            onUpdate={onUpdate}
            task={task}
          />
        </li>
      ))}
    </ul>
  )

  return (
    <section className="task-list-section" aria-label="Listado de tareas">
      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
      {canReorder && tasks.length > 1 ? (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
          <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
            <ul className="task-list">
              {tasks.map((task) => (
                <SortableTaskItem
                  isDisabled={isActionPending && pendingTaskId === task.id}
                  isSelected={selectedTaskIds?.has(task.id) ?? false}
                  onSelectToggle={onSelectToggle}
                  key={task.id}
                  onDelete={onDelete}
                  onToggle={onToggle}
                  onUpdate={onUpdate}
                  task={task}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        listContent
      )}
    </section>
  )
}
