/**
 * Supabase Auth Hook — "beforeSignIn" / "customAccessToken"
 *
 * Se ejecuta ANTES de que Supabase emita el JWT.
 * Si devuelve un error, el login se cancela y el usuario no obtiene sesión.
 *
 * Registrar en Supabase Dashboard:
 *   Authentication → Hooks → "Before sign in" → URL de esta Edge Function
 *
 * Cubre la capa 0 de seguridad en staging:
 *   - Bloquea cualquier login de usuarios que no sean admin
 *   - Opera antes de que exista JWT — imposible de bypassear desde el cliente
 *
 * Variables de entorno necesarias (Supabase Dashboard → Edge Functions → Secrets):
 *   APP_ENV          = "staging" | "production"
 *   SUPABASE_URL     = URL del proyecto (inyectada automáticamente por Supabase)
 *   SUPABASE_SERVICE_ROLE_KEY = service role key (acceso sin RLS para leer profiles)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_ENV = Deno.env.get('APP_ENV') ?? 'production'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Cliente con service role — bypasea RLS para poder leer profiles sin sesión activa
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req: Request) => {
  // Supabase envía el evento de auth como POST con JSON
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verificar que la llamada viene de Supabase (header de autenticación del hook)
  const authHeader = req.headers.get('authorization')
  if (!authHeader || authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const body = await req.json()
    const userId: string = body?.user?.id

    if (!userId) {
      return errorResponse('No se pudo identificar el usuario.')
    }

    // En producción: acceso libre — no bloquear nada
    if (APP_ENV !== 'staging') {
      return allowResponse()
    }

    // ── STAGING: solo admins activos ─────────────────────────────────────────
    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('prof_role, prof_is_active')
      .eq('prof_id', userId)
      .maybeSingle()

    // Usuario nuevo (aún sin perfil): el trigger handle_new_user lo bloqueará.
    // Aquí también lo bloqueamos antes de que llegue al trigger.
    if (error || !profile) {
      // Permitir solo si no hay ningún admin aún (primer registro)
      const { count } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (count === 0) return allowResponse() // primer usuario → dejar pasar al trigger

      return errorResponse('Registro desactivado en entorno de staging.')
    }

    // Perfil existente: solo admin activo puede entrar
    if (profile.prof_role !== 'admin' || profile.prof_is_active !== true) {
      return errorResponse('Acceso restringido. Solo administradores en staging.')
    }

    return allowResponse()

  } catch (err) {
    console.error('Auth hook error:', err)
    return errorResponse('Error interno en validación de acceso.')
  }
})

// Supabase espera { decision: 'continue' } para permitir o un error para bloquear
function allowResponse() {
  return new Response(JSON.stringify({ decision: 'continue' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string) {
  return new Response(
    JSON.stringify({ error: { message, http_status_code: 403 } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
    // Nota: Supabase Auth Hooks siempre esperan HTTP 200 — el error va en el body
  )
}
