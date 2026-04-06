/**
 * Edge Function: receipt-ocr
 *
 * Recibe una imagen de ticket (base64 o URL), la envía a Claude Vision,
 * y devuelve los datos extraídos: importe, comercio, fecha, notas.
 *
 * POST body (JSON):
 *   { imageBase64: string, mimeType: string }  — imagen desde cámara/galería
 *   { imageUrl: string }                        — imagen ya subida a Storage
 *
 * Response (JSON):
 *   { amount: number|null, merchant: string|null, date: string|null, notes: string|null }
 *
 * Secrets necesarios (Supabase Dashboard → Edge Functions → Secrets):
 *   ANTHROPIC_API_KEY  — clave de la API de Anthropic
 *   SUPABASE_SERVICE_ROLE_KEY — para verificar que la llamada viene autenticada
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY   = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const SYSTEM_PROMPT = `Eres un asistente especializado en leer tickets y facturas.
Extrae la información del ticket y responde ÚNICAMENTE con un JSON válido, sin texto adicional.
El JSON debe tener exactamente estos campos:
{
  "amount": número (importe total con IVA, sin símbolo de moneda, ej: 12.50),
  "merchant": string (nombre del comercio o establecimiento, null si no se ve),
  "date": string (fecha en formato YYYY-MM-DD, null si no se ve),
  "notes": string (descripción breve del ticket: qué se compró, máx 100 chars, null si no aplica)
}
Si un campo no está visible o no se puede determinar con certeza, usa null.`

Deno.serve(async (req: Request) => {
  // CORS para peticiones desde el frontend
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
      },
    })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  // Verificar que el usuario está autenticado
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse('No autenticado', 401)
  }

  const jwt = authHeader.replace('Bearer ', '')
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)

  if (authError || !user) {
    return errorResponse('Token inválido', 401)
  }

  // Parsear el body
  let body: { imageBase64?: string; mimeType?: string; imageUrl?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Body inválido', 400)
  }

  // Construir el bloque de imagen para la API de Claude
  let imageBlock: Record<string, unknown>

  if (body.imageBase64 && body.mimeType) {
    // Imagen enviada como base64 desde el frontend
    const validMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validMimes.includes(body.mimeType)) {
      return errorResponse('Tipo de imagen no soportado', 400)
    }
    imageBlock = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: body.mimeType,
        data: body.imageBase64,
      },
    }
  } else if (body.imageUrl) {
    // Imagen en Supabase Storage — usar URL
    imageBlock = {
      type: 'image',
      source: {
        type: 'url',
        url: body.imageUrl,
      },
    }
  } else {
    return errorResponse('Se requiere imageBase64+mimeType o imageUrl', 400)
  }

  // Llamada a Claude Vision
  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              imageBlock,
              { type: 'text', text: 'Extrae los datos de este ticket.' },
            ],
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('Claude API error:', errText)
      return errorResponse('Error al procesar la imagen con IA', 502)
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData?.content?.[0]?.text ?? ''

    // Parsear el JSON de la respuesta
    let extracted: {
      amount: number | null
      merchant: string | null
      date: string | null
      notes: string | null
    }

    try {
      // Limpiar posibles backticks o prefijos de markdown
      const clean = rawText.replace(/```json\n?|\n?```/g, '').trim()
      extracted = JSON.parse(clean)
    } catch {
      console.error('Error parsing Claude response:', rawText)
      return errorResponse('No se pudo interpretar la respuesta de la IA', 502)
    }

    // Sanitizar y validar los valores
    const result = {
      amount:   typeof extracted.amount === 'number' && extracted.amount > 0
                  ? Math.round(extracted.amount * 100) / 100
                  : null,
      merchant: typeof extracted.merchant === 'string' && extracted.merchant.trim()
                  ? extracted.merchant.trim().slice(0, 100)
                  : null,
      date:     typeof extracted.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(extracted.date)
                  ? extracted.date
                  : null,
      notes:    typeof extracted.notes === 'string' && extracted.notes.trim()
                  ? extracted.notes.trim().slice(0, 100)
                  : null,
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
      },
    })

  } catch (err) {
    console.error('receipt-ocr unexpected error:', err)
    return errorResponse('Error interno del servidor', 500)
  }
})

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}