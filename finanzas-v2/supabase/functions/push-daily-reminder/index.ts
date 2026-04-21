/**
 * Edge Function: push-daily-reminder
 *
 * Envía una notificación Web Push a todos los usuarios con suscripciones activas.
 * Diseñada para ser llamada por un cron job externo (GitHub Actions, cron de Supabase, etc.).
 *
 * Autenticación: header "Authorization: Bearer <CRON_SECRET>"
 * — NO requiere JWT de usuario; usa SERVICE_ROLE_KEY internamente.
 *
 * Implementación VAPID: nativa con crypto.subtle (sin dependencias npm/deno.land).
 * El cifrado del payload usa AES-128-GCM + ECDH (RFC 8291 / RFC 8188).
 *
 * Response (JSON):
 *   { sent: number, failed: number, deactivated: number }
 *
 * Secrets necesarios (Supabase Dashboard → Edge Functions → Secrets):
 *   VAPID_PRIVATE_KEY        — clave privada ECDSA P-256 en formato base64url (raw, 32 bytes)
 *   VAPID_PUBLIC_KEY         — clave pública ECDSA P-256 en formato base64url (uncompressed, 65 bytes)
 *   VAPID_SUBJECT            — "mailto:tu@email.com" o URL del sitio
 *   CRON_SECRET              — secret compartido para verificar que solo el cron llama esto
 *   SUPABASE_URL             (auto-injected)
 *   SUPABASE_SERVICE_ROLE_KEY (auto-injected)
 *
 * Generar claves VAPID (en Node.js local, una sola vez):
 *   npx web-push generate-vapid-keys --json
 *   → Guardar publicKey y privateKey como secrets de Supabase.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────────────────────
// Secrets
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!  // base64url, raw 32 bytes
const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!   // base64url, uncompressed 65 bytes
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT')!       // mailto: o URL
const CRON_SECRET       = Deno.env.get('CRON_SECRET')!

// ─────────────────────────────────────────────────────────────────────────────
// Frases de recordatorio
// ─────────────────────────────────────────────────────────────────────────────

const REMINDER_PHRASES = [
  '¿Qué tal el día? No olvides anotar tus gastos 💸',
  'Tómate un momento para registrar lo que has gastado hoy',
  'Pequeños gastos, grandes diferencias. ¿Todo anotado?',
  'Tu yo del futuro te lo agradecerá: apunta los gastos de hoy',
  'Un minuto al día mantiene el presupuesto en orden',
  '¿Compraste algo hoy? Recuerda registrarlo en Finanzas',
  'El control financiero empieza con un buen registro diario',
  'Hoy es un buen día para revisar tus gastos',
  'No dejes que los gastos del día se te olviden',
  'Tu presupuesto te está esperando. ¡Solo un momento!',
  'Anota tus gastos de hoy y mantén el control',
  'Cada transacción anotada es un paso hacia tus metas',
  '¿Todo registrado? Tu plan financiero lo nota',
  'Cierra el día con tus finanzas al día',
  'Un hábito simple: anotar gastos antes de dormir',
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de codificación base64url (sin padding)
// ─────────────────────────────────────────────────────────────────────────────

function base64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64urlDecode(str: string): Uint8Array {
  // Restaurar padding
  const padded = str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(str.length + (4 - (str.length % 4)) % 4, '=')
  const binary = atob(padded)
  const bytes   = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ─────────────────────────────────────────────────────────────────────────────
// VAPID JWT (ES256) via crypto.subtle
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construye y firma un JWT VAPID con ES256 (ECDSA P-256 + SHA-256).
 * El JWT se incluye en el header Authorization de cada push request.
 */
