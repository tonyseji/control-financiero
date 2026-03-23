import { useState, useMemo } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { formatCurrency, monthRange } from '../utils/formatters'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'income',  label: 'Ingresos' },
  { value: 'expense', label: 'Gastos' },
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

export default function Transactions({ onEdit }) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // Filtros
  const [filterType,    setFilterType]    = useState('')
  const [filterCatId,   setFilterCatId]   = useState('')
  const [filterAccId,   setFilterAccId]   = useState('')
  const [filterText,    setFilterText]    = useState('')

  const { from, to }                      = useMemo(() => monthRange(year, month), [year, month])
  const { transactions, loading, remove } = useTransactions({ from, to })

  // ── Opciones derivadas de las transacciones cargadas ─────────────────────

  const categoryOptions = useMemo(() => {
    const seen = new Map()
    for (const tx of transactions) {
      if (tx.categories?.cat_id && !seen.has(tx.categories.cat_id)) {
        seen.set(tx.categories.cat_id, tx.categories.cat_name ?? tx.categories.cat_id)
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [transactions])

  const accountOptions = useMemo(() => {
    const seen = new Map()
    for (const tx of transactions) {
      if (tx.accounts?.acc_id && !seen.has(tx.accounts.acc_id)) {
        seen.set(tx.accounts.acc_id, tx.accounts.acc_name ?? tx.accounts.acc_id)
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [transactions])

  // ── Transacciones filtradas ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filterType) {
        if (filterType === 'income'  && tx.tx_type !== 'income')  return false
        if (filterType === 'expense' && tx.tx_type === 'income')  return false
      }
      if (filterCatId && tx.categories?.cat_id !== filterCatId) return false
      if (filterAccId && tx.accounts?.acc_id   !== filterAccId) return false
      if (filterText) {
        const q    = filterText.toLowerCase()
        const note = (tx.tx_notes ?? '').toLowerCase()
        const cat  = (tx.categories?.cat_name ?? '').toLowerCase()
        if (!note.includes(q) && !cat.includes(q)) return false
      }
      return true
    })
  }, [transactions, filterType, filterCatId, filterAccId, filterText])

  // ── Métricas de las transacciones filtradas ───────────────────────────────

  const { income, expenses, balance } = useMemo(() => {
    let income = 0, expenses = 0
    for (const tx of filtered) {
      if (tx.tx_type === 'income') income += tx.tx_amount
      else expenses += tx.tx_amount
    }
    return { income, expenses, balance: income - expenses }
  }, [filtered])

  // ── Agrupación por fecha ──────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const map = {}
    for (const tx of filtered) {
      const d = tx.tx_date.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(tx)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  // ── Navegación de mes ─────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    clearFilters()
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    clearFilters()
  }

  function clearFilters() {
    setFilterType('')
    setFilterCatId('')
    setFilterAccId('')
    setFilterText('')
  }

  const hasFilter = filterType !== '' || filterCatId !== '' || filterAccId !== '' || filterText !== ''

  return (
    <div style={s.page}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <p style={s.headerSup}>Movimientos</p>
          <h1 style={s.headerTitle}>{MONTH_NAMES[month - 1]} {year}</h1>
          {!loading && <p style={s.headerSub}>{filtered.length} movimientos este mes</p>}
        </div>
        <div style={s.navBtns}>
          <button style={s.navBtn} onClick={prevMonth} title="Mes anterior">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button style={s.navBtn} onClick={nextMonth} title="Mes siguiente">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Resumen (sobre transacciones FILTRADAS) ────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div style={s.summary}>
          <SummaryPill label="Ingresos" value={`+${formatCurrency(income)}`}   color="var(--income)"  />
          <SummaryPill label="Gastos"   value={`−${formatCurrency(expenses)}`} color="var(--expense)" />
          <SummaryPill
            label="Balance"
            value={`${balance >= 0 ? '+' : '−'}${formatCurrency(Math.abs(balance))}`}
            color={balance >= 0 ? 'var(--income)' : 'var(--expense)'}
          />
        </div>
      )}

      {/* ── Barra de filtros ──────────────────────────────────────────────── */}
      {!loading && transactions.length > 0 && (
        <div style={s.filterBar}>
          <input
            style={{ ...s.filterSelect, flex: '2 1 160px' }}
            type="text"
            placeholder="Buscar nota o categoría…"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
          {/* Tipo */}
          <select
            style={s.filterSelect}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Categoría */}
          <select
            style={s.filterSelect}
            value={filterCatId}
            onChange={e => setFilterCatId(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categoryOptions.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Cuenta */}
          {accountOptions.length > 0 && (
            <select
              style={s.filterSelect}
              value={filterAccId}
              onChange={e => setFilterAccId(e.target.value)}
            >
              <option value="">Todas las cuentas</option>
              {accountOptions.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          )}

          {/* Limpiar filtros */}
          {hasFilter && (
            <button style={s.clearBtn} onClick={clearFilters}>
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {loading && (
        <div style={s.loadingWrap}>
          {[1,2,3].map(i => (
            <div key={i}>
              <div className="skeleton" style={{ width: 140, height: 13, marginBottom: 12 }} />
              {[1,2].map(j => (
                <div key={j} className="skeleton" style={{ height: 52, borderRadius: 10, marginBottom: 4 }} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && grouped.length === 0 && (
        <div className="empty-state">
          <div className="ei">📭</div>
          {hasFilter
            ? <>
                <p>Sin resultados con estos filtros</p>
                <button style={s.clearBtnCenter} onClick={clearFilters}>Quitar filtros</button>
              </>
            : <>
                <p>Sin movimientos en {MONTH_NAMES[month - 1]}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', marginTop: '0.3rem' }}>Usa el botón Añadir para registrar tu primer movimiento</p>
              </>
          }
        </div>
      )}

      {/* ── Grupos por fecha ──────────────────────────────────────────────── */}
      <div className="tx-list">
        {grouped.map(([date, txs]) => {
          const dayNet = txs.reduce((sum, tx) =>
            tx.tx_type === 'income' ? sum + tx.tx_amount : sum - tx.tx_amount, 0)
          const label = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
            weekday: 'long', day: 'numeric', month: 'long',
          })
          const netCls = dayNet > 0 ? 'pos' : dayNet < 0 ? 'neg' : 'neu'
          const netStr = (dayNet >= 0 ? '+' : '−') + formatCurrency(Math.abs(dayNet))
          return (
            <div key={date}>
              <div className="date-header">
                <div className="date-header-line" />
                <div className="date-header-label">{label}</div>
                <div className={`date-header-total ${netCls}`}>{netStr}</div>
                <div className="date-header-line" />
              </div>
              {txs.map(tx => <TxRow key={tx.tx_id} tx={tx} onDelete={remove} onEdit={onEdit} />)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function SummaryPill({ label, value, color }) {
  return (
    <div style={{ ...s.summaryPill, borderLeft: `3px solid ${color}` }}>
      <span style={{ ...s.pillLabel, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ ...s.pillValue, color }} className="num">{value}</span>
    </div>
  )
}

function TxRow({ tx, onDelete, onEdit }) {
  const isIncome   = tx.tx_type === 'income'
  const isTransfer = !!tx.tx_transfer_pair_id
  const [confirming, setConfirming] = useState(false)
  const catColor = tx.categories?.cat_color ?? '#2e3558'
  const catName  = tx.categories?.cat_name  ?? (isIncome ? 'Ingreso' : 'Gasto')
  const accName  = tx.accounts?.acc_name
  const badge    = catTypeBadge(tx.categories?.cat_type)

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    await onDelete(tx.tx_id)
  }

  return (
    <div className="tx-item tx-row-hover">
      <div className="tx-dot" style={{ background: catColor }} />
      <div className="tx-info">
        <div className="tx-cat">{catName}</div>
        {tx.tx_notes && <div className="tx-note">{tx.tx_notes}</div>}
        {accName && <span className="tx-account">{accName}</span>}
        {tx.tx_is_pending && <span className="tx-account" style={{ color: 'var(--yellow)' }}>Pendiente</span>}
      </div>
      <div className="tx-meta">
        <div className={`tx-type-badge ${badge.cls}`}>{badge.label}</div>
      </div>
      <div className={`tx-amount ${isIncome ? 'income' : 'expense'} num`}>
        {isIncome ? '+' : '−'}{formatCurrency(tx.tx_amount)}
      </div>
      {(onEdit || onDelete) && (
        <div className="tx-actions tx-actions-reveal">
          {!isTransfer && onEdit && (
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

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = {
  page: { maxWidth: 720, margin: '0 auto', paddingBottom: '2rem' },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '1.25rem',
  },
  headerSup: {
    fontSize: '0.67rem',
    color: 'var(--text-faint)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '0.2rem',
  },
  headerSub: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontWeight: 400,
    marginTop: '0.2rem',
  },
  headerTitle: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '-0.03em',
  },
  navBtns: { display: 'flex', gap: '0.4rem', marginTop: 4 },
  navBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: 8,
    width: 34,
    height: 34,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color var(--transition), color var(--transition)',
  },

  summary: { display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
  summaryPill: {
    flex: '1 1 100px',
    display: 'flex',
    flexDirection: 'column',
    padding: '0.7rem 0.9rem',
    borderRadius: 'var(--radius-btn)',
    gap: 3,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderLeftWidth: 3,
  },
  pillLabel: { fontSize: '0.63rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' },
  pillValue: { fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em' },

  filterBar: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  filterSelect: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-btn)',
    color: 'var(--text)',
    fontSize: '0.82rem',
    padding: '8px 12px',
    cursor: 'pointer',
    outline: 'none',
    flex: '1 1 130px',
    minWidth: 0,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-faint)',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0.4rem 0.5rem',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
    flexShrink: 0,
  },
  clearBtnCenter: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-muted)',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0.5rem 1rem',
    marginTop: '0.75rem',
  },

  loadingWrap: { display: 'flex', flexDirection: 'column', gap: '1rem' },
}
