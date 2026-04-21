// Vercel Serverless Function — ejecutada por el cron job a las 22:30 (Europa/Madrid)
// Llama a la Edge Function push-daily-reminder de Supabase.
//
// Variables de entorno necesarias en Vercel Dashboard → Settings → Environment Variables:
//   SUPABASE_URL      — https://fuuvsfkxyppjrtrqyzdy.supabase.co
//   CRON_SECRET       — el mismo valor que el secret de Supabase

export default async function handler(req, res) {
  // Vercel solo ejecuta el cron con método GET, pero también aceptamos POST
  // para poder probarlo manualmente desde el dashboard.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const cronSecret  = process.env.CRON_SECRET

  if (!supabaseUrl || !cronSecret) {
    console.error('push-reminder: missing env vars SUPABASE_URL or CRON_SECRET')
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/push-daily-reminder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cronSecret}`,
        },
        body: '{}',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('push-reminder: EF error', response.status, data)
      return res.status(502).json({ error: 'Upstream error', detail: data })
    }

    console.log('push-reminder: ok', data)
    return res.status(200).json(data)
  } catch (err) {
    console.error('push-reminder: fetch error', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
