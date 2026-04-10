import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function formatMonthLabel(yearMonth) {
  const [year, month] = yearMonth.split('-')
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`
}

/**
 * Hook que obtiene contexto financiero desde monthly_summaries para el asesor IA.
 *
 * Retorna:
 * - data.month: "Abril 2026"
 * - data.monthlyIncome / monthlyExpense / savingsRate: del mes actual
 * - data.topCategories: [{name, total, percentage}] del mes actual
 * - data.historicalSummary: últimos 12 meses [{month, income, expense, savingsRate}]
 * - loading, error
 */
export function useFinancialData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchSummaries() {
      try {
        setLoading(true)
        setError(null)

        const now = new Date()
        const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        const { data: rows, error: queryError } = await supabase
          .from('monthly_summaries')
          .select('year_month, summary')
          .order('year_month', { ascending: false })

        if (queryError) {
          setError(queryError.message)
          return
        }

        // Mes actual
        const currentRow = rows?.find(r => r.year_month === currentYearMonth)
        const current = currentRow?.summary ?? {}

        const monthlyIncome = current.income ?? 0
        const monthlyExpense = current.expense ?? 0
        const monthlySavings = current.savings ?? 0
        const savingsRate = current.savingsRate ?? 0
        const topCategories = current.categories ?? []

        // Historial: todos los meses ordenados de más reciente a más antiguo,
        // excluyendo el mes actual (ya está en los campos principales)
        const historicalSummary = (rows ?? [])
          .filter(r => r.year_month !== currentYearMonth)
          .map(r => ({
            month: formatMonthLabel(r.year_month),
            income: r.summary?.income ?? 0,
            expense: r.summary?.expense ?? 0,
            savings: r.summary?.savings ?? 0,
            savingsRate: r.summary?.savingsRate ?? 0,
            categories: r.summary?.categories ?? [],
          }))

        setData({
          month: formatMonthLabel(currentYearMonth),
          monthlyIncome,
          monthlyExpense,
          monthlySavings,
          savingsRate,
          topCategories,
          historicalSummary,
          isCurrentMonth: true,
          currentDay: now.getDate(),
        })
      } catch (err) {
        setError(err.message || 'Error al cargar datos financieros')
      } finally {
        setLoading(false)
      }
    }

    fetchSummaries()
  }, [])

  return { data, loading, error }
}
