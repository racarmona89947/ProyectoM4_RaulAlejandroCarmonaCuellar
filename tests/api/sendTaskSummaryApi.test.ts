import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../../api/send-task-summary'

const sesMocks = vi.hoisted(() => ({
  SendEmailCommand: vi.fn(),
  SESClient: vi.fn(),
  send: vi.fn(),
}))

vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn().mockImplementation(function (this: { send: unknown }, config: unknown) {
    sesMocks.SESClient(config)
    this.send = sesMocks.send
  }),
  SendEmailCommand: vi.fn().mockImplementation(function (this: { input: unknown }, input: unknown) {
    sesMocks.SendEmailCommand(input)
    this.input = input
  }),
}))

const originalEnv = process.env

function setAwsEnv() {
  process.env.AWS_REGION = 'us-east-1'
  process.env.AWS_ACCESS_KEY_ID = 'testing-key'
  process.env.AWS_SECRET_ACCESS_KEY = 'testing-secret'
  process.env.AWS_SES_FROM_EMAIL = 'noreply@example.com'
}

function validPayload() {
  return {
    recipientEmail: 'user@example.com',
    tasks: [
      {
        title: 'Preparar demo',
        description: 'Verificar endpoint',
        completed: false,
        priority: 'high',
        dueDate: '2026-09-10',
      },
    ],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env = { ...originalEnv }

  delete process.env.AWS_REGION
  delete process.env.AWS_ACCESS_KEY_ID
  delete process.env.AWS_SECRET_ACCESS_KEY
  delete process.env.AWS_SES_FROM_EMAIL

  sesMocks.send.mockResolvedValue({})
})

afterAll(() => {
  process.env = originalEnv
})

describe('api/send-task-summary', () => {
  it('rechaza metodo distinto a POST', async () => {
    const response = await handler(new Request('http://localhost/api/send-task-summary', { method: 'GET' }))

    const body = (await response.json()) as { ok: boolean; error: string }

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('POST')
    expect(body).toEqual({
      ok: false,
      error: 'Metodo no permitido.',
    })
  })

  it('valida payload invalido', async () => {
    setAwsEnv()

    const response = await handler(
      new Request('http://localhost/api/send-task-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: 'bad-email', tasks: [] }),
      }),
    )

    const body = (await response.json()) as { ok: boolean; error: string }

    expect(response.status).toBe(400)
    expect(body.ok).toBe(false)
  })

  it('devuelve 500 cuando faltan variables de entorno', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await handler(
      new Request('http://localhost/api/send-task-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload()),
      }),
    )

    const body = (await response.json()) as { ok: boolean; error: string }

    expect(response.status).toBe(500)
    expect(body).toEqual({
      ok: false,
      error: 'El servicio de email no esta configurado.',
    })

    consoleSpy.mockRestore()
  })

  it('devuelve 502 cuando AWS SES falla', async () => {
    setAwsEnv()
    sesMocks.send.mockRejectedValueOnce(new Error('SES failed'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await handler(
      new Request('http://localhost/api/send-task-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload()),
      }),
    )

    const body = (await response.json()) as { ok: boolean; error: string }

    expect(response.status).toBe(502)
    expect(body).toEqual({
      ok: false,
      error: 'AWS SES no pudo enviar el email.',
    })

    consoleSpy.mockRestore()
  })

  it('envia resumen correctamente cuando SES responde ok', async () => {
    setAwsEnv()

    const response = await handler(
      new Request('http://localhost/api/send-task-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload()),
      }),
    )

    const body = (await response.json()) as { ok: boolean; message: string }

    expect(response.status).toBe(200)
    expect(body).toEqual({
      ok: true,
      message: 'Resumen enviado correctamente.',
    })
    expect(sesMocks.SESClient).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'us-east-1',
      }),
    )
    expect(sesMocks.send).toHaveBeenCalledTimes(1)
  })
})
