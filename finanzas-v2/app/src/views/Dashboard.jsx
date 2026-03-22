import { useState, useMemo } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useAccounts } from '../hooks/useAccounts'
import { formatCurrency, monthRange } from '../utils/formatters'
import MonthlyChart from '../components/MonthlyChart'

const MONTH_NAMES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const SHORT_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ── Helpers de rango ──────────────────────────────────────────────────────────

function last6MonthsRange(refYear, refMonth) {
  // refMonth es 1-based
  const end       = monthRange(refYear, refMonth)
  const startDate = new Date(refYear, refMonth - 6, 1) // 5 meses antes
  const start     = monthRange(startDate.getFullYear(), startDate.getMonth() + 1)
  return { from: start.from, to: end.to }
}

function yearRange(y) {
  return { from: `${y}-01-01`, to: `${y}-12-31` }
}

// ── Componente DonutChart ─────────────────────────────────────────────────────

function DonutChart({ data }) {
  if (!data || data.length === 0) return null

  const SIZE    = 160
  const CX      = SIZE / 2
  const CY      = SIZE / 2
  const R_OUTER = SIZE / 2 - 4
  const R_INNER = R_OUTER * 0.55
  const total   = data.reduce((s, d) => s + d.value, 0)

  if (total === 0) return null

  // Construye los arcos SVG
  function polarToXY(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  function arcPath(startAngle, endAngle) {
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    const p1outer  = polarToXY(CX, CY, R_OUTER, startAngle)
    const p2outer  = polarToXY(CX, CY, R_OUTER, endAngle)
    const p1inner  = polarToXY(CX, CY, R_INNER, endAngle)
    const p2inner  = polarToXY(CX, CY, R_INNER, startAngle)
    return [
      `M ${p1outer.x} ${p1outer.y}`,
      `A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${p2outer.x} ${p2outer.y}`,
      `L ${p1inner.x} ${p1inner.y}`,
      `A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${p2inner.x} ${p2inner.y}`,
      'Z',
    ].join(' ')
  }

  let cursor = 0
  const slices = data.map((d) => {
    const startAngle = cursor
    const sweep      = (d.value / total) * 360
    const endAngle   = cursor + sweep
    cursor           = endAngle
    return { ...d, startAngle, endAngle }
  })

  // Top items en leyenda (máx 5)
  const legendItems = [...data]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  return (
    <div style={sd.wrap}>
      <svg width={SIZE} height={SIZE} style={{ flexShrink: 0 }}>
        {slices.map((sl, i) => (
          <path
            key={i}
            d={arcPath(sl.startAngle, sl.endAngle)}
            fill={sl.color}
            opacity={0.88}
          />
        ))}
        {/* Texto central */}
        <text
          x={CX} y={CY - 6}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-muted)"
          fontFamily="inherit"
        >
          Total
        </text>
        <text
          x={CX} y={CY + 10}
          textAnchor="middle"
          fontSize={11}
          fontWeight="700"
          fill="var(--text)"
          fontFamily="inherit"
        >
          {formatCurrency(total)}
        </text>
      </svg>

      <div style={sd.legend}>
        {legendItems.map((item, i) => (
          <div key={i} style={sd.legendRow}>
            <span style={{ ...sd.legendDot, background: item.color }} />
            <span style={sd.legendName}>{item.name}</span>
            <span style={sd.legendValue} className="num">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const sd = {
  wrap:        { display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' },
  legend:      { display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: 120 },
  legendRow:   { display: 'flex', alignItems: 'center', gap: '0.45rem' },
  legendDot:   { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  legendName:  { fontSize: '0.78rem', color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  legendValue: { fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 },
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function Dashboard() {
  const now = new Date()

  // Navegación de mes
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // Modo de gráfica: '6m' | 'year'
  const [chartMode, setChartMode] = useState('6m')
  // Año seleccionado en modo anual (independiente del mes navegado)
  const [chartY, setChartY] = useState(now.getFullYear())

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Rango del mes seleccionado
  const { from, to } = useMemo(() => monthRange(year, month), [year, month])

  // Rango para la gráfica
  const chartRange = useMemo(() => {
    if (chartMode === 'year') return yearRange(chartY)
    return last6MonthsRange(now.getFullYear(), now.getMonth() + 1)
  }, [chartMode, chartY])

  const { transactions, loading: txLoading }             = useTransactions({ from, to })
  const { transactions: chartTx, loading: chartLoading } = useTransactions(chartRange)
  const { accounts, loading: accLoading }                = useAccounts()

  const loading = txLoading || accLoading || chartLoading

  // ── Métricas del mes ──────────────────────────────────────────────────────

  const { income, expenses, balance, byCategory } = useMemo(() => {
    let income = 0, expenses = 0
    const byCategory = {}
    for (const tx of transactions) {
      if (tx.tx_type === 'income') {
        income += tx.tx_amount
      } else {
        expenses += tx.tx_amount
        const catName  = tx.categories?.cat_name  ?? 'Sin categoría'
        const catColor = tx.categories?.cat_color ?? 'var(--border)'
        byCategory[catName] = byCategory[catName] ?? { total: 0, color: catColor }
        byCategory[catName].total += tx.tx_amount
      }
    }
    return { income, expenses, balance: income - expenses, byCategory }
  }, [transactions])

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + (a.acc_current_balance ?? 0), 0),
    [accounts]
  )

  const topCategories = useMemo(() =>
    Object.entries(byCategory)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 4),
    [byCategory]
  )

  // Datos para donut: top categorías de gasto
  const donutData = useMemo(() =>
    Object.entries(byCategory)
      .map(([name, { total, color }]) => ({ name, value: total, color }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    [byCategory]
  )

  // Últimos 10 movimientos agrupados por fecha
  const recentGrouped = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => b.tx_date.localeCompare(a.tx_date))
    const last10 = sorted.slice(0, 10)
    const map    = {}
    for (const tx of last10) {
      const d = tx.tx_date.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(tx)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions])

  // ── Datos para gráfica ────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    const map = {}
    for (const tx of chartTx) {
      const key = tx.tx_date.slice(0, 7)
      if (!map[key]) map[key] = { income: 0, expenses: 0 }
      if (tx.tx_type === 'income') map[key].income   += tx.tx_amount
      else                         map[key].expenses  += tx.tx_amount
    }

    if (chartMode === 'year') {
      const months = []
      for (let m = 1; m <= 12; m++) {
        const key = `${chartY}-${String(m).padStart(2, '0')}`
        months.push({ key, label: SHORT_MONTHS[m - 1], ...(map[key] ?? { income: 0, expenses: 0 }) })
      }
      return months
    } else {
      // 6 meses hacia atrás desde hoy
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d   = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const lbl = `${SHORT_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
        months.push({ key, label: lbl, ...(map[key] ?? { income: 0, expenses: 0 }) })
      }
      return months
    }
  }, [chartTx, chartMode, chartY])

  // ── Resumen anual (solo en modo year) ────────────────────────────────────

  const annualSummary = useMemo(() => {
    if (chartMode !== 'year') return null
    let totalIncome = 0, totalExpenses = 0, totalSavings = 0
    const monthsWithIncome = new Set()
    for (const tx of chartTx) {
      if (tx.tx_type === 'income') {
        totalIncome += tx.tx_amount
        monthsWithIncome.add(tx.tx_date.slice(0, 7))
      } else {
        totalExpenses += tx.tx_amount
      }
    }
    const activeMonths = Math.max(monthsWithIncome.size, 1)
    const monthlyAvg   = totalIncome / 12
    const annualBal    = totalIncome - totalExpenses
    const expPct       = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0
    const savRate      = totalIncome > 0 ? Math.round((annualBal / totalIncome) * 100) : 0
    return { totalIncome, totalExpenses, monthlyAvg, annualBal, expPct, savRate }
  }, [chartTx, chartMode])

  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0
  const monthLabel  = MONTH_NAMES[month - 1]

  if (loading) return <LoadingSkeleton />

  return (
    <div style={s.page}>

      {/* ── Header con navegación de mes ──────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <p style={s.headerSub}>Resumen mensual</p>
          <div style={s.headerTitleRow}>
            <button style={s.navBtn} onClick={prevMonth} title="Mes anterior">‹</button>
            <h1 style={s.headerTitle}>{monthLabel} {year}</h1>
            <button style={s.navBtn} onClick={nextMonth} title="Mes siguiente">›</button>
          </div>
        </div>
        <div style={s.savingsChip}>
          <span style={s.savingsDot} />
          <span style={s.savingsText}>
            {savingsRate >= 0 ? `+${savingsRate}%` : `${savingsRate}%`} ahorro
          </span>
        </div>
      </div>

      {/* ── Tarjetas resumen ──────────────────────────────────────────────── */}
      <div style={s.statsGrid}>
        <StatCard
          label="Patrimonio total"
          value={formatCurrency(totalBalance)}
          color="var(--accent)"
          bg="var(--accent-soft)"
          icon="◈"
          sub={`${accounts.length} cuenta${accounts.length !== 1 ? 's' : ''}`}
          cardClass="stat-card-accent"
        />
        <StatCard
          label="Ingresos"
          value={formatCurrency(income)}
          color="var(--income)"
          bg="var(--income-soft)"
          icon="↑"
          sub={`${transactions.filter(t => t.tx_type === 'income').length} movimientos`}
          cardClass="stat-card-income"
        />
        <StatCard
          label="Gastos"
          value={formatCurrency(expenses)}
          color="var(--expense)"
          bg="var(--expense-soft)"
          icon="↓"
          sub={`${transactions.filter(t => t.tx_type !== 'income').length} movimientos`}
          cardClass="stat-card-expense"
        />
        <StatCard
          label="Balance"
          value={formatCurrency(balance)}
          color={balance >= 0 ? 'var(--income)' : 'var(--expense)'}
          bg={balance >= 0 ? 'var(--income-soft)' : 'var(--expense-soft)'}
          icon={balance >= 0 ? '✓' : '!'}
          sub={balance >= 0 ? 'Mes positivo' : 'Mes en déficit'}
          cardClass="stat-card-balance"
        />
      </div>

      {/* ── Presupuesto del mes ───────────────────────────────────────────── */}
      {topCategories.length > 0 && (
        <section style={{ ...s.card, marginTop: '1rem' }}>
          <SectionHeader title="Presupuesto del mes" />
          <div>
            {topCategories.map(([name, { total, color }]) => (
              <CategoryRow
                key={name}
                name={name}
                total={total}
                color={color}
                pct={expenses > 0 ? Math.round((total / expenses) * 100) : 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Grid: cuentas + top categorías ───────────────────────────────── */}
      <div style={s.grid}>
        <section style={s.card}>
          <SectionHeader title="Cuentas" count={accounts.length} />
          {accounts.length === 0
            ? <Empty text="No hay cuentas creadas" />
            : <div style={s.accountList}>
                {accounts.map(acc => <AccountRow key={acc.acc_id} acc={acc} />)}
              </div>
          }
        </section>

        <section style={s.card}>
          <SectionHeader title="Reparto de gastos" />
          {donutData.length === 0
            ? <Empty text="Sin gastos este mes" />
            : <DonutChart data={donutData} />
          }
        </section>
      </div>

      {/* ── Gráfica de evolución ──────────────────────────────────────────── */}
      <section style={{ ...s.card, marginTop: '1rem' }}>
        <div style={s.chartHeader}>
          <SectionHeader
            title={chartMode === '6m' ? 'Evolución — últimos 6 meses' : `Evolución — ${chartY}`}
          />
          <div style={s.chartControls}>
            {chartMode === 'year' && (
              <div style={s.yearNav}>
                <button style={s.yearBtn} onClick={() => setChartY(y => y - 1)}>‹</button>
                <span style={s.yearLabel}>{chartY}</span>
                <button style={s.yearBtn} onClick={() => setChartY(y => y + 1)}>›</button>
              </div>
            )}
            <div style={s.modeTabs}>
              <button
                style={{ ...s.modeTab, ...(chartMode === '6m'   ? s.modeTabActive : {}) }}
                onClick={() => setChartMode('6m')}
              >
                6M
              </button>
              <button
                style={{ ...s.modeTab, ...(chartMode === 'year' ? s.modeTabActive : {}) }}
                onClick={() => { setChartMode('year'); setChartY(now.getFullYear()) }}
              >
                Año
              </button>
            </div>
          </div>
        </div>
        <MonthlyChart data={chartData} />

        {/* ── Resumen anual ────────────────────────────────────────────── */}
        {annualSummary && (
          <div style={s.annualGrid}>
            <AnnualCard
              label="Ingresos totales"
              value={formatCurrency(annualSummary.totalIncome)}
              sub={`Media mensual: ${formatCurrency(annualSummary.monthlyAvg)}`}
              color="var(--income)"
              bg="var(--income-soft)"
            />
            <AnnualCard
              label="Gastos totales"
              value={formatCurrency(annualSummary.totalExpenses)}
              sub={`${annualSummary.expPct}% de los ingresos`}
              color="var(--expense)"
              bg="var(--expense-soft)"
            />
            <AnnualCard
              label="Balance anual"
              value={formatCurrency(annualSummary.annualBal)}
              sub={annualSummary.annualBal >= 0 ? `Tasa de ahorro: ${annualSummary.savRate}%` : 'Año en déficit'}
              color={annualSummary.annualBal >= 0 ? 'var(--income)' : 'var(--expense)'}
              bg={annualSummary.annualBal >= 0 ? 'var(--income-soft)' : 'var(--expense-soft)'}
            />
          </div>
        )}
      </section>

      {/* ── Últimos movimientos agrupados por día ─────────────────────────── */}
      <section style={{ ...s.card, marginTop: '1rem' }}>
        <SectionHeader title="Últimos movimientos" count={recentGrouped.reduce((n, [, txs]) => n + txs.length, 0)} />
        {recentGrouped.length === 0
          ? <Empty text="Sin movimientos este mes" />
          : recentGrouped.map(([date, txs]) => {
              const dayNet = txs.reduce((sum, tx) =>
                tx.tx_type === 'income' ? sum + tx.tx_amount : sum - tx.tx_amount, 0)
              const label = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
                weekday: 'long', day: 'numeric', month: 'long',
              })
              return (
                <div key={date} style={s.group}>
                  <div style={s.groupHeader}>
                    <span style={s.groupDate}>{label}</span>
                    <span
                      style={{ ...s.groupNet, color: dayNet >= 0 ? 'var(--income)' : 'var(--expense)' }}
                      className="num"
                    >
                      {dayNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(dayNet))}
                    </span>
                  </div>
                  <div style={s.groupBody}>
                    {txs.map(tx => <TxRow key={tx.tx_id} tx={tx} />)}
                  </div>
                </div>
              )
            })
        }
      </section>

    </div>
  )
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function StatCard({ label, value, color, bg, icon, sub, cardClass }) {
  return (
    <div style={s.statCard} className={cardClass}>
      <div style={{ ...s.statIcon, background: bg, color }}>{icon}</div>
      <div style={s.statBody}>
        <p style={s.statLabel}>{label}</p>
        <p style={{ ...s.statValue, color }} className="num">{value}</p>
        {sub && <p style={s.statSub}>{sub}</p>}
      </div>
    </div>
  )
}

function SectionHeader({ title, count }) {
  return (
    <div style={s.sectionHeader}>
      <h2 style={s.sectionTitle}>{title}</h2>
      {count != null && count > 0 && (
        <span style={s.sectionCount}>{count}</span>
      )}
    </div>
  )
}

function AccountRow({ acc }) {
  const positive = (acc.acc_current_balance ?? 0) >= 0
  return (
    <div style={s.accountRow}>
      <div style={s.accountLeft}>
        <div style={s.accountDot} />
        <span style={s.accountName}>{acc.acc_name}</span>
      </div>
      <span
        style={{ ...s.accountBalance, color: positive ? 'var(--income)' : 'var(--expense)' }}
        className="num"
      >
        {formatCurrency(acc.acc_current_balance ?? 0)}
      </span>
    </div>
  )
}

function CategoryRow({ name, total, color, pct }) {
  return (
    <div style={s.catRow}>
      <div style={s.catTop}>
        <div style={s.catLeft}>
          <span style={{ ...s.catDot, background: color }} />
          <span style={s.catName}>{name}</span>
        </div>
        <div style={s.catRight}>
          <span style={s.catAmount} className="num">{formatCurrency(total)}</span>
          <span style={s.catPct}>{pct}%</span>
        </div>
      </div>
      <div style={s.catBarBg}>
        <div style={{ ...s.catBarFill, width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
    </div>
  )
}

function TxRow({ tx }) {
  const isIncome = tx.tx_type === 'income'
  const date     = new Date(tx.tx_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return (
    <div style={s.txRow}>
      <div style={s.txLeft}>
        <div style={{ ...s.txDot, background: tx.categories?.cat_color ?? 'var(--border)' }} />
        <div>
          <p style={s.txNote}>{tx.tx_notes || tx.categories?.cat_name || '—'}</p>
          <p style={s.txMeta}>
            <span className={`tx-badge ${isIncome ? 'tx-badge-income' : 'tx-badge-expense'}`}>
              {isIncome ? 'Ingreso' : 'Gasto'}
            </span>
            {tx.categories?.cat_name ? ` ${tx.categories.cat_name}` : ''}
            {date ? ` · ${date}` : ''}
          </p>
        </div>
      </div>
      <span
        style={{ ...s.txAmount, color: isIncome ? 'var(--income)' : 'var(--expense)' }}
        className="num"
      >
        {isIncome ? '+' : '−'}{formatCurrency(tx.tx_amount)}
      </span>
    </div>
  )
}

function AnnualCard({ label, value, sub, color, bg }) {
  return (
    <div style={{ ...s.annualCard, borderColor: `color-mix(in srgb, ${color} 20%, transparent)` }}>
      <div style={{ ...s.annualDot, background: bg }}>
        <span style={{ color, fontSize: '0.85rem', fontWeight: 700 }}>€</span>
      </div>
      <div>
        <p style={s.annualLabel}>{label}</p>
        <p style={{ ...s.annualValue, color }} className="num">{value}</p>
        <p style={s.annualSub}>{sub}</p>
      </div>
    </div>
  )
}

function Empty({ text }) {
  return <p style={s.empty}>{text}</p>
}

function LoadingSkeleton() {
  return (
    <div style={s.page}>
      <div style={{ ...s.header, marginBottom: '1.5rem' }}>
        <div>
          <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 200, height: 28 }} />
        </div>
      </div>
      <div style={s.statsGrid}>
        {[1,2,3,4].map(i => (
          <div key={i} style={s.statCard}>
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: 80, height: 12, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 120, height: 24 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    paddingBottom: '2rem',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  headerSub: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.25rem',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  headerTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
  },
  navBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: 8,
    width: 32,
    height: 32,
    cursor: 'pointer',
    fontSize: '1.1rem',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  savingsChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.35rem 0.75rem',
    background: 'var(--income-soft)',
    border: '1px solid rgba(63,185,80,0.2)',
    borderRadius: 99,
    flexShrink: 0,
  },
  savingsDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--income)',
    flexShrink: 0,
  },
  savingsText: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--income)',
  },

  // Stats grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  statCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.875rem',
    boxShadow: 'var(--shadow)',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  statBody: { flex: 1, minWidth: 0 },
  statLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.3rem',
  },
  statValue: {
    fontSize: '1.35rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    marginBottom: '0.2rem',
  },
  statSub: {
    fontSize: '0.72rem',
    color: 'var(--text-faint)',
  },

  // Main grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },

  // Card
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1.25rem',
    boxShadow: 'var(--shadow)',
  },

  // Section header
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  sectionTitle: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  sectionCount: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--text-faint)',
    background: 'var(--bg-hover)',
    padding: '1px 6px',
    borderRadius: 99,
    border: '1px solid var(--border)',
  },

  // Chart header (título + controles)
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  chartControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  yearNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  yearBtn: {
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    width: 26,
    height: 26,
    cursor: 'pointer',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  yearLabel: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text)',
    minWidth: 36,
    textAlign: 'center',
  },
  modeTabs: {
    display: 'flex',
    gap: '2px',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 2,
  },
  modeTab: {
    background: 'none',
    border: 'none',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-faint)',
    cursor: 'pointer',
    transition: 'background var(--transition), color var(--transition)',
  },
  modeTabActive: {
    background: 'var(--bg-card)',
    color: 'var(--text)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },

  // Accounts
  accountList: { display: 'flex', flexDirection: 'column' },
  accountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 0',
    borderBottom: '1px solid var(--border-soft)',
  },
  accountLeft: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  accountDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--accent)',
    flexShrink: 0,
  },
  accountName:    { fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500 },
  accountBalance: { fontSize: '0.9rem', fontWeight: 700, letterSpacing: '-0.01em' },

  // Categories
  catRow: {
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--border-soft)',
  },
  catTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.4rem',
  },
  catLeft: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  catName:   { fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 },
  catRight:  { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  catAmount: { fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' },
  catPct: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    minWidth: 30,
    textAlign: 'right',
  },
  catBarBg: {
    height: 3,
    background: 'var(--border)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 99,
    opacity: 0.7,
    transition: 'width 0.6s ease',
  },

  // Groups (últimos movimientos)
  group: { marginBottom: '1.25rem' },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.4rem',
    paddingBottom: '0.3rem',
    borderBottom: '1px solid var(--border)',
  },
  groupDate: {
    fontSize: '0.73rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  groupNet: {
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  groupBody: { display: 'flex', flexDirection: 'column', gap: 2 },

  // Tx rows en dashboard (compactos, sin acciones)
  txRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.55rem 0',
    borderBottom: '1px solid var(--border-soft)',
  },
  txLeft: { display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 },
  txDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  txNote: {
    fontSize: '0.85rem',
    color: 'var(--text)',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 220,
  },
  txMeta: { fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 2 },
  txAmount: {
    fontSize: '0.875rem',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    flexShrink: 0,
    marginLeft: '0.5rem',
  },

  empty: {
    color: 'var(--text-faint)',
    fontSize: '0.85rem',
    padding: '0.75rem 0',
    textAlign: 'center',
  },

  // Resumen anual
  annualGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '0.75rem',
    marginTop: '1.25rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid var(--border-soft)',
  },
  annualCard: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.875rem 1rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
  },
  annualDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  annualLabel: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.2rem',
  },
  annualValue: {
    fontSize: '1.1rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    marginBottom: '0.15rem',
  },
  annualSub: {
    fontSize: '0.7rem',
    color: 'var(--text-faint)',
  },
}
