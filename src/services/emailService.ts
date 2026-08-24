import type { ApiResponse, ApiSuccessResponse, SendTaskSummaryPayload } from '../types/email'

export class EmailSummaryError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'EmailSummaryError'
    this.status = status
  }
}

function getApiErrorMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return null
  }

  const error = (body as { error?: unknown }).error
  return typeof error === 'string' ? error : null
}

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function sendTaskSummaryEmail(
  payload: SendTaskSummaryPayload,
  fetcher: typeof fetch = fetch,
): Promise<ApiSuccessResponse> {
  let response: Response

  try {
    response = await fetcher('/api/send-task-summary', {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  } catch {
    throw new EmailSummaryError('No se pudo conectar con el servicio de email.')
  }

  const body = await readJsonResponse(response)

  if (!response.ok) {
    throw new EmailSummaryError(
      getApiErrorMessage(body) ?? 'No se pudo enviar el resumen de tareas.',
      response.status,
    )
  }

  const apiResponse = body as ApiResponse | null

  if (apiResponse?.ok !== true) {
    throw new EmailSummaryError('El servicio de email devolvio una respuesta inesperada.', response.status)
  }

  return apiResponse
}
