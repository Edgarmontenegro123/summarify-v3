import {createClient} from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan las variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.local y completa tus credenciales de Supabase (ver sección 'Supabase Setup' del README)."
  )
}

// Si el link de recuperacion de contraseña se abre en un navegador que ya
// tenia una sesion guardada, esa sesion vieja puede ganarle a los tokens de
// recuperacion de la URL durante la inicializacion del cliente (createClient
// arranca esa carrera antes de que cualquier componente de React llegue a
// montarse, asi que limpiarla desde un useEffect llega tarde). Se borra el
// storage local ahora, de forma sincronica, para que no quede nada con lo
// que competir.
if (
  typeof window !== 'undefined' &&
  window.location.hash.includes('type=recovery')
) {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith('sb-') && key.endsWith('-auth-token'))
    .forEach((key) => window.localStorage.removeItem(key))
}

// persistSession + autoRefreshToken: la sesion de Auth sobrevive a recargas
// de pagina y el access token se renueva solo antes de expirar. Se dejan
// explicitos porque el modulo de Auth (login/registro) los depende.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