async function buildVapidJwt(audience: string): Promise<string> {
  // Header
  const header  = base64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))

  // Payload: audience = origin del push endpoint, exp = 12h desde ahora
  const now     = Math.floor(Date.now() / 1000)
  const payload = base64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        exp: now + 43200,  // 12 horas
        sub: VAPID_SUBJECT,
      })
    )
  )

  const signingInput = `${header}.${payload}`

  // Importar clave privada ECDSA P-256 (raw 32 bytes en base64url)
  const rawPrivateKey = base64urlDecode(VAPID_PRIVATE_KEY)

  const privateKey = await crypto.subtle.importKey(
    'raw',
    rawPrivateKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  ).catch(async () => {
    // Algunos runtimes esperan PKCS8 si la clave viene en ese formato.
    // Intentar como PKCS8 si raw falla.
    return crypto.subtle.importKey(
      'pkcs8',
      rawPrivateKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    )
  })

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  )

  return `${signingInput}.${base64urlEncode(signature)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Cifrado del payload (RFC 8291 / RFC 8188 — aesgcm → aes128gcm)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cifra el payload usando ECDH + AES-128-GCM según RFC 8291.
 * Devuelve { ciphertext, salt, serverPublicKey }.
 *
 * Nota: implementamos el estándar "aes128gcm" (RFC 8291 §3) que todos los
 * browsers modernos (Chrome, Firefox, Edge, Safari) soportan.
 */
async function encryptPayload(
  payload: string,
  clientPublicKeyBase64url: string,
  authBase64url: string,
): Promise<{ body: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const encoder       = new TextEncoder()
  const payloadBytes  = encoder.encode(payload)

  // Clave pública del cliente (uncompressed P-256: 65 bytes)
  const clientPublicKeyBytes = base64urlDecode(clientPublicKeyBase64url)
  const authBytes            = base64urlDecode(authBase64url)

  // Generar par de claves efímeras del servidor (ECDH P-256)
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )

  // Exportar clave pública del servidor como uncompressed point (65 bytes)
  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  const serverPublicKey    = new Uint8Array(serverPublicKeyRaw)

  // Importar clave pública del cliente para ECDH
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derivar shared secret (ECDH)
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeyPair.privateKey,
    256
  )
  const sharedSecret = new Uint8Array(sharedSecretBits)

  // Salt aleatorio (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // ── HKDF para derivar IKM (pseudorandom key) ──────────────────────────────
  // auth_info = "WebPush: info" || 0x00 || clientPublicKey || serverPublicKey
  const authInfo = concatBytes(
    encoder.encode('WebPush: info\x00'),
    clientPublicKeyBytes,
    serverPublicKey
  )

  const sharedSecretKey = await crypto.subtle.importKey(
    'raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits']
  )

  // IKM = HKDF-Extract + Expand (auth como salt, authInfo como info, 32 bytes)
  const ikmBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: authBytes,
      info: authInfo,
    },
    sharedSecretKey,
    256
  )
  const ikm = new Uint8Array(ikmBits)

  // ── HKDF para derivar content encryption key (16 bytes) ──────────────────
  const ikmKey = await crypto.subtle.importKey(
    'raw', ikm, { name: 'HKDF' }, false, ['deriveBits']
  )

  const cekInfo  = encoder.encode('Content-Encoding: aes128gcm\x00')
  const nonceInfo = encoder.encode('Content-Encoding: nonce\x00')

  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo }, ikmKey, 128
  )
  const cek = new Uint8Array(cekBits)

  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, ikmKey, 96
  )
  const nonce = new Uint8Array(nonceBits)

  // ── AES-128-GCM cifrado ───────────────────────────────────────────────────
  const aesKey = await crypto.subtle.importKey(
    'raw', cek, { name: 'AES-GCM' }, false, ['encrypt']
  )

  // Padding: añadir byte 0x02 al final del payload (record delimiter)
  const paddedPayload = concatBytes(payloadBytes, new Uint8Array([0x02]))

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    aesKey,
    paddedPayload
  )

  // ── Construir body RFC 8291 (aes128gcm content-encoding) ─────────────────
  // Header: salt (16) + rs (4, big-endian uint32) + idlen (1) + serverPublicKey (65)
  const rs        = 4096  // record size
  const header    = new Uint8Array(16 + 4 + 1 + serverPublicKey.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, rs, false)
  header[20] = serverPublicKey.length
  header.set(serverPublicKey, 21)

  const body = concatBytes(header, new Uint8Array(ciphertextBuf))

  return { body, salt, serverPublicKey }
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, a) => acc + a.length, 0)
  const result      = new Uint8Array(totalLength)
  let offset        = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Enviar un Web Push individual
// ─────────────────────────────────────────────────────────────────────────────

interface PushSubscription {
  psub_id:        string
  psub_endpoint:  string
  psub_p256dh:    string
  psub_auth:      string
}

interface PushResult {
  status: 'sent' | 'failed' | 'gone'
  psub_id: string
  httpStatus?: number
}

async function sendPush(sub: PushSubscription, payloadJson: string): Promise<PushResult> {
  try {
    const url      = new URL(sub.psub_endpoint)
    const audience = `${url.protocol}//${url.host}`

    const vapidJwt = await buildVapidJwt(audience)

    const { body } = await encryptPayload(payloadJson, sub.psub_p256dh, sub.psub_auth)

    const res = await fetch(sub.psub_endpoint, {
      method:  'POST',
      headers: {
        'Content-Type':     'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL':              '86400',
        'Authorization':    `vapid t=${vapidJwt},k=${VAPID_PUBLIC_KEY}`,
      },
      body,
    })

    if (res.status === 410 || res.status === 404) {
      return { status: 'gone', psub_id: sub.psub_id, httpStatus: res.status }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`push-daily-reminder: push failed [${res.status}] ${text}`)
      return { status: 'failed', psub_id: sub.psub_id, httpStatus: res.status }
    }

    return { status: 'sent', psub_id: sub.psub_id, httpStatus: res.status }
  } catch (err) {
    console.error(`push-daily-reminder: error sending to ${sub.psub_id}:`, err)
    return { status: 'failed', psub_id: sub.psub_id }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler principal
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // ── 1. Verificar CRON_SECRET (comparación timing-safe) ───────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  const cronToken  = authHeader.replace('Bearer ', '').trim()

  const encoder    = new TextEncoder()
  const tokenBytes  = encoder.encode(cronToken)
  const secretBytes = encoder.encode(CRON_SECRET)
  const lengthsMatch = tokenBytes.length === secretBytes.length

  // Comparar byte a byte siempre (sin short-circuit) para evitar timing leaks
  let equal = lengthsMatch
  const compareLen = Math.max(tokenBytes.length, secretBytes.length)
  const paddedToken  = new Uint8Array(compareLen)
  const paddedSecret = new Uint8Array(compareLen)
  paddedToken.set(tokenBytes)
  paddedSecret.set(secretBytes)
  for (let i = 0; i < compareLen; i++) {
    if (paddedToken[i] !== paddedSecret[i]) equal = false
  }

  if (!cronToken || !equal) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ── 2. Leer suscripciones activas ─────────────────────────────────────
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('psub_id, psub_endpoint, psub_p256dh, psub_auth')
      .eq('psub_is_active', true)

    if (fetchError) {
      console.error('push-daily-reminder: fetch subscriptions error:', fetchError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, deactivated: 0, message: 'No active subscriptions' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Elegir frase aleatoria ─────────────────────────────────────────
    const phrase  = REMINDER_PHRASES[Math.floor(Math.random() * REMINDER_PHRASES.length)]
    const payload = JSON.stringify({
      title:     'Finanzas',
      body:      phrase,
      icon:      '/icon-192.png',
      badge:     '/icon-192.png',
      tag:       'daily-reminder',
      renotify:  false,
    })

    // ── 4. Enviar push a cada suscripción (en paralelo, máx 10 concurrentes)
    const results: PushResult[] = []
    const BATCH_SIZE = 10

    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      const batch        = subscriptions.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(batch.map((sub) => sendPush(sub, payload)))
      results.push(...batchResults)
    }

    // ── 5. Desactivar suscripciones con endpoint muerto (HTTP 410/404) ─────
    const goneIds = results
      .filter((r) => r.status === 'gone')
      .map((r) => r.psub_id)

    if (goneIds.length > 0) {
      const { error: deactivateError } = await supabase
        .from('push_subscriptions')
        .update({ psub_is_active: false })
        .in('psub_id', goneIds)

      if (deactivateError) {
        console.error('push-daily-reminder: deactivate error:', deactivateError.message)
      }
    }

    // ── 6. Respuesta ──────────────────────────────────────────────────────
    const sent        = results.filter((r) => r.status === 'sent').length
    const failed      = results.filter((r) => r.status === 'failed').length
    const deactivated = goneIds.length

    console.log(`push-daily-reminder: sent=${sent} failed=${failed} deactivated=${deactivated}`)

    return new Response(
      JSON.stringify({ sent, failed, deactivated }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('push-daily-reminder: unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
