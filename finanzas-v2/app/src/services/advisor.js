import { supabase } from './supabase'

export async function getAdvisorResponse(question, isPersonal = true, context = {}, messages = []) {
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('No authenticated')
    }

    const history = messages.flatMap(m => [{ role: m.role, content: m.content }])

    const response = await fetch(
      import.meta.env.VITE_SUPABASE_URL + '/functions/v1/financial-advisor',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, isPersonal, context, history }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        error: data.error || 'Unknown error',
        message: data.message || 'Error al conectar con el asesor',
        remainingCalls: data.remainingCalls ?? 0,
      }
    }

    return {
      response: data.response,
      remainingCalls: data.remainingCalls,
    }
  } catch (error) {
    return {
      error: error.message,
      message: 'Error al conectar con el asesor',
      remainingCalls: 0,
    }
  }
}
