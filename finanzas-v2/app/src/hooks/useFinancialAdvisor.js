import { useState, useCallback, useEffect } from 'react'
import { getAdvisorResponse } from '../services/advisor'
import { supabase } from '../services/supabase'

const DAILY_LIMIT = 5

export function useFinancialAdvisor() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [remainingCalls, setRemainingCalls] = useState(DAILY_LIMIT)

  useEffect(() => {
    async function fetchRemainingCalls() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const today = new Date().toISOString().split('T')[0]
        const { data, error: queryError } = await supabase
          .from('advisor_calls')
          .select('call_count')
          .eq('user_id', user.id)
          .eq('call_date', today)
          .maybeSingle()

        if (queryError) return // fallback: keep default 5

        // Check admin role for unlimited bypass
        const { data: profileData } = await supabase
          .from('profiles')
          .select('prof_role')
          .eq('prof_id', user.id)
          .maybeSingle()

        if (profileData?.prof_role === 'admin') {
          setRemainingCalls(-1) // -1 = unlimited
          return
        }

        const count = data?.call_count ?? 0
        setRemainingCalls(Math.max(0, DAILY_LIMIT - count))
      } catch {
        // fallback: keep default 5
      }
    }

    fetchRemainingCalls()
  }, [])

  const sendQuestion = useCallback(async (question, isPersonal = true, context = {}) => {
    setLoading(true)
    setError(null)

    try {
      const result = await getAdvisorResponse(question, isPersonal, context, messages)

      if (result.error) {
        setError(result.message || result.error)
        if (typeof result.remainingCalls === 'number') {
          setRemainingCalls(result.remainingCalls === -1 ? -1 : Math.max(0, result.remainingCalls))
        }
        return
      }

      setMessages(prev => [
        ...prev,
        { role: 'user', content: question, timestamp: new Date() },
        { role: 'assistant', content: result.response, timestamp: new Date() },
      ])

      if (typeof result.remainingCalls === 'number') {
        setRemainingCalls(result.remainingCalls === -1 ? -1 : Math.max(0, result.remainingCalls))
      }
    } catch (err) {
      setError(err.message || 'Error al conectar con el asesor')
    } finally {
      setLoading(false)
    }
  }, [messages])

  return { messages, loading, error, remainingCalls, sendQuestion }
}
