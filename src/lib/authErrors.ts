import type {SummaryLanguage} from '@/types'

// Supabase devuelve los mensajes de error de Auth en ingles; el resto de la
// UI es bilingue (ver CLAUDE.md), asi que traducimos los casos mas comunes
// en vez de mostrarlos crudos. Mensajes dinamicos (p. ej. rate-limit con un
// numero de segundos variable) no matchean y caen al fallback en ingles.
const KNOWN_ERRORS: Record<string, Record<SummaryLanguage, string>> = {
  'Invalid login credentials': {
    es: 'Correo o contraseña incorrectos.',
    en: 'Incorrect email or password.',
  },
  'User already registered': {
    es: 'Ya existe una cuenta con ese correo.',
    en: 'An account with that email already exists.',
  },
  'Email not confirmed': {
    es: 'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.',
    en: "You haven't confirmed your email yet. Check your inbox.",
  },
  'Password should be at least 6 characters': {
    es: 'La contraseña debe tener al menos 6 caracteres.',
    en: 'Password should be at least 6 characters.',
  },
  'Unable to validate email address: invalid format': {
    es: 'El formato del correo no es válido.',
    en: 'The email format is invalid.',
  },
  'Failed to fetch': {
    es: 'No se pudo conectar con Supabase. Revisá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu .env.local.',
    en: 'Could not connect to Supabase. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local.',
  },
  'New password should be different from the old password.': {
    es: 'La nueva contraseña debe ser distinta de la anterior.',
    en: 'The new password must be different from the old one.',
  },
  'Auth session missing!': {
    es: 'Tu sesión de recuperación expiró. Pedí un nuevo enlace.',
    en: 'Your recovery session expired. Request a new link.',
  },
}

export function translateAuthError(
  message: string,
  language: SummaryLanguage
): string {
  return KNOWN_ERRORS[message]?.[language] ?? message
}
