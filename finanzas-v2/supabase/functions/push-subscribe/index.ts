/**
 * Edge Function: push-subscribe
 *
 * Registra o cancela la suscripción Web Push de un dispositivo/browser.
 * Las claves VAPID y el payload de cifrado los maneja el browser — esta EF
 * solo persiste el endpoint y las claves de cifrado del cliente.
 *
 * POST body (JSON):
 *   {
 *     action:   "subscribe" | "unsubscribe",
 *     endpoint: string,   // URL del push service (FCM, Mozilla, etc.)
 *     p256dh:   string,   // clave pública del cliente (base64url)
 *     auth:     string    // auth secret del cliente (base64url)
 *   }
 *
 * Response (JSON):
 *   { success: true }
 *   o { error: string } con status apropiado
 *
 * Secrets necesarios (auto-injected por Supabase):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * IMPORTANTE: "Verify JWT with legacy secret" debe estar OFF en la config
 * de esta Edge Function (mismo patrón que financial-advisor).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

/** Valida que el endpoint sea una URL https:// segura */
function isValidEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string') return false
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ── 1. Validar JWT ────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '')

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // ── 2. Parsear y validar body ─────────────────────────────────────────
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, endpoint, p256dh, auth } = body

    if (action !== 'subscribe' && action !== 'unsubscribe') {
      return new Response(
        JSON.stringify({ error: 'action must be "subscribe" or "unsubscribe"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidEndpoint(endpoint)) {
      return new Response(
        JSON.stringify({ error: 'endpoint must be a valid https:// URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Subscribe ──────────────────────────────────────────────────────
    if (action === 'subscribe') {
      if (typeof p256dh !== 'string' || !p256dh.trim()) {
        return new Response(
          JSON.stringify({ error: 'p256dh is required for subscribe' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (typeof auth !== 'string' || !auth.trim()) {
        return new Response(
          JSON.stringify({ error: 'auth is required for subscribe' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Upsert: si el endpoint ya existe para este usuario, reactivarlo y
      // actualizar las claves (pueden cambiar si el browser rota las claves).
      const { error: upsertError } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            psub_usr_id:    userId,
            psub_endpoint:  endpoint,
            psub_p256dh:    p256dh,
            psub_auth:      auth,
            psub_is_active: true,
          },
          {
            onConflict:        'psub_usr_id,psub_endpoint',
            ignoreDuplicates:  false,
          }
        )

      if (upsertError) {
        console.error('push-subscribe upsert error:', upsertError.message)
        return new Response(
          JSON.stringify({ error: 'Failed to save subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 4. Unsubscribe ────────────────────────────────────────────────────
    // action === 'unsubscribe'
    const { error: updateError } = await supabase
      .from('push_subscriptions')
      .update({ psub_is_active: false })
      .eq('psub_usr_id', userId)
      .eq('psub_endpoint', endpoint as string)

    if (updateError) {
      console.error('push-subscribe deactivate error:', updateError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to deactivate subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('push-subscribe unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
