import { useState, useMemo } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useAccounts } from '../hooks/useAccounts'
import { formatCurrency, monthRange } from '../utils/formatters'
import MonthlyChart from '../components/charts/MonthlyChart'
import { isTransfer, isSaving, isInvestment, isRealExpense, isIncome as isIncomeClassifier } from '../utils/txClassifier'

const MONTH_NAMES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const SHORT_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const DONUT_PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#f43f5e']

const BUDGET_GROUPS = [
  { catTypes: ['fixed_expense'],    label: 'Gastos fijos',    type: 'home',         color: '#6366f1', saving: false, targetPct: 40 },
  { catTypes: ['variable_expense'], label: 'Gastos variables', type: 'shopping-cart', color: '#f43f5e', saving: false, targetPct: 25 },
  { catTypes: ['saving'],           label: 'Ahorro',          type: 'pocket',       color: '#06b6d4', saving: true,  targetPct: 15 },
  { catTypes: ['investment'],       label: 'Inversión',       type: 'investment',   color: '#10b981', saving: true,  targetPct: 15 },
]

function BudgetIcon({ type, color }) {
  const props = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (type) {
    case 'home':
      return <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    case 'shopping-cart':
      return <svg {...props}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
    case 'archive':
      return <svg {...props}><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
    case 'pocket':
      return <svg {...props}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
    case 'trending-up':
      return <svg {...props}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
    case 'investment':
      return <svg {...props}><rect x="18" y="2" width="4" height="20"/><rect x="10" y="8" width="4" height="14"/><rect x="2" y="14" width="4" height="8"/></svg>
    default:
      return null
  }
}

