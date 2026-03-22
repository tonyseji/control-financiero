import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper: devuelve el user_id del usuario autenticado.
// Usar en services para inyectar el campo usr_id en cada INSERT.
// NUNCA confiar en que el cliente envíe su propio user_id (OWASP API3).
export async function getAuthUserId() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('No hay sesión activa')
  return user.id
}
