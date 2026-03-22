import { useState, useMemo } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useAccounts } from '../hooks/useAccounts'
import { formatCurrency, monthRange } from '../utils/formatters'
import MonthlyChart from '../components/charts/MonthlyChart'

const MONTH_NAMES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const SHORT_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const BUDGET_GROUPS = [
  { catTypes: ['fixed_expense'],    label: 'Fijos',     color: '#6366f1', saving: false },
  { catTypes: ['variable_expense'], label: 'Variables', color: '#f43f5e', saving: false },
  { catTypes: ['saving'],           label: 'Ahorro',    color: '#06b6d4', saving: true  },
  { catTypes: ['investment'],       label: 'Inversión', color: '#10b981', saving: true  },
]

function catTypeBadge(catType) {
  switch (catType) {
    case 'income':           return { cls: 'ing', label: 'Ingreso' }
    case 'fixed_expense':    return { cls: 'gf',  label: 'Gasto fijo' }
    case 'variable_expense': return { cls: 'gv',  label: 'Gasto var.' }
    case 'saving':           return { cls: 'aho', label: 'Ahorro' }
    case 'investment':       return { cls: 'inv', label: 'Inversión' }
    default:                 return { cls: 'gv',  label: 'Gasto' }
  }
}

function last6MonthsRange(refYear, refMonth) {
  const end       = monthRange(refYear, refMonth)
  const startDate = new Date(refYear, refMonth - 6, 1)
  const start     = monthRange(startDate.getFullYear(), startDate.getMonth() + 1)
  return { from: start.from, to: end.to }
}

function yearRange(y) {
  return { from: `${y}-01-01`, to: `${y}-12-31` }
}

