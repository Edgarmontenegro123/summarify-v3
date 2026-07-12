import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan las variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.local y completa tus credenciales de Supabase (ver sección 'Supabase Setup' del README)."
  );
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
});