function catTypeBadge(catType) {
  switch (catType) {
    case 'income':           return { cls: 'ing', label: 'Ingreso' }
    case 'fixed_expense':    return { cls: 'gf',  label: 'Gasto fijo' }
    case 'variable_expense': return { cls: 'gv',  label: 'Gasto var.' }
    case 'saving':           return { cls: 'aho', label: 'Ahorro' }
    case 'investment':       return { cls: 'inv', label: 'Inversión' }
    case 'transfer':         return { cls: 'tra', label: 'Transferencia ↔' }
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
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
  const isIncTx    = isIncomeClassifier(tx)
  const isTransTx  = isTransfer(tx)
  const isSavTx    = isSaving(tx)
  const isInvTx    = isInvestment(tx)
  const catColor = tx.categories?.cat_color ?? '#2e3558'
  const catName  = tx.categories?.cat_name  ?? (isIncTx ? 'Ingreso' : 'Gasto')
  const accName  = tx.accounts?.acc_name
  const badge    = catTypeBadge(isTransTx ? 'transfer' : tx.categories?.cat_type)
  const dateStr  = new Date(tx.tx_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

  const amountStyle = isTransTx
    ? { color: 'var(--text-muted)' }
    : (isSavTx || isInvTx)
      ? { color: 'var(--cyan)' }
      : null

  const amountCls = isTransTx
    ? 'num'
    : (isSavTx || isInvTx)
      ? 'num'
      : isIncTx
        ? 'income num'
        : 'expense num'

  const amountStr = isTransTx
    ? formatCurrency(tx.tx_amount)
    : (isIncTx ? '+' : '−') + formatCurrency(tx.tx_amount)

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    await onDelete(tx.tx_id)
  }

  return (
    <div className="tx-item">
      <div className="tx-dot" style={{ background: isTransTx ? 'var(--text-faint)' : catColor }} />
      <div className="tx-info">
        <div className="tx-cat">{catName}</div>
        {tx.tx_notes && <div className="tx-note">{tx.tx_notes}</div>}
        {accName && <span className="tx-account">{accName}</span>}
      </div>
      <div className="tx-meta">
        <div className="tx-date">{dateStr}</div>
        <div className={`tx-type-badge ${badge.cls}`}>{badge.label}</div>
      </div>
      <div className={`tx-amount ${amountCls}`} style={amountStyle}>
        {amountStr}
      </div>
      {(onEdit || onDelete) && (
        <div className="tx-actions">
          {onEdit && !isTransTx && (
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
  const dayNet = txs.reduce((s, tx) => {
    if (isTransfer(tx)) return s
    if (isIncomeClassifier(tx)) return s + tx.tx_amount
    return s - tx.tx_amount
  }, 0)
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
      if (isTransfer(tx)) continue
      const catType = tx.categories?.cat_type
      if (isIncomeClassifier(tx)) {
        income += tx.tx_amount
      } else if (isSaving(tx) || isInvestment(tx)) {
        saving += tx.tx_amount
        byType[catType ?? 'saving'] = (byType[catType ?? 'saving'] ?? 0) + tx.tx_amount
      } else if (isRealExpense(tx)) {
        expense += tx.tx_amount
        const name  = tx.categories?.cat_name  ?? 'Sin categoría'
        const color = tx.categories?.cat_color ?? '#2e3558'
        byCategory[name] = byCategory[name] ?? { total: 0, color }
        byCategory[name].total += tx.tx_amount
        byType[catType ?? 'variable_expense'] = (byType[catType ?? 'variable_expense'] ?? 0) + tx.tx_amount
      }
    }
    return { income, expense, saving, balance: income - expense, byCategory, byType }
  }, [transactions])

  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + (a.acc_current_balance ?? 0), 0),
    [accounts]
  )

  const donutData = useMemo(() =>
    Object.entries(byCategory)
      .map(([name, { total }]) => ({ name, value: total }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((item, i) => ({ ...item, color: DONUT_PALETTE[i % DONUT_PALETTE.length] })),
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
      if (isTransfer(tx)) continue
      const key = tx.tx_date.slice(0, 7)
      if (!map[key]) map[key] = { income: 0, expenses: 0, savingInv: 0 }
      if (isIncomeClassifier(tx))                       map[key].income    += tx.tx_amount
      else if (isSaving(tx) || isInvestment(tx))        map[key].savingInv += tx.tx_amount
      else if (isRealExpense(tx))                       map[key].expenses  += tx.tx_amount
    }
    if (chartMode === 'year') {
      return Array.from({ length: 12 }, (_, i) => {
        const key = `${chartY}-${String(i + 1).padStart(2, '0')}`
        return { key, label: SHORT_MONTHS[i], ...(map[key] ?? { income: 0, expenses: 0, savingInv: 0 }) }
      })
    }
    return Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const lbl = `${SHORT_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
      return { key, label: lbl, ...(map[key] ?? { income: 0, expenses: 0, savingInv: 0 }) }
    })
  }, [chartTx, chartMode, chartY])

  // Resumen anual (solo en modo year)
  const annualSummary = useMemo(() => {
    if (chartMode !== 'year') return null
    let totalIncome = 0, totalExpenses = 0, totalSaving = 0
    for (const tx of chartTx) {
      if (isTransfer(tx)) continue
      if (isIncomeClassifier(tx))                      totalIncome   += tx.tx_amount
      else if (isSaving(tx) || isInvestment(tx))       totalSaving   += tx.tx_amount
      else if (isRealExpense(tx))                      totalExpenses += tx.tx_amount
    }
    const annualBal = totalIncome - totalExpenses - totalSaving
    const expPct    = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0
    const savRate   = totalIncome > 0 ? Math.round((totalSaving   / totalIncome) * 100) : 0
    return { totalIncome, totalExpenses, totalSaving, monthlyAvg: totalIncome / 12, annualBal, expPct, savRate }
  }, [chartTx, chartMode])

  const monthLabel = MONTH_NAMES[month - 1]

  if (loading) return <LoadingSkeleton />

  return (
    <div className="animate-reveal" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: '2rem' }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="ph">
        <div>
          <div className="ph-title">Dashboard</div>
          <div className="ph-sub">Resumen financiero · {monthLabel} {year}</div>
        </div>
        <div className="month-nav">
          <button onClick={prevMonth}>‹</button>
          <div className="month-label">{monthLabel} {year}</div>
          <button onClick={nextMonth}>›</button>
        </div>
      </div>

      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <div className="stats-grid stagger-children">
        <div className="stat-card c-balance">
          <div className="kpi-header">
            <div className="kpi-title">Balance del mes</div>
            <div className="kpi-icon-badge balance">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
          </div>
          <div className="kpi-value num">{formatCurrency(balance)}</div>
          <div className={`kpi-trend ${balance >= 0 ? 'pos' : 'neg'}`}>
            {balance >= 0 ? '↑' : '↓'} {income > 0 ? `${Math.round(balance / income * 100)}% de ingresos` : '—'}
          </div>
        </div>
        <div className="stat-card c-income">
          <div className="kpi-header">
            <div className="kpi-title">Ingresos</div>
            <div className="kpi-icon-badge income">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
          </div>
          <div className="kpi-value num">{formatCurrency(income)}</div>
          <div className="kpi-sub">{transactions.filter(t => t.tx_type === 'income').length} movimientos</div>
        </div>
        <div className="stat-card c-expense">
          <div className="kpi-header">
            <div className="kpi-title">Gastos</div>
            <div className="kpi-icon-badge expense">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
              </svg>
            </div>
          </div>
          <div className="kpi-value num">{formatCurrency(expense)}</div>
          {income > 0
            ? <div className={`kpi-trend ${expense / income > 0.7 ? 'neg' : 'pos'}`}>
                {expense / income > 0.7 ? '↑' : '↓'} {Math.round(expense / income * 100)}% de ingresos
              </div>
            : <div className="kpi-sub">&nbsp;</div>
          }
        </div>
        <div className="stat-card c-saving">
          <div className="kpi-header">
            <div className="kpi-title">Ahorro / Inv.</div>
            <div className="kpi-icon-badge saving">
              {/* Gota de agua — icono semántico para ahorro */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
              </svg>
            </div>
          </div>
          <div className="kpi-value num">{formatCurrency(saving)}</div>
          {income > 0
            ? <div className={`kpi-trend ${saving / income >= 0.15 ? 'pos' : 'neg'}`}>
                {saving / income >= 0.15 ? '↑' : '↓'} Tasa {Math.round(saving / income * 100)}%
              </div>
            : <div className="kpi-sub">&nbsp;</div>
          }
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
            const spent    = g.catTypes.reduce((s, ct) => s + (byType[ct] ?? 0), 0)
            const pctInc   = income > 0 ? (spent / income) * 100 : 0
            const barPct   = income > 0 ? Math.min((spent / (income * g.targetPct / 100)) * 100, 100) : 0
            const isOver   = !g.saving && pctInc > g.targetPct
            const isWarn   = !g.saving && pctInc >= g.targetPct * 0.8 && !isOver
            const savOver  = g.saving && pctInc >= g.targetPct
            const barColor = g.saving
              ? (savOver ? '#22c55e' : pctInc >= g.targetPct * 0.5 ? '#f59e0b' : '#f43f5e')
              : (isOver  ? '#f43f5e' : isWarn                       ? '#f59e0b' : '#22c55e')
            const pctCls   = isOver ? 'over' : isWarn ? 'warn' : (savOver ? 'ok' : '')
            return (
              <div key={g.label} className={`budget-item${isOver ? ' over' : ''}`}>
                <div className="budget-item-hd">
                  <div className="budget-item-label">
                    <span className="budget-item-icon"><BudgetIcon type={g.type} color={g.color} /></span>
                    <span>{g.label}</span>
                  </div>
                  <span className={`budget-item-pct ${pctCls}`}>{Math.round(income > 0 ? (pctInc / g.targetPct) * 100 : 0)}%</span>
                </div>
                <div className="budget-bar-track">
                  <div className="budget-bar-fill" style={{ width: `${barPct}%`, background: barColor }} />
                </div>
                <div className="budget-item-amounts">
                  <span className="spent">{formatCurrency(spent)}</span>
                  <span className="target">obj. {g.targetPct}%</span>
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
            { label: 'Ingresos totales', value: formatCurrency(annualSummary.totalIncome),   sub: `Media mensual: ${formatCurrency(annualSummary.monthlyAvg)}`, color: 'var(--income)' },
            { label: 'Gastos reales',    value: formatCurrency(annualSummary.totalExpenses), sub: `${annualSummary.expPct}% de ingresos`, color: 'var(--expense)' },
            { label: 'Ahorro / Inv.',    value: formatCurrency(annualSummary.totalSaving),   sub: `Tasa ahorro: ${annualSummary.savRate}%`, color: 'var(--cyan)' },
            { label: 'Balance anual',    value: formatCurrency(annualSummary.annualBal), sub: annualSummary.annualBal >= 0 ? 'Superávit' : 'Año en déficit', color: annualSummary.annualBal >= 0 ? 'var(--income)' : 'var(--expense)' },
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