// ── DonutChart (SVG personalizado) ────────────────────────────────────────────
function DonutChart({ data }) {
  if (!data || data.length === 0) return <div className="empty-state"><div className="ei">🍩</div>Sin gastos este mes</div>

  const SIZE = 160, CX = SIZE / 2, CY = SIZE / 2
  const R_OUTER = SIZE / 2 - 4, R_INNER = R_OUTER * 0.55
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  function polarToXY(cx, cy, r, deg) {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }
  function arcPath(a, b) {
    const la = b - a > 180 ? 1 : 0
    const p1o = polarToXY(CX, CY, R_OUTER, a), p2o = polarToXY(CX, CY, R_OUTER, b)
    const p1i = polarToXY(CX, CY, R_INNER, b), p2i = polarToXY(CX, CY, R_INNER, a)
    return `M ${p1o.x} ${p1o.y} A ${R_OUTER} ${R_OUTER} 0 ${la} 1 ${p2o.x} ${p2o.y} L ${p1i.x} ${p1i.y} A ${R_INNER} ${R_INNER} 0 ${la} 0 ${p2i.x} ${p2i.y} Z`
  }

  let cursor = 0
  const slices = data.map(d => {
    const start = cursor, sweep = (d.value / total) * 360
    cursor += sweep
    return { ...d, start, end: cursor }
  })

  return (
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <svg width={SIZE} height={SIZE} style={{ flexShrink: 0 }}>
        {slices.map((sl, i) => (
          <path key={i} d={arcPath(sl.start, sl.end)} fill={sl.color} opacity={0.9} />
        ))}
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize={10} fill="var(--text-muted)" fontFamily="inherit">Total</text>
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize={11} fontWeight="700" fill="var(--text)" fontFamily="inherit">
          {formatCurrency(total)}
        </text>
      </svg>
      <div style={{ flex: 1, minWidth: 100, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {[...data].sort((a, b) => b.value - a.value).slice(0, 5).map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
            <span className="num" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>
              {formatCurrency(item.value)} <span style={{ opacity: 0.5, fontWeight: 500 }}>{Math.round((item.value / total) * 100)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── TxRow (formato v1) ────────────────────────────────────────────────────────
function TxRow({ tx, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const isIncome = tx.tx_type === 'income'
  const catColor = tx.categories?.cat_color ?? '#2e3558'
  const catName  = tx.categories?.cat_name  ?? (isIncome ? 'Ingreso' : 'Gasto')
  const accName  = tx.accounts?.acc_name
  const badge    = catTypeBadge(tx.categories?.cat_type)
  const dateStr  = new Date(tx.tx_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    await onDelete(tx.tx_id)
  }

  return (
    <div className="tx-item">
      <div className="tx-dot" style={{ background: catColor }} />
      <div className="tx-info">
        <div className="tx-cat">{catName}</div>
        {tx.tx_notes && <div className="tx-note">{tx.tx_notes}</div>}
        {accName && <span className="tx-account">{accName}</span>}
      </div>
      <div className="tx-meta">
        <div className="tx-date">{dateStr}</div>
        <div className={`tx-type-badge ${badge.cls}`}>{badge.label}</div>
      </div>
      <div className={`tx-amount ${isIncome ? 'income' : 'expense'} num`}>
        {isIncome ? '+' : '−'}{formatCurrency(tx.tx_amount)}
      </div>
      {(onEdit || onDelete) && (
        <div className="tx-actions">
          {onEdit && !tx.tx_transfer_pair_id && (
            <button className="btn-sm" onClick={() => onEdit(tx)} title="Editar">✏</button>
          )}
          {onDelete && (
            <button
              className={`btn-sm${confirming ? ' del' : ''}`}
              onClick={handleDelete}
              title={confirming ? 'Confirmar' : 'Eliminar'}
            >
              {confirming ? '✓' : '✕'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── DateGroup (cabecera de fecha + transacciones) ─────────────────────────────
function DateGroup({ date, txs, onEdit, onDelete }) {
  const dayNet = txs.reduce((s, tx) => s + (tx.tx_type === 'income' ? tx.tx_amount : -tx.tx_amount), 0)
  const netCls = dayNet > 0 ? 'pos' : dayNet < 0 ? 'neg' : 'neu'
  const netStr = (dayNet >= 0 ? '+' : '−') + formatCurrency(Math.abs(dayNet))
  const label  = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <div className="date-header">
        <div className="date-header-line" />
        <div className="date-header-label">{label}</div>
        <div className={`date-header-total ${netCls}`}>{netStr}</div>
        <div className="date-header-line" />
      </div>
      {txs.map(tx => (
        <TxRow key={tx.tx_id} tx={tx} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  )
}

// ── LoadingSkeleton ───────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
        <div className="skeleton" style={{ width: 120, height: 28 }} />
        <div className="skeleton" style={{ width: 180, height: 32, borderRadius: 8 }} />
      </div>
      <div className="stats-grid" style={{ marginBottom: '1.2rem' }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 120, borderRadius: 14, marginBottom: '1.2rem' }} />
      <div className="charts-grid">
        <div className="skeleton" style={{ height: 220, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 220, borderRadius: 14 }} />
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard({ onNavigate = null }) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [chartMode, setChartMode] = useState('6m')
  const [chartY,    setChartY]    = useState(now.getFullYear())

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const { from, to }       = useMemo(() => monthRange(year, month), [year, month])
  const chartRange         = useMemo(() => {
    if (chartMode === 'year') return yearRange(chartY)
    return last6MonthsRange(now.getFullYear(), now.getMonth() + 1)
  }, [chartMode, chartY])

  const { transactions, loading: txLoading }             = useTransactions({ from, to })
  const { transactions: chartTx, loading: chartLoading } = useTransactions(chartRange)
  const { accounts, loading: accLoading }                = useAccounts()

  const loading = txLoading || accLoading

  // ── Métricas del mes ──────────────────────────────────────────────────────
  const { income, expense, saving, balance, byCategory, byType } = useMemo(() => {
    let income = 0, expense = 0, saving = 0
    const byCategory = {}, byType = {}
    for (const tx of transactions) {
      const catType = tx.categories?.cat_type
      if (tx.tx_type === 'income') {
        income += tx.tx_amount
      } else if (catType === 'saving' || catType === 'investment') {
        saving += tx.tx_amount
      } else {
        expense += tx.tx_amount
      }
      if (tx.tx_type !== 'income') {
        const name  = tx.categories?.cat_name  ?? 'Sin categoría'
        const color = tx.categories?.cat_color ?? '#2e3558'
        byCategory[name] = byCategory[name] ?? { total: 0, color }
        byCategory[name].total += tx.tx_amount
        byType[catType ?? 'variable_expense'] = (byType[catType ?? 'variable_expense'] ?? 0) + tx.tx_amount
      }
    }
    return { income, expense, saving, balance: income - expense - saving, byCategory, byType }
  }, [transactions])

  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + (a.acc_current_balance ?? 0), 0),
    [accounts]
  )

  const donutData = useMemo(() =>
    Object.entries(byCategory)
      .map(([name, { total, color }]) => ({ name, value: total, color }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    [byCategory]
  )

  // Últimos 8 movimientos agrupados por fecha
  const recentGrouped = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => b.tx_date.localeCompare(a.tx_date)).slice(0, 8)
    const map = {}
    for (const tx of sorted) {
      const d = tx.tx_date.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(tx)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions])

  // Datos para gráfica
  const chartData = useMemo(() => {
    const map = {}
    for (const tx of chartTx) {
      const key = tx.tx_date.slice(0, 7)
      if (!map[key]) map[key] = { income: 0, expenses: 0 }
      if (tx.tx_type === 'income') map[key].income   += tx.tx_amount
      else                         map[key].expenses  += tx.tx_amount
    }
    if (chartMode === 'year') {
      return Array.from({ length: 12 }, (_, i) => {
        const key = `${chartY}-${String(i + 1).padStart(2, '0')}`
        return { key, label: SHORT_MONTHS[i], ...(map[key] ?? { income: 0, expenses: 0 }) }
      })
    }
    return Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const lbl = `${SHORT_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
      return { key, label: lbl, ...(map[key] ?? { income: 0, expenses: 0 }) }
    })
  }, [chartTx, chartMode, chartY])

  // Resumen anual (solo en modo year)
  const annualSummary = useMemo(() => {
    if (chartMode !== 'year') return null
    let totalIncome = 0, totalExpenses = 0
    for (const tx of chartTx) {
      if (tx.tx_type === 'income') totalIncome   += tx.tx_amount
      else                         totalExpenses  += tx.tx_amount
    }
    const annualBal = totalIncome - totalExpenses
    const expPct    = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0
    const savRate   = totalIncome > 0 ? Math.round((annualBal / totalIncome) * 100) : 0
    return { totalIncome, totalExpenses, monthlyAvg: totalIncome / 12, annualBal, expPct, savRate }
  }, [chartTx, chartMode])

  const monthLabel = MONTH_NAMES[month - 1]

  if (loading) return <LoadingSkeleton />

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: '2rem' }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="ph">
        <div className="ph-title">Dashboard</div>
        <div className="month-nav">
          <button onClick={prevMonth}>‹</button>
          <div className="month-label">{monthLabel} {year}</div>
          <button onClick={nextMonth}>›</button>
        </div>
      </div>

      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card c-balance">
          <span className="stat-icon">⚖️</span>
          <div className="stat-label">Balance</div>
          <div className={`stat-value num ${balance >= 0 ? 'pos' : 'neg'}`}>{formatCurrency(balance)}</div>
          <div className="stat-sub">{income > 0 ? `${Math.round(balance / income * 100)}% de ingresos` : '\u00A0'}</div>
        </div>
        <div className="stat-card c-income">
          <span className="stat-icon">📈</span>
          <div className="stat-label">Ingresos</div>
          <div className="stat-value pos num">{formatCurrency(income)}</div>
          <div className="stat-sub">{transactions.filter(t => t.tx_type === 'income').length} movimientos</div>
        </div>
        <div className="stat-card c-expense">
          <span className="stat-icon">📉</span>
          <div className="stat-label">Gastos</div>
          <div className="stat-value neg num">{formatCurrency(expense)}</div>
          <div className="stat-sub">{income > 0 ? `${Math.round(expense / income * 100)}% de ingresos` : '\u00A0'}</div>
        </div>
        <div className="stat-card c-saving">
          <span className="stat-icon">💧</span>
          <div className="stat-label">Ahorro / Inv.</div>
          <div className="stat-value cya num">{formatCurrency(saving)}</div>
          <div className="stat-sub">{income > 0 ? `Tasa ahorro: ${Math.round(saving / income * 100)}%` : '\u00A0'}</div>
        </div>
      </div>

      {/* ── Budget overview ───────────────────────────────────────────────── */}
      <div className="budget-overview">
        <div className="bo-header">
          <div className="bo-title">Presupuesto mensual</div>
          {onNavigate && <button className="btn-hdr" onClick={() => onNavigate('budget')}>Configurar →</button>}
        </div>
        <div className="bo-grid">
          {BUDGET_GROUPS.map(g => {
            const spent   = g.catTypes.reduce((s, ct) => s + (byType[ct] ?? 0), 0)
            const pctInc  = income > 0 ? Math.min(spent / income * 100, 100) : 0
            const barColor = g.saving
              ? (pctInc >= 15 ? '#22c55e' : pctInc >= 8 ? '#f59e0b' : '#f43f5e')
              : (pctInc >= 40 ? '#f43f5e' : pctInc >= 28 ? '#f59e0b' : '#22c55e')
            return (
              <div key={g.label}>
                <div className="bo-label">
                  {g.label}
                  <span style={{ color: g.color }}>{formatCurrency(spent)}</span>
                </div>
                <div className="bo-bar-bg">
                  <div className="bo-bar-fill" style={{ width: `${pctInc}%`, background: barColor }} />
                </div>
                <div className="bo-amounts">
                  <span>{income > 0 ? `${Math.round(pctInc)}% de ingresos` : '—'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Charts grid ───────────────────────────────────────────────────── */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Gastos por categoría</div>
          <DonutChart data={donutData} />
        </div>
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.9rem', gap: '.5rem', flexWrap: 'wrap' }}>
            <div className="chart-title" style={{ marginBottom: 0 }}>
              {chartMode === '6m' ? 'Evolución (6 meses)' : `Evolución ${chartY}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
              {chartMode === 'year' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '.2rem' }}>
                  <button className="btn-hdr" style={{ fontSize: '.72rem', padding: '.22rem .45rem' }} onClick={() => setChartY(y => y - 1)}>‹</button>
                  <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text)', minWidth: 36, textAlign: 'center' }}>{chartY}</span>
                  <button className="btn-hdr" style={{ fontSize: '.72rem', padding: '.22rem .45rem' }} onClick={() => setChartY(y => y + 1)}>›</button>
                </div>
              )}
              <button
                className="btn-hdr"
                style={{ fontSize: '.7rem', padding: '.22rem .55rem', ...(chartMode === '6m' ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}) }}
                onClick={() => setChartMode('6m')}
              >6M</button>
              <button
                className="btn-hdr"
                style={{ fontSize: '.7rem', padding: '.22rem .55rem', ...(chartMode === 'year' ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}) }}
                onClick={() => { setChartMode('year'); setChartY(now.getFullYear()) }}
              >Año</button>
            </div>
          </div>
          <div className="chart-wrap">
            {chartLoading
              ? <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
              : <MonthlyChart data={chartData} />
            }
          </div>
        </div>
      </div>

      {/* ── Resumen anual (solo en modo year) ─────────────────────────────── */}
      {annualSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem', marginBottom: '1.2rem' }}>
          {[
            { label: 'Ingresos totales', value: formatCurrency(annualSummary.totalIncome), sub: `Media mensual: ${formatCurrency(annualSummary.monthlyAvg)}`, color: 'var(--income)' },
            { label: 'Gastos totales',   value: formatCurrency(annualSummary.totalExpenses), sub: `${annualSummary.expPct}% de ingresos`, color: 'var(--expense)' },
            { label: 'Balance anual',    value: formatCurrency(annualSummary.annualBal), sub: annualSummary.annualBal >= 0 ? `Tasa ahorro: ${annualSummary.savRate}%` : 'Año en déficit', color: annualSummary.annualBal >= 0 ? 'var(--income)' : 'var(--expense)' },
          ].map(card => (
            <div key={card.label} className="chart-card">
              <div className="stat-label">{card.label}</div>
              <div className="stat-value num" style={{ color: card.color, fontSize: '1.3rem' }}>{card.value}</div>
              <div className="stat-sub">{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Últimas transacciones ─────────────────────────────────────────── */}
      <div className="sh">
        <div className="sh-title">Últimas transacciones</div>
      </div>
      <div className="tx-list">
        {recentGrouped.length === 0
          ? <div className="empty-state"><div className="ei">📭</div>Sin transacciones este mes</div>
          : recentGrouped.map(([date, txs]) => (
              <DateGroup key={date} date={date} txs={txs} />
            ))
        }
      </div>

    </div>
  )
}
