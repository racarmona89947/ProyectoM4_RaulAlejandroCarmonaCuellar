import { useMemo, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { InlineMessage } from '../components/feedback/InlineMessage'
import { useAuth } from '../features/auth/useAuth'
import { TaskControls } from '../features/tasks/components/TaskControls'
import { TaskForm } from '../features/tasks/components/TaskForm'
import { TaskList } from '../features/tasks/components/TaskList'
import { useTasks } from '../hooks/useTasks'
import { sendTaskSummaryEmail } from '../services/emailService'
import type { AsyncStatus } from '../types/status'
import type { TaskFilter, TaskSort } from '../types/task'
import { filterTasks, getTaskStats, sortTasks, toEmailSummaryItems } from '../utils/tasks'

export function TasksPage() {
  const { logout, user } = useAuth()
  const {
    actionStatus,
    createTask,
    deleteTask,
    error,
    isLoading,
    reorderTasks,
    tasks,
    toggleTask,
    updateTask,
    pendingTarget,
  } = useTasks(user?.uid ?? null)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [sort, setSort] = useState<TaskSort>('manual')
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [emailStatus, setEmailStatus] = useState<AsyncStatus>('idle')
  const [emailMessage, setEmailMessage] = useState<string | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

  const visibleTasks = useMemo(() => sortTasks(filterTasks(tasks, filter), sort), [filter, sort, tasks])
  const stats = useMemo(() => getTaskStats(tasks), [tasks])
  const isActionPending = actionStatus === 'loading'
  const isCreatePending = isActionPending && pendingTarget === 'create'
  const isEmailPending = emailStatus === 'loading'
  const canReorder = filter === 'all' && sort === 'manual'

  function handleSelectToggle(taskId: string): void {
    setSelectedTaskIds((current) => {
      const next = new Set(current)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  function handleSelectAllToggle(): void {
    if (selectedTaskIds.size === visibleTasks.length && visibleTasks.length > 0) {
      setSelectedTaskIds(new Set())
    } else {
      setSelectedTaskIds(new Set(visibleTasks.map((task) => task.id)))
    }
  }

  async function handleBulkComplete(): Promise<void> {
    const taskIds = Array.from(selectedTaskIds)
    await Promise.all(taskIds.map((taskId) => toggleTask(taskId, true)))
    setSelectedTaskIds(new Set())
  }

  async function handleBulkDelete(): Promise<void> {
    const taskIds = Array.from(selectedTaskIds)
    await Promise.all(taskIds.map((taskId) => deleteTask(taskId)))
    setSelectedTaskIds(new Set())
  }

  async function handleSendSummary(): Promise<void> {
    if (user?.email === null || user?.email === undefined) {
      setEmailStatus('error')
      setEmailMessage('Tu cuenta no tiene un email disponible para recibir el resumen.')
      return
    }

    setEmailStatus('loading')
    setEmailMessage(null)

    try {
      const response = await sendTaskSummaryEmail({
        recipientEmail: user.email,
        tasks: toEmailSummaryItems(tasks),
      })
      setEmailStatus('success')
      setEmailMessage(response.message)
    } catch (sendError) {
      setEmailStatus('error')
      setEmailMessage(sendError instanceof Error ? sendError.message : 'No se pudo enviar el resumen.')
    }
  }

  async function handleCreateTask(draft: Parameters<typeof createTask>[0]): Promise<void> {
    await createTask(draft)
    setIsCreateFormOpen(false)
  }

  return (
    <AppShell onLogout={logout} userEmail={user?.email ?? null}>
      <main className="tasks-page">
        <section className="dashboard-strip" aria-label="Resumen de tareas">
          <article className="stat-card stat-card--total">
            <div className="stat-card__header">
              <span>Total</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
            </div>
            <strong>{stats.total}</strong>
          </article>
          <article className="stat-card stat-card--pending">
            <div className="stat-card__header">
              <span>Pendientes</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <strong>{stats.pending}</strong>
          </article>
          <article className="stat-card stat-card--completed">
            <div className="stat-card__header">
              <span>Completadas</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <strong>{stats.completed}</strong>
          </article>
          <article className="stat-card stat-card--overdue">
            <div className="stat-card__header">
              <span>Vencidas</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <strong>{stats.overdue}</strong>
          </article>
        </section>

        <section className="workspace-grid">
          <section className="task-board" aria-labelledby="tasks-title">
            <div className="task-board__header">
              <div>
                <p className="eyebrow">Firestore realtime</p>
                <h2 id="tasks-title">Tareas</h2>
              </div>
              <div className="board-actions">
                <Button className="create-task-inline" onClick={() => setIsCreateFormOpen(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span>Crear tarea</span>
                </Button>
                <div className="email-actions">
                  <Button
                    disabled={tasks.length === 0}
                    isLoading={isEmailPending}
                    loadingLabel="Enviando..."
                    onClick={handleSendSummary}
                    variant="secondary"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span>Enviar resumen por email</span>
                  </Button>
                </div>
              </div>
            </div>

            {emailMessage ? (
              <InlineMessage tone={emailStatus === 'success' ? 'success' : 'error'}>{emailMessage}</InlineMessage>
            ) : null}

            <TaskControls filter={filter} onFilterChange={setFilter} onSortChange={setSort} sort={sort} />

            {selectedTaskIds.size > 0 ? (
              <div className="bulk-actions-bar">
                <div className="bulk-actions-info">
                  <span className="bulk-count">{selectedTaskIds.size} tarea(s) seleccionada(s)</span>
                  <Button variant="ghost" onClick={handleSelectAllToggle}>
                    {selectedTaskIds.size === visibleTasks.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </Button>
                </div>
                <div className="bulk-actions-buttons">
                  <Button variant="secondary" onClick={handleBulkComplete} disabled={isActionPending}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Completar ({selectedTaskIds.size})</span>
                  </Button>
                  <Button variant="danger" onClick={handleBulkDelete} disabled={isActionPending}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    <span>Eliminar ({selectedTaskIds.size})</span>
                  </Button>
                </div>
              </div>
            ) : null}

            <p className={`hint ${canReorder ? 'hint--placeholder' : ''}`}>
              El reordenamiento manual se activa con filtro Todas y orden Manual.
            </p>

            <TaskList
              canReorder={canReorder}
              error={error}
              isActionPending={isActionPending}
              pendingTaskId={pendingTarget !== 'create' ? pendingTarget : null}
              isLoading={isLoading}
              selectedTaskIds={selectedTaskIds}
              onSelectToggle={handleSelectToggle}
              onDelete={deleteTask}
              onReorder={reorderTasks}
              onToggle={toggleTask}
              onUpdate={updateTask}
              tasks={visibleTasks}
            />
          </section>
        </section>

        {isCreateFormOpen ? (
          <div
            aria-modal="true"
            className="task-modal"
            onClick={(event) => {
              if (event.currentTarget === event.target && !isCreatePending) {
                setIsCreateFormOpen(false)
              }
            }}
            role="dialog"
          >
            <div className="task-modal__dialog">
              <div className="task-modal__header">
                <h3>Crear tarea</h3>
                <Button
                  disabled={isCreatePending}
                  onClick={() => setIsCreateFormOpen(false)}
                  variant="ghost"
                >
                  Cerrar
                </Button>
              </div>
              <TaskForm error={error} isSubmitting={isCreatePending} onSubmit={handleCreateTask} />
              <Button
                className="create-task-cancel"
                disabled={isCreatePending}
                onClick={() => setIsCreateFormOpen(false)}
                variant="ghost"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </main>
    </AppShell>
  )
}
