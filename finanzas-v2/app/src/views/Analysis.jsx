import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { useDemoData } from '../hooks/useDemoData'
import { formatCurrency } from '../utils/formatters'
import { isTransfer, isSaving, isInvestment, isRealExpense, isIncome } from '../utils/txClassifier'

const PERIODS = [
  { key: '6m',  label: '6 meses' },
  { key: 'year', label: 'Este año' },
  { key: 'all',  label: 'Todo' },
]

const DONUT_COLORS = ['#3b82f6','#16a34a','#9333ea','#0891b2','#d97706','#dc2626','#ec4899','#14b8a6']

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DAY_LABELS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function periodRange(key) {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  if (key === '6m') {
    const d = new Date(now); d.setMonth(d.getMonth() - 5); d.setDate(1)
    return { from: d.toISOString().slice(0,10), to: null }
  }
  if (key === 'year') {
    return { from: `${year}-01-01`, to: `${year}-12-31` }
  }
  return { from: null, to: null }
}

function fmtAmt(v) {
  if (v >= 1000) return `${(v/1000).toFixed(1)}k`
  return String(Math.round(v))
}

const GRAN_OPTIONS = [
  { key: 'dow',     label: 'Día sem.' },
  { key: 'weekly',  label: 'Semanal'  },
  { key: 'monthly', label: 'Mensual'  },
]

const GRAN_TITLES = {
  dow:     'Gasto por día de la semana',
  weekly:  'Gasto semanal',
  monthly: 'Gasto mensual',
}

// Número de semana ISO (Lun=inicio)
function isoWeekKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() === 0 ? 7 : d.getDay() // 1=Lun…7=Dom
  const thu = new Date(d); thu.setDate(d.getDate() + (4 - day))
  const jan1 = new Date(thu.getFullYear(), 0, 1)
  const week = Math.ceil(((thu - jan1) / 86400000 + 1) / 7)
  return `${thu.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function weekLabel(key) {
  // key = "2026-W05" → "Sem 5 2026" (año solo si distinto al actual)
  const [y, w] = key.split('-W')
  const now = new Date()
  return parseInt(y) !== now.getFullYear()
    ? `S${w} '${y.slice(2)}`
    : `Sem ${parseInt(w)}`
}

function buildGranData(transactions, granularity) {
  if (granularity === 'dow') {
    const order = [1, 2, 3, 4, 5, 6, 0]
    const days  = Array.from({ length: 7 }, (_, i) => ({ label: DAY_LABELS[order[i]], expenses: 0 }))
    for (const tx of transactions) {
      if (!isRealExpense(tx)) continue
      const dow = new Date(tx.tx_date + 'T12:00:00').getDay()
      days[order.indexOf(dow)].expenses += tx.tx_amount
    }
    return days
  }
  if (granularity === 'weekly') {
    const map = {}
    for (const tx of transactions) {
      if (!isRealExpense(tx)) continue
      const key = isoWeekKey(tx.tx_date)
      map[key] = (map[key] ?? 0) + tx.tx_amount
    }
    return Object.keys(map).sort().map(k => ({ label: weekLabel(k), expenses: map[k] }))
  }
  // monthly
  const map = {}
  for (const tx of transactions) {
    if (!isRealExpense(tx)) continue
    const key = tx.tx_date.slice(0, 7)
    map[key] = (map[key] ?? 0) + tx.tx_amount
  }
  return Object.keys(map).sort().map(k => ({
    label: MONTH_SHORT[parseInt(k.slice(5, 7), 10) - 1] + ' ' + k.slice(2, 4),
    expenses: map[k],
  }))
}

