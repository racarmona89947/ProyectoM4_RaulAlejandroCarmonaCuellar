import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses'
import type { ApiErrorResponse, ApiSuccessResponse, SendTaskSummaryPayload } from '../src/types/email'
import { isValidEmail, isTaskPriority } from '../src/utils/validators'

const MAX_TASKS_PER_EMAIL = 100

const REQUIRED_ENV_KEYS = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SES_FROM_EMAIL',
] as const

type ServerEnvKey = (typeof REQUIRED_ENV_KEYS)[number]
type ServerEnv = Record<ServerEnvKey, string>

function jsonResponse(body: ApiErrorResponse | ApiSuccessResponse, status: number, headers?: HeadersInit): Response {
  return Response.json(body, {
    headers,
    status,
  })
}

function sendError(status: number, error: string, headers?: HeadersInit): Response {
  const body: ApiErrorResponse = { ok: false, error }
  return jsonResponse(body, status, headers)
}

function sendSuccess(message: string): Response {
  const body: ApiSuccessResponse = { ok: true, message }
  return jsonResponse(body, 200)
}

function readServerEnv(): { env: ServerEnv | null; missing: ServerEnvKey[] } {
  const missing: ServerEnvKey[] = []
  const env = {} as ServerEnv

  REQUIRED_ENV_KEYS.forEach((key) => {
    const value = process.env[key]

    if (value === undefined || value.trim().length === 0) {
      missing.push(key)
      return
    }

    env[key] = value
  })

  return { env: missing.length === 0 ? env : null, missing }
}

async function parseBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown
  } catch {
    return null
  }
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function validatePayload(value: unknown): { payload: SendTaskSummaryPayload | null; error: string | null } {
  if (!isStringRecord(value)) {
    return { payload: null, error: 'El payload debe ser un objeto JSON.' }
  }

  const recipientEmail = value.recipientEmail
  const tasks = value.tasks

  if (typeof recipientEmail !== 'string' || !isValidEmail(recipientEmail)) {
    return { payload: null, error: 'El email destinatario no es valido.' }
  }

  if (!Array.isArray(tasks) || tasks.length === 0 || tasks.length > MAX_TASKS_PER_EMAIL) {
    return { payload: null, error: 'El resumen debe incluir entre 1 y 100 tareas.' }
  }

  const sanitizedTasks = tasks.map((task) => {
    if (!isStringRecord(task)) {
      return null
    }

    const { title, description, completed, priority, dueDate } = task

    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 120) {
      return null
    }

    if (typeof description !== 'string' || description.length > 500) {
      return null
    }

    if (typeof completed !== 'boolean' || !isTaskPriority(priority)) {
      return null
    }

    if (dueDate !== null && typeof dueDate !== 'string') {
      return null
    }

    return {
      title: title.trim(),
      description: description.trim(),
      completed,
      priority,
      dueDate,
    }
  })

  if (sanitizedTasks.some((task) => task === null)) {
    return { payload: null, error: 'La lista de tareas contiene datos invalidos.' }
  }

  return {
    payload: {
      recipientEmail: recipientEmail.trim(),
      tasks: sanitizedTasks as SendTaskSummaryPayload['tasks'],
    },
    error: null,
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildTextSummary(payload: SendTaskSummaryPayload): string {
  const completed = payload.tasks.filter((task) => task.completed).length
  const pending = payload.tasks.length - completed
  const lines = payload.tasks.map((task, index) => {
    const state = task.completed ? 'Completada' : 'Pendiente'
    const dueDate = task.dueDate ? ` | vence: ${task.dueDate}` : ''
    const description = task.description ? `\n   ${task.description}` : ''
    return `${index + 1}. [${state}] ${task.title} | prioridad: ${task.priority}${dueDate}${description}`
  })

  return [
    'Resumen de tareas',
    `Total: ${payload.tasks.length}`,
    `Completadas: ${completed}`,
    `Pendientes: ${pending}`,
    '',
    ...lines,
  ].join('\n')
}

function buildHtmlSummary(payload: SendTaskSummaryPayload): string {
  const completed = payload.tasks.filter((task) => task.completed).length
  const pending = payload.tasks.length - completed
  const taskItems = payload.tasks
    .map((task) => {
      const state = task.completed ? 'Completada' : 'Pendiente'
      const dueDate = task.dueDate ? `<p><strong>Vence:</strong> ${escapeHtml(task.dueDate)}</p>` : ''
      const description = task.description ? `<p>${escapeHtml(task.description)}</p>` : ''

      return `<li>
        <strong>${escapeHtml(task.title)}</strong>
        <p>Estado: ${state} | Prioridad: ${escapeHtml(task.priority)}</p>
        ${dueDate}
        ${description}
      </li>`
    })
    .join('')

  return `<main>
    <h1>Resumen de tareas</h1>
    <p>Total: ${payload.tasks.length}</p>
    <p>Completadas: ${completed}</p>
    <p>Pendientes: ${pending}</p>
    <ol>${taskItems}</ol>
  </main>`
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return sendError(405, 'Metodo no permitido.', {
      Allow: 'POST',
    })
  }

  const { payload, error } = validatePayload(await parseBody(request))

  if (payload === null) {
    return sendError(400, error ?? 'Payload invalido.')
  }

  const { env, missing } = readServerEnv()

  if (env === null) {
    console.error(`Missing AWS SES environment variables: ${missing.join(', ')}`)
    return sendError(500, 'El servicio de email no esta configurado.')
  }

  const ses = new SESClient({
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    region: env.AWS_REGION,
  })

  try {
    await ses.send(
      new SendEmailCommand({
        Destination: {
          ToAddresses: [payload.recipientEmail],
        },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: buildHtmlSummary(payload),
            },
            Text: {
              Charset: 'UTF-8',
              Data: buildTextSummary(payload),
            },
          },
          Subject: {
            Charset: 'UTF-8',
            Data: 'Resumen de tareas',
          },
        },
        Source: env.AWS_SES_FROM_EMAIL,
      }),
    )

    return sendSuccess('Resumen enviado correctamente.')
  } catch (sendErrorCause) {
    console.error('AWS SES send failed', sendErrorCause)
    return sendError(502, 'AWS SES no pudo enviar el email.')
  }
}

export default {
  fetch: handleRequest,
}
