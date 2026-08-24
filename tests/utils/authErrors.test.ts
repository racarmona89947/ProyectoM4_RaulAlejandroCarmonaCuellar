import { describe, expect, it } from 'vitest'
import { mapAuthError } from '../../src/utils/authErrors'

describe('mapAuthError', () => {
  it('traduce codigos comunes de Firebase', () => {
    expect(mapAuthError({ code: 'auth/email-already-in-use' })).toBe('Este correo ya esta registrado.')
    expect(mapAuthError({ code: 'auth/invalid-credential' })).toBe('Correo o contrasena incorrectos.')
  })

  it('devuelve un mensaje seguro para errores desconocidos', () => {
    expect(mapAuthError({ code: 'auth/desconocido' })).toBe('No se pudo completar la autenticacion.')
  })
})