export default function Analysis() {
  const [period, setPeriod] = useState('6m')
  const [granularity, setGranularity] = useState('dow')
  const { from, to }        = useMemo(() => periodRange(period), [period])
  const filters             = useMemo(() => {
    const f = {}
    if (from) f.from = from
    if (to)   f.to   = to
    return f
  }, [from, to])
  const { transactions: realTxs, loading: txLoading } = useTransactions(filters)
  const { demoTxs, demoActive, loading: demoLoading } = useDemoData()
  const loading = txLoading || demoLoading

  const transactions = useMemo(() => {
    if (!demoActive) return realTxs
    const demoFiltered = demoTxs.filter(tx => {
      if (from && tx.tx_date < from) return false
      if (to   && tx.tx_date > to)   return false
      return true
    })
    return [...realTxs, ...demoFiltered]
  }, [realTxs, demoTxs, demoActive, from, to])

  // ── Income vs Expenses por mes ────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const map = {}
    for (const tx of transactions) {
      if (isTransfer(tx)) continue
      const d = tx.tx_date?.slice(0, 7)
      if (!d) continue
      if (!map[d]) map[d] = { month: d, income: 0, expenses: 0, savingInv: 0 }
      if (isIncome(tx))                             map[d].income    += tx.tx_amount
      else if (isSaving(tx) || isInvestment(tx))    map[d].savingInv += tx.tx_amount
      else if (isRealExpense(tx))                   map[d].expenses  += tx.tx_amount
    }
    return Object.values(map).sort((a,b) => a.month.localeCompare(b.month)).map(d => ({
      ...d,
      label:    MONTH_SHORT[parseInt(d.month.slice(5,7), 10) - 1] + ' ' + d.month.slice(2, 4),
      savings:  Math.max(d.income - d.expenses - d.savingInv, 0),
      rate:     d.income > 0 ? Math.round(((d.savingInv) / d.income) * 100) : 0,
    }))
  }, [transactions])

  // ── Por categoría (pie) ───────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map = {}
    for (const tx of transactions) {
      if (isTransfer(tx) || isIncome(tx) || isSaving(tx) || isInvestment(tx)) continue
      const name = tx.categories?.cat_name ?? 'Sin categoría'
      map[name] = (map[name] || 0) + tx.tx_amount
    }
    return Object.entries(map)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }, [transactions])

  // ── Distribución de gastos (granularidad variable) ───────────────────
  const distData = useMemo(
    () => buildGranData(transactions, granularity),
    [transactions, granularity]
  )

  // ── Tasa de ahorro mensual (line) ─────────────────────────────────────
  const savingsRateData = useMemo(() => monthlyData.map(d => ({ label: d.label, rate: d.rate })), [monthlyData])

  // ── KPIs ──────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let income = 0, expenses = 0, savingInv = 0
    for (const tx of transactions) {
      if (isTransfer(tx)) continue
      if (isIncome(tx))                           income    += tx.tx_amount
      else if (isSaving(tx) || isInvestment(tx))  savingInv += tx.tx_amount
      else if (isRealExpense(tx))                 expenses  += tx.tx_amount
    }
    const months   = monthlyData.length || 1
    const savRate  = income > 0 ? Math.round((savingInv / income) * 100) : 0
    return { income, expenses, savingInv, balance: income - expenses - savingInv, avgMonthlyIncome: income / months, avgRate: savRate }
  }, [transactions, monthlyData])

  const tooltipStyle = {
    contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.78rem' },
    labelStyle:   { color: 'var(--text-muted)', fontWeight: 600 },
  }

  return (
    <div style={s.page}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <p style={s.headerSup}>Estadísticas</p>
          <h1 style={s.headerTitle}>Análisis</h1>
        </div>
        <div style={s.periodToggle}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              style={{ ...s.periodBtn, ...(period === p.key ? s.periodBtnActive : {}) }}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 280, borderRadius: 12 }} />)}
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <div className="empty-state">
          <div className="ei">📊</div>
          <p>Sin datos para el período seleccionado</p>
        </div>
      )}

      {!loading && transactions.length > 0 && (
        <>
          {/* ── KPIs ─────────────────────────────────────────────────────── */}
          <div style={s.kpiRow}>
            <KpiCard label="Ingresos totales"  value={formatCurrency(kpis.income)}          color="var(--income)"  />
            <KpiCard label="Gastos reales"     value={formatCurrency(kpis.expenses)}         color="var(--expense)" />
            <KpiCard label="Ahorro / Inv."     value={formatCurrency(kpis.savingInv)}        color="var(--cyan)"    />
            <KpiCard label="Tasa ahorro"       value={`${kpis.avgRate}%`}                    color="var(--cyan)"    />
          </div>

          {/* ── Ingresos vs Gastos por mes ───────────────────────────────── */}
          <ChartCard title="Ingresos vs Gastos" subtitle="Evolución mensual">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtAmt} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} width={40} tickCount={5} allowDecimals={false} domain={['auto', 'auto']} />
                <Tooltip formatter={v => formatCurrency(v)} {...tooltipStyle} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }} />
                <Line type="monotone" dataKey="income"    name="Ingresos"    stroke="var(--income)"  strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses"  name="Gastos"      stroke="var(--expense)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="savingInv" name="Ahorro/Inv." stroke="var(--cyan)"    strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ── Gastos por categoría + Semanal ───────────────────────────── */}
          <div style={s.twoCol}>
            <ChartCard title="Gastos por categoría" subtitle="Top 8">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)} {...tooltipStyle} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '0.72rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title={GRAN_TITLES[granularity]}
              subtitle="Gastos reales acumulados en el período"
              headerRight={
                <div style={s.miniToggle}>
                  {GRAN_OPTIONS.map(o => (
                    <button
                      key={o.key}
                      style={{ ...s.miniBtn, ...(granularity === o.key ? s.miniBtnActive : {}) }}
                      onClick={() => setGranularity(o.key)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              }
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={fmtAmt} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} width={36} tickCount={5} allowDecimals={false} domain={[0, 'auto']} />
                  <Tooltip formatter={v => formatCurrency(v)} {...tooltipStyle} />
                  <Bar dataKey="expenses" name="Gastos" fill="var(--expense)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Tasa de ahorro ────────────────────────────────────────────── */}
          <ChartCard title="Tasa de ahorro mensual" subtitle="% de ingresos no gastados">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={savingsRateData} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} width={36} tickCount={5} allowDecimals={false} domain={['auto', 'auto']} />
                <Tooltip formatter={v => `${v}%`} {...tooltipStyle} />
                <Line type="monotone" dataKey="rate" name="Tasa ahorro" stroke="var(--cyan)" strokeWidth={2} dot={{ r: 3, fill: 'var(--cyan)' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value, color }) {
  return (
    <div style={s.kpiCard}>
      <p style={s.kpiLabel}>{label}</p>
      <p style={{ ...s.kpiValue, color }} className="num">{value}</p>
    </div>
  )
}

function ChartCard({ title, subtitle, headerRight, children }) {
  return (
    <div style={s.chartCard}>
      <div style={{ ...s.chartHeader, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div>
          <p style={s.chartTitle}>{title}</p>
          {subtitle && <p style={s.chartSub}>{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  )
}

const s = {
  page: { maxWidth: 900, margin: '0 auto', paddingBottom: '2rem' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' },
  headerSup: { fontSize: '0.67rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.15rem' },
  headerTitle: { fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' },

  periodToggle: { display: 'flex', gap: '0.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, padding: 3 },
  periodBtn: {
    background: 'none', border: 'none', borderRadius: 7, padding: '0.3rem 0.8rem',
    color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'background var(--transition), color var(--transition)',
  },
  periodBtnActive: { background: 'var(--accent)', color: '#fff', fontWeight: 700 },

  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem', marginBottom: '1.25rem' },
  kpiCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '0.9rem 1rem', boxShadow: 'var(--shadow-card)',
  },
  kpiLabel: { fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.3rem' },
  kpiValue: { fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' },

  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' },

  chartCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '1.1rem 1.25rem', marginBottom: '0.75rem', boxShadow: 'var(--shadow-card)',
  },
  chartHeader: { marginBottom: '0.85rem' },
  chartTitle: { fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)' },
  chartSub:   { fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 2 },

  miniToggle: {
    display: 'flex', gap: 0, flexShrink: 0,
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, padding: 2,
  },
  miniBtn: {
    background: 'none', border: 'none', borderRadius: 5,
    padding: '0.2rem 0.45rem',
    color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
    transition: 'background var(--transition), color var(--transition)',
  },
  miniBtnActive: { background: 'var(--accent)', color: '#fff', fontWeight: 700 },
}
