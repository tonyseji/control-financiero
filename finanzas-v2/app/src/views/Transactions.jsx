import { useState, useMemo } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { formatCurrency, monthRange } from '../utils/formatters'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'income',  label: 'Ingresos' },
  { value: 'expense', label: 'Gastos' },
]

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
          <p style={s.headerSub}>Historial</p>
          <h1 style={s.headerTitle}>{MONTH_NAMES[month - 1]} {year}</h1>
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
          <SummaryPill label="Ingresos" value={`+${formatCurrency(income)}`}   color="var(--income)"  bg="var(--income-soft)" />
          <SummaryPill label="Gastos"   value={`−${formatCurrency(expenses)}`} color="var(--expense)" bg="var(--expense-soft)" />
          <SummaryPill
            label="Balance"
            value={`${balance >= 0 ? '+' : '−'}${formatCurrency(Math.abs(balance))}`}
            color={balance >= 0 ? 'var(--income)' : 'var(--expense)'}
            bg={balance >= 0 ? 'var(--income-soft)' : 'var(--expense-soft)'}
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
            <div key={i} style={s.loadingGroup}>
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
        <div style={s.emptyState}>
          <p style={s.emptyIcon}>📭</p>
          {hasFilter
            ? <>
                <p style={s.emptyText}>Sin resultados con estos filtros</p>
                <button style={s.clearBtnCenter} onClick={clearFilters}>Quitar filtros</button>
              </>
            : <>
                <p style={s.emptyText}>Sin movimientos en {MONTH_NAMES[month - 1]}</p>
                <p style={s.emptyHint}>Usa el botón Añadir para registrar tu primer movimiento</p>
              </>
          }
        </div>
      )}

      {/* ── Grupos por fecha ──────────────────────────────────────────────── */}
      {grouped.map(([date, txs]) => {
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
              {txs.map(tx => <TxRow key={tx.tx_id} tx={tx} onDelete={remove} onEdit={onEdit} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function SummaryPill({ label, value, color, bg }) {
  return (
    <div style={{ ...s.summaryPill, background: bg, border: `1px solid ${color}22` }}>
      <span style={{ ...s.pillLabel, color: `${color}99` }}>{label}</span>
      <span style={{ ...s.pillValue, color }} className="num">{value}</span>
    </div>
  )
}

function TxRow({ tx, onDelete, onEdit }) {
  const isIncome   = tx.tx_type === 'income'
  const isTransfer = !!tx.tx_transfer_pair_id
  const [confirming, setConfirming] = useState(false)

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    await onDelete(tx.tx_id)
  }

  return (
    <div style={s.txRow}>
      <div style={{ ...s.txDotWrap, background: isIncome ? 'var(--income-soft)' : 'var(--expense-soft)' }}>
        <span style={{ ...s.txDot, background: tx.categories?.cat_color ?? 'var(--border)' }} />
      </div>
      <div style={s.txInfo}>
        <p style={s.txNote}>{tx.tx_notes || tx.categories?.cat_name || '—'}</p>
        <p style={s.txMeta}>
          <span className={`tx-badge ${isIncome ? 'tx-badge-income' : 'tx-badge-expense'}`}>
            {isTransfer ? 'Transf.' : isIncome ? 'Ingreso' : 'Gasto'}
          </span>
          {tx.categories?.cat_name ? ` ${tx.categories.cat_name}` : ''}
          {tx.accounts?.acc_name   ? ` · ${tx.accounts.acc_name}` : ''}
          {tx.tx_is_pending ? <span style={s.pendingBadge}>Pendiente</span> : null}
        </p>
      </div>
      <div style={s.txRight}>
        <span
          style={{ ...s.txAmount, color: isIncome ? 'var(--income)' : 'var(--expense)' }}
          className="num"
        >
          {isIncome ? '+' : '−'}{formatCurrency(tx.tx_amount)}
        </span>
        <div style={s.txActions}>
          {!isTransfer && onEdit && (
            <button style={s.actionBtn} onClick={() => onEdit(tx)} title="Editar">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
          <button
            style={{ ...s.actionBtn, ...(confirming ? s.actionBtnDelete : {}) }}
            onClick={handleDelete}
            title={confirming ? 'Confirmar' : 'Eliminar'}
          >
            {confirming
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
            }
          </button>
        </div>
      </div>
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
  headerSub: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.2rem',
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

  summary: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  summaryPill: {
    flex: '1 1 100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.6rem 0.75rem',
    borderRadius: 10,
    gap: 2,
  },
  pillLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  pillValue: {
    fontSize: '0.95rem',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },

  // Barra de filtros
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  filterSelect: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: '0.82rem',
    padding: '0.4rem 0.65rem',
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

  loadingWrap:  { display: 'flex', flexDirection: 'column', gap: '1rem' },
  loadingGroup: {},

  emptyState: {
    textAlign: 'center',
    padding: '4rem 1rem',
  },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '0.75rem' },
  emptyText: { color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' },
  emptyHint: { color: 'var(--text-faint)', fontSize: '0.82rem' },

  group: { marginBottom: '1.5rem' },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
    paddingBottom: '0.4rem',
    borderBottom: '1px solid var(--border)',
  },
  groupDate: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  groupNet: {
    fontSize: '0.78rem',
    fontWeight: 700,
  },
  groupBody: { display: 'flex', flexDirection: 'column', gap: 3 },

  txRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 0.875rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    transition: 'border-color var(--transition)',
  },
  txDotWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  txInfo: { flex: 1, minWidth: 0 },
  txNote: {
    fontSize: '0.875rem',
    color: 'var(--text)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  txMeta: {
    fontSize: '0.72rem',
    color: 'var(--text-faint)',
    marginTop: 2,
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  pendingBadge: {
    background: 'rgba(227,179,65,0.15)',
    color: 'var(--warning)',
    fontSize: '0.65rem',
    fontWeight: 600,
    padding: '1px 5px',
    borderRadius: 4,
    letterSpacing: '0.03em',
  },
  txRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.3rem',
    flexShrink: 0,
  },
  txAmount: {
    fontSize: '0.9rem',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  txActions: {
    display: 'flex',
    gap: '0.2rem',
  },
  actionBtn: {
    background: 'none',
    border: '1px solid transparent',
    color: 'var(--text-faint)',
    cursor: 'pointer',
    padding: '3px 5px',
    borderRadius: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color var(--transition), border-color var(--transition)',
  },
  actionBtnDelete: {
    color: 'var(--expense)',
    borderColor: 'var(--expense-soft)',
  },
}
