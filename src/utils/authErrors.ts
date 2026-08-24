const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Este correo ya esta registrado.',
  'auth/invalid-credential': 'Correo o contrasena incorrectos.',
  'auth/invalid-email': 'Ingresa un correo valido.',
  'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisa tu conexion.',
  'auth/popup-closed-by-user': 'Se cerro la ventana de Google antes de completar el ingreso.',
  'auth/too-many-requests': 'Demasiados intentos. Intenta nuevamente en unos minutos.',
  'auth/user-not-found': 'No existe una cuenta con este correo.',
  'auth/weak-password': 'La contrasena debe tener al menos 6 caracteres.',
  'auth/wrong-password': 'Correo o contrasena incorrectos.',
}

function hasFirebaseCode(error: unknown): error is { code: string } {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false
  }

  const code = (error as { code?: unknown }).code
  return typeof code === 'string'
}

export function mapAuthError(error: unknown): string {
  if (hasFirebaseCode(error)) {
    return AUTH_ERROR_MESSAGES[error.code] ?? 'No se pudo completar la autenticacion.'
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return 'Ocurrio un error inesperado de autenticacion.'
}
