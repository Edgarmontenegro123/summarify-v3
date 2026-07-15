// Supabase devuelve los mensajes de error de Auth en ingles; el resto de la
// UI esta en espanol (ver CLAUDE.md de V1), asi que traducimos los casos
// mas comunes en vez de mostrarlos crudos.
const KNOWN_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'User already registered': 'Ya existe una cuenta con ese correo.',
  'Email not confirmed':
    'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.',
  'Password should be at least 6 characters':
    'La contraseña debe tener al menos 6 caracteres.',
  'Unable to validate email address: invalid format':
    'El formato del correo no es válido.',
  'Failed to fetch':
    'No se pudo conectar con Supabase. Revisá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu .env.local.',
}

export function translateAuthError(message: string): string {
  return KNOWN_ERRORS[message] ?? message
}
