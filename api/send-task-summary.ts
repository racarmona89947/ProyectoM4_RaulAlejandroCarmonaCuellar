import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses'
import type { ApiErrorResponse, ApiSuccessResponse, SendTaskSummaryPayload } from '../src/types/email'
import { isValidEmail, isTaskPriority } from '../src/utils/validators'

const MAX_TASKS_PER_EMAIL = 100
const DEFAULT_FROM_NAME = 'Gestor Estrategico de Tareas'

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

function humanizePriority(priority: 'low' | 'medium' | 'high'): string {
  if (priority === 'high') {
    return 'Alta'
  }

  if (priority === 'medium') {
    return 'Media'
  }

  return 'Baja'
}

function formatDueDate(date: string | null): string {
  if (date === null) {
    return 'Sin fecha'
  }

  return date
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
  const now = new Date().toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const taskItems = payload.tasks
    .map((task, index) => {
      const state = task.completed ? 'Completada' : 'Pendiente'
      const stateColor = task.completed ? '#0f766e' : '#b45309'
      const priorityColor =
        task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#b45309' : '#1d4ed8'
      const description = task.description
        ? escapeHtml(task.description)
        : '<span style="color:#64748b;">Sin descripcion</span>'

      return `<tr>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:600;">${index + 1}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:700;">${escapeHtml(task.title)}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;">
            <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#f8fafc;border:1px solid #cbd5e1;color:${stateColor};font-weight:700;font-size:12px;">
              ${state}
            </span>
          </td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;">
            <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fff7ed;border:1px solid #fed7aa;color:${priorityColor};font-weight:700;font-size:12px;">
              ${humanizePriority(task.priority)}
            </span>
          </td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#334155;white-space:nowrap;">${escapeHtml(formatDueDate(task.dueDate))}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#334155;max-width:320px;">${description}</td>
        </tr>`
    })
    .join('')

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Resumen de tareas</title>
  </head>
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:900px;margin:0 auto;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;">
      <tr>
        <td style="padding:24px 24px 12px;background:linear-gradient(135deg,#0f172a 0%,#0f4c81 100%);">
          <p style="margin:0 0 6px;color:#bae6fd;font-size:12px;letter-spacing:0.8px;text-transform:uppercase;font-weight:700;">Gestor estrategico de tareas</p>
          <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.2;">Resumen actualizado de tareas</h1>
          <p style="margin:8px 0 0;color:#dbeafe;font-size:13px;">Generado el ${escapeHtml(now)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 24px 8px;background:#f8fafc;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:8px 0;">
            <tr>
              <td style="background:#e0f2fe;border:1px solid #bae6fd;border-radius:10px;padding:12px;">
                <p style="margin:0;color:#075985;font-size:12px;font-weight:700;text-transform:uppercase;">Total</p>
                <p style="margin:4px 0 0;color:#0f172a;font-size:22px;font-weight:800;">${payload.tasks.length}</p>
              </td>
              <td style="background:#ecfeff;border:1px solid #99f6e4;border-radius:10px;padding:12px;">
                <p style="margin:0;color:#0f766e;font-size:12px;font-weight:700;text-transform:uppercase;">Completadas</p>
                <p style="margin:4px 0 0;color:#0f172a;font-size:22px;font-weight:800;">${completed}</p>
              </td>
              <td style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px;">
                <p style="margin:0;color:#b45309;font-size:12px;font-weight:700;text-transform:uppercase;">Pendientes</p>
                <p style="margin:4px 0 0;color:#0f172a;font-size:22px;font-weight:800;">${pending}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px 24px;">
          <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Detalle de tareas</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
            <thead>
              <tr style="background:#f8fafc;">
                <th align="left" style="padding:12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;text-transform:uppercase;">#</th>
                <th align="left" style="padding:12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;text-transform:uppercase;">Tarea</th>
                <th align="left" style="padding:12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;text-transform:uppercase;">Estado</th>
                <th align="left" style="padding:12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;text-transform:uppercase;">Prioridad</th>
                <th align="left" style="padding:12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;text-transform:uppercase;">Vence</th>
                <th align="left" style="padding:12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;text-transform:uppercase;">Descripcion</th>
              </tr>
            </thead>
            <tbody>${taskItems}</tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#64748b;font-size:12px;">Este correo fue generado automaticamente por Gestor estrategico de tareas.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
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
        Source: `${DEFAULT_FROM_NAME} <${env.AWS_SES_FROM_EMAIL}>`,
      }),
    )

    return sendSuccess('Resumen enviado correctamente.')
  } catch (sendErrorCause) {
    console.error('AWS SES send failed', sendErrorCause)
    return sendError(502, 'AWS SES no pudo enviar el email.')
  }
}

export default handleRequest
