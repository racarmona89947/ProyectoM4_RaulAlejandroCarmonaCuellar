import { describe, expect, it, vi } from 'vitest'
import { EmailSummaryError, sendTaskSummaryEmail } from '../../src/services/emailService'
import type { SendTaskSummaryPayload } from '../../src/types/email'

const payload: SendTaskSummaryPayload = {
  recipientEmail: 'user@example.com',
  tasks: [
    {
      title: 'Preparar demo',
      description: 'Validar CRUD',
      completed: false,
      priority: 'high',
      dueDate: '2026-08-25',
    },
  ],
}

describe('sendTaskSummaryEmail', () => {
  it('envia el payload a la Vercel Function', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, message: 'Resumen enviado correctamente.' }), {
        status: 200,
      }),
    )

    await expect(sendTaskSummaryEmail(payload, fetcher)).resolves.toEqual({
      ok: true,
      message: 'Resumen enviado correctamente.',
    })
    expect(fetcher).toHaveBeenCalledWith(
      '/api/send-task-summary',
      expect.objectContaining({
        body: JSON.stringify(payload),
        method: 'POST',
      }),
    )
  })

  it('propaga errores funcionales del endpoint', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: 'Payload invalido.' }), {
        status: 400,
      }),
    )

    await expect(sendTaskSummaryEmail(payload, fetcher)).rejects.toMatchObject({
      message: 'Payload invalido.',
      status: 400,
    } satisfies Partial<EmailSummaryError>)
  })

  it('maneja error de red', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('network down')
    })

    await expect(sendTaskSummaryEmail(payload, fetcher)).rejects.toThrow(
      'No se pudo conectar con el servicio de email.',
    )
  })
})
