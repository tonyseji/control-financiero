/**
 * Edge Function: financial-advisor
 *
 * Receives a question from the user (personal or general), builds a prompt
 * with optional financial context, calls Claude, and returns the response.
 * Rate limited to 5 calls/day per user via the advisor_calls table.
 *
 * POST body (JSON):
 *   { question: string, isPersonal: boolean, context: object }
 *
 * Response (JSON):
 *   { response: string, remainingCalls: number }
 *   or { error: string, message: string, remainingCalls: number } with status 4xx
 *
 * Secrets needed (Supabase Dashboard → Edge Functions → Secrets):
 *   ANTHROPIC_API_KEY
 *   SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
 *   SUPABASE_URL               (auto-injected)
 *
 * IMPORTANT: "Verify JWT with legacy secret" must be OFF in Edge Function settings.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const DAILY_LIMIT = 5
const MAX_QUESTION_LENGTH = 500
const MAX_CATEGORY_NAME_LENGTH = 50

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function sanitizeString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return ''
  return val.replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLen)
}

function sanitizeNumber(val: unknown): number | null {
  const n = Number(val)
  return isFinite(n) ? Math.round(n * 100) / 100 : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

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

    // 1b. Check if user is admin (admins bypass rate limiting)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('prof_role')
      .eq('prof_id', userId)
      .maybeSingle()

    const isAdmin = profileData?.prof_role === 'admin'

    // 2. Parse and validate body
    const body = await req.json()
    const { question, isPersonal, context, history } = body

    if (!question || typeof question !== 'string' || !question.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing question' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (question.trim().length > MAX_QUESTION_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Question too long', max: MAX_QUESTION_LENGTH }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Rate limiting — skip entirely for admins
    const today = new Date().toISOString().split('T')[0]

    if (!isAdmin) {
      // Atomic rate-limit increment via upsert.
      // Insert or increment in one statement — no TOCTOU race.
      // Uses the UNIQUE(user_id, call_date) constraint for conflict resolution.
      const { data: upserted, error: upsertErr } = await supabase.rpc('increment_advisor_call', {
        p_user_id: userId,
        p_date: today,
        p_limit: DAILY_LIMIT,
      })

      if (upsertErr) {
        // Fallback: if the RPC doesn't exist yet (first deploy), use raw SQL via service role
        console.error('RPC error, using fallback:', upsertErr.message)

        // Fallback: check then upsert (acceptable on staging with single user)
        const { data: existing } = await supabase
          .from('advisor_calls')
          .select('call_count')
          .eq('user_id', userId)
          .eq('call_date', today)
          .maybeSingle()

        if (existing && existing.call_count >= DAILY_LIMIT) {
          return new Response(
            JSON.stringify({
              error: 'Daily limit exceeded',
              remainingCalls: 0,
              message: 'Has alcanzado el límite de 5 consultas diarias. Vuelve mañana.',
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Upsert counter
        const newCount = existing ? existing.call_count + 1 : 1
        if (existing) {
          await supabase
            .from('advisor_calls')
            .update({ call_count: newCount, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('call_date', today)
        } else {
          await supabase
            .from('advisor_calls')
            .insert([{ user_id: userId, call_date: today, call_count: 1 }])
        }
      } else {
        // RPC returned new count; check if limit was already hit before increment
        if (upserted === null || upserted > DAILY_LIMIT) {
          return new Response(
            JSON.stringify({
              error: 'Daily limit exceeded',
              remainingCalls: 0,
              message: 'Has alcanzado el límite de 5 consultas diarias. Vuelve mañana.',
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    } // end rate-limit block (non-admins only)

    // 4. Build prompt — sanitize all client-supplied context to prevent prompt injection
    const safeHistory = Array.isArray(history) ? history.slice(-10) : []
    const sanitizedHistory = safeHistory
      .filter((m: unknown) => {
        if (typeof m !== 'object' || m === null) return false
        const msg = m as Record<string, unknown>
        return msg.role === 'user' || msg.role === 'assistant'
      })
      .map((m: unknown) => {
        const msg = m as Record<string, unknown>
        return {
          role: msg.role as 'user' | 'assistant',
          content: sanitizeString(msg.content, 1000),
        }
      })
      .filter((m: { role: 'user' | 'assistant'; content: string }) => m.content.length > 0)


    let systemPrompt = `Eres un asesor financiero personal, amigable y directo.
Responde de forma concisa (2-3 líneas máximo), accionable y con tono conversacional.
Usa emojis ocasionalmente. Idioma: español.`

    if (isPersonal && context && typeof context === 'object') {
      const month = sanitizeString(context.month, 20)
      const monthlyIncome = sanitizeNumber(context.monthlyIncome)
      const monthlyExpense = sanitizeNumber(context.monthlyExpense)
      const monthlySavings = sanitizeNumber(context.monthlySavings)
      const savingsRate = sanitizeNumber(context.savingsRate)
      const topCategories = Array.isArray(context.topCategories)
        ? context.topCategories.slice(0, 10).map((c: unknown) => {
            if (typeof c !== 'object' || c === null) return null
            const cat = c as Record<string, unknown>
            return {
              name: sanitizeString(cat.name, MAX_CATEGORY_NAME_LENGTH),
              total: sanitizeNumber(cat.total),
              percentage: sanitizeNumber(cat.percentage),
            }
          }).filter(Boolean)
        : []

      const isCurrentMonth = context.isCurrentMonth === true
      const currentDay = typeof context.currentDay === 'number' && context.currentDay >= 1 && context.currentDay <= 31
        ? context.currentDay
        : null

      const hasContext = topCategories.length > 0 || monthlyIncome != null || monthlyExpense != null
      const historicalSummary = Array.isArray(context.historicalSummary)
        ? context.historicalSummary.slice(0, 24).map((m: unknown) => {
            if (typeof m !== 'object' || m === null) return null
            const month_data = m as Record<string, unknown>
            const cats = Array.isArray(month_data.categories)
              ? month_data.categories.slice(0, 5).map((c: unknown) => {
                  if (typeof c !== 'object' || c === null) return null
                  const cat = c as Record<string, unknown>
                  return {
                    name: sanitizeString(cat.name, MAX_CATEGORY_NAME_LENGTH),
                    total: sanitizeNumber(cat.total),
                  }
                }).filter(Boolean)
              : []
            return {
              month: sanitizeString(month_data.month, 30),
              income: sanitizeNumber(month_data.income),
              expense: sanitizeNumber(month_data.expense),
              savings: sanitizeNumber(month_data.savings),
              savingsRate: sanitizeNumber(month_data.savingsRate),
              categories: cats,
            }
          }).filter(Boolean)
        : []

      if (hasContext) {
        systemPrompt += `\n\nDatos del usuario${month ? ` (mes actual: ${month})` : ''}:`
        if (isCurrentMonth && currentDay) {
          systemPrompt += `\n(Mes en curso — datos parciales al día ${currentDay}/31. El ahorro aumentará conforme avance el mes.)`
        }

        for (const c of topCategories) {
          if (c && c.name) {
            systemPrompt += `\n- ${c.name}: €${c.total ?? '?'} (${c.percentage ?? '?'}%)`
          }
        }

        if (monthlyIncome != null) systemPrompt += `\nIngresos: €${monthlyIncome}`
        if (monthlyExpense != null) systemPrompt += `\nGastos reales: €${monthlyExpense}`
        if (monthlySavings != null) systemPrompt += `\nAhorro/Inversión: €${monthlySavings}`
        if (savingsRate != null) systemPrompt += `\nTasa ahorro: ${savingsRate}%`
      }

      // Add historical context if available
      if (historicalSummary.length > 0) {
        systemPrompt += `\n\nHistórico (meses anteriores, más recientes primero):`
        for (const h of historicalSummary) {
          if (!h) continue
          systemPrompt += `\n- ${h.month}: Ingresos €${h.income ?? '?'}, Gastos €${h.expense ?? '?'}, Ahorro €${h.savings ?? '?'} (${h.savingsRate ?? '?'}%)`
          if (h.categories && h.categories.length > 0) {
            const catList = h.categories.map((c: { name: string; total: number | null }) => `${c.name} €${c.total ?? '?'}`).join(', ')
            systemPrompt += ` [${catList}]`
          }
        }
      }
    }

    // 5. Call Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
        messages: [
          ...sanitizedHistory,
          { role: 'user', content: question.trim() },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('Claude API error:', claudeRes.status, errText)
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const claudeData = await claudeRes.json()
    const assistantMessage =
      claudeData.content?.[0]?.type === 'text'
        ? claudeData.content[0].text
        : 'No pude procesar tu pregunta.'

    // 6. Calculate remaining calls
    // Admins get -1 (sentinel for unlimited). Non-admins re-read counter for accuracy.
    let remainingCalls: number
    if (isAdmin) {
      remainingCalls = -1
    } else {
      const { data: current } = await supabase
        .from('advisor_calls')
        .select('call_count')
        .eq('user_id', userId)
        .eq('call_date', today)
        .maybeSingle()
      remainingCalls = Math.max(0, DAILY_LIMIT - (current?.call_count ?? DAILY_LIMIT))
    }

    return new Response(
      JSON.stringify({ response: assistantMessage, remainingCalls }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
