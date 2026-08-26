import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import type { DocumentData, DocumentSnapshot, FieldValue, Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { Task, TaskDraft, TaskPriority } from '../types/task'
import { isTaskPriority, normalizeOptionalDate, validateTaskDraft } from '../utils/validators'

interface FirestoreTimestampLike {
  toDate: () => Date
}

interface TaskWriteModel {
  userId: string
  title: string
  description: string
  completed: boolean
  priority: TaskPriority
  dueDate: string | null
  order: number
  createdAt: FieldValue
  updatedAt: FieldValue
}

type TaskUpdatePayload = Partial<
  Pick<TaskWriteModel, 'title' | 'description' | 'completed' | 'priority' | 'dueDate' | 'order'>
> & {
  updatedAt: FieldValue
}

export type TasksObserver = (tasks: Task[]) => void
export type TasksErrorObserver = (error: Error) => void

function tasksCollectionRef(userId: string) {
  return collection(db, 'users', userId, 'tasks')
}

function taskDocRef(userId: string, taskId: string) {
  return doc(db, 'users', userId, 'tasks', taskId)
}

function isTimestampLike(value: unknown): value is FirestoreTimestampLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  )
}

function toIsoDate(value: unknown): string {
  return isTimestampLike(value) ? value.toDate().toISOString() : new Date().toISOString()
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function getBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function getNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback
}

function getNullableDate(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function mapSnapshotToTask(snapshot: DocumentSnapshot<DocumentData>): Task {
  const data = snapshot.data() ?? {}
  const priority = isTaskPriority(data.priority) ? data.priority : 'medium'

  return {
    id: snapshot.id,
    userId: getString(data.userId),
    title: getString(data.title),
    description: getString(data.description),
    completed: getBoolean(data.completed),
    priority,
    dueDate: getNullableDate(data.dueDate),
    order: getNumber(data.order),
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
  }
}

function assertValidTaskDraft(draft: TaskDraft): void {
  const errors = validateTaskDraft(draft)
  const firstError = Object.values(errors).find((error) => typeof error === 'string')

  if (firstError !== undefined) {
    throw new Error(firstError)
  }
}

export function subscribeToUserTasks(
  userId: string,
  onNext: TasksObserver,
  onError: TasksErrorObserver,
): Unsubscribe {
  return onSnapshot(
    tasksCollectionRef(userId),
    (snapshot) => {
      const tasks = snapshot.docs.map(mapSnapshotToTask)
      onNext(tasks.sort((firstTask, secondTask) => firstTask.order - secondTask.order))
    },
    (error) => {
      onError(new Error(error.message))
    },
  )
}

export async function createTaskForUser(userId: string, draft: TaskDraft): Promise<Task> {
  assertValidTaskDraft(draft)

  const now = new Date().toISOString()

  const payload: TaskWriteModel = {
    userId,
    title: draft.title.trim(),
    description: draft.description.trim(),
    completed: false,
    priority: draft.priority,
    dueDate: normalizeOptionalDate(draft.dueDate),
    order: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const documentReference = await addDoc(tasksCollectionRef(userId), payload)

  return {
    id: documentReference.id,
    userId,
    title: payload.title,
    description: payload.description,
    completed: payload.completed,
    priority: payload.priority,
    dueDate: payload.dueDate,
    order: payload.order,
    createdAt: now,
    updatedAt: now,
  }
}

export async function updateTaskForUser(
  userId: string,
  taskId: string,
  draft: TaskDraft,
): Promise<void> {
  assertValidTaskDraft(draft)

  const payload: TaskUpdatePayload = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    priority: draft.priority,
    dueDate: normalizeOptionalDate(draft.dueDate),
    updatedAt: serverTimestamp(),
  }

  await updateDoc(taskDocRef(userId, taskId), payload)
}

export async function toggleTaskForUser(
  userId: string,
  taskId: string,
  completed: boolean,
): Promise<void> {
  await updateDoc(taskDocRef(userId, taskId), {
    completed,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteTaskForUser(userId: string, taskId: string): Promise<void> {
  await deleteDoc(taskDocRef(userId, taskId))
}

export async function reorderTasksForUser(userId: string, orderedTaskIds: string[]): Promise<void> {
  const batch = writeBatch(db)

  orderedTaskIds.forEach((taskId, index) => {
    batch.update(taskDocRef(userId, taskId), {
      order: index,
      updatedAt: serverTimestamp(),
    })
  })

  await batch.commit()
}
