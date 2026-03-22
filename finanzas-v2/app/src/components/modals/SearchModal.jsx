import { useState, useEffect, useRef, useMemo } from 'react'
import { getTransactions } from '../../services/transactions'

const TYPE_OPTIONS = [
  { value: '',         label: 'Todos los tipos' },
  { value: 'expense',  label: 'Gastos' },
  { value: 'income',   label: 'Ingresos' },
  { value: 'transfer', label: 'Transferencias' },
]

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))
}

export default function SearchModal({ onClose }) {
  const [query,  setQuery]  = useState('')
  const [typeF,  setTypeF]  = useState('')
  const [yearF,  setYearF]  = useState('')
  const [allTx,  setAllTx]  = useState([])
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)

  // Cargar todas las transacciones una vez al abrir
  useEffect(() => {
    getTransactions()
      .then(setAllTx)
      .catch(() => setAllTx([]))
      .finally(() => setLoading(false))
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  // Cerrar con Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  // Años disponibles
  const years = useMemo(() => {
    const set = new Set()
    allTx.forEach(t => { const y = t.tx_date?.slice(0, 4); if (y) set.add(y) })
    return [...set].sort((a, b) => b - a)
  }, [allTx])

  const q = query.trim().toLowerCase()
  const hasFilter = q.length >= 2 || typeF || yearF

  // Resultados filtrados
  const results = useMemo(() => {
    if (!hasFilter) return null
    return allTx.filter(t => {
      if (typeF && t.tx_type !== typeF) return false
      if (yearF && t.tx_date?.slice(0, 4) !== yearF) return false
      if (q) {
        const note = (t.tx_notes ?? '').toLowerCase()
        const cat  = (t.categories?.cat_name ?? '').toLowerCase()
        return note.includes(q) || cat.includes(q)
      }
      return true
    }).sort((a, b) => (b.tx_date ?? '').localeCompare(a.tx_date ?? ''))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTx, q, typeF, yearF])

  // Agrupar por mes
  const grouped = useMemo(() => {
    if (!results?.length) return []
    const map = {}
    results.forEach(t => {
      const key = t.tx_date?.slice(0, 7)
      if (!key) return
      ;(map[key] = map[key] || []).push(t)
    })
    return Object.keys(map)
      .sort((a, b) => b.localeCompare(a))
      .map(key => {
        const [y, m] = key.split('-').map(Number)
        const label  = new Date(y, m - 1, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' })
        const txs    = map[key]
        const net    = txs.reduce((s, t) => s + (t.tx_type === 'income' ? t.tx_amount : -t.tx_amount), 0)
        return { key, label, txs, net }
      })
  }, [results])

  const totalNet = results
    ? results.reduce((s, t) => s + (t.tx_type === 'income' ? t.tx_amount : -t.tx_amount), 0)
    : 0

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <IconSearch size={16} />
            <span style={s.headerTitle}>Búsqueda global</span>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Input */}
        <div style={s.searchBar}>
          <div style={s.inputWrap}>
            <span style={s.inputIcon}><IconSearch size={16} /></span>
            <input
              ref={inputRef}
              style={s.input}
              type="text"
              placeholder="Buscar por nota o categoría…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button style={s.clearBtn} onClick={() => setQuery('')}>✕</button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div style={s.filters}>
          <select style={s.select} value={typeF} onChange={e => setTypeF(e.target.value)}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select style={s.select} value={yearF} onChange={e => setYearF(e.target.value)}>
            <option value="">Todos los años</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Resultados */}
        <div style={s.results}>
          {loading && <p style={s.hint}>Cargando transacciones…</p>}

          {!loading && !hasFilter && (
            <p style={s.hint}>Escribe al menos 2 caracteres o aplica un filtro para buscar</p>
          )}

          {!loading && hasFilter && results?.length === 0 && (
            <p style={s.hint}>Sin resultados para esta búsqueda</p>
          )}

          {!loading && results?.length > 0 && (
            <>
              {/* Summary */}
              <div style={s.summary}>
                <span>{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
                <span>
                  Balance:{' '}
                  <strong style={{ color: totalNet >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                    {totalNet >= 0 ? '+' : '-'}€{fmt(totalNet)}
                  </strong>
                </span>
              </div>

              {/* Grupos por mes */}
              {grouped.map(({ key, label, txs, net }) => (
                <div key={key} style={s.monthGroup}>
                  <div style={s.monthHeader}>
                    <span style={s.monthLabel}>{label}</span>
                    <span style={s.monthMeta}>
                      {txs.length} mov ·{' '}
                      <span style={{ color: net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                        {net >= 0 ? '+' : '-'}€{fmt(net)}
                      </span>
                    </span>
                  </div>
                  {txs.map(t => <TxRow key={t.tx_id} tx={t} />)}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TxRow({ tx }) {
  const isIncome   = tx.tx_type === 'income'
  const isTransfer = tx.tx_type === 'transfer'
  const color = isIncome ? 'var(--income)' : isTransfer ? 'var(--accent)' : 'var(--expense)'
  const bg    = isIncome ? 'var(--income-soft)' : isTransfer ? 'var(--accent-soft)' : 'var(--expense-soft)'
  const sign  = isIncome ? '+' : '-'
  const label = isIncome ? 'Ingreso' : isTransfer ? 'Transfer' : 'Gasto'

  const dateStr = tx.tx_date
    ? new Date(tx.tx_date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    : ''

  const catName = tx.categories?.cat_name
  const note    = tx.tx_notes

  return (
    <div style={s.txRow}>
      <div style={s.txLeft}>
        <span style={s.txDate}>{dateStr}</span>
        <div style={s.txInfo}>
          {catName && <span style={s.txCat}>{catName}</span>}
          {note    && <span style={s.txNote}>{note}</span>}
          {!catName && !note && <span style={s.txNote}>Sin descripción</span>}
        </div>
      </div>
      <div style={s.txRight}>
        <span style={{ ...s.txBadge, background: bg, color }}>{label}</span>
        <span style={{ ...s.txAmount, color }}>
          {sign}€{new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(tx.tx_amount)}
        </span>
      </div>
    </div>
  )
}

function IconSearch({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.72)',
    backdropFilter: 'blur(4px)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '4vh 1rem',
    overflowY: 'auto',
  },
  modal: {
    width: '100%', maxWidth: 640,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflow: 'hidden',
  },

  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.875rem 1.25rem',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    color: 'var(--text-muted)',
  },
  headerTitle: {
    fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)',
  },
  closeBtn: {
    background: 'none', border: 'none',
    color: 'var(--text-faint)', cursor: 'pointer',
    fontSize: '0.9rem', padding: '0.2rem 0.4rem', borderRadius: 4,
  },

  searchBar: {
    padding: '0.75rem 1.25rem 0.5rem',
    flexShrink: 0,
  },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0 0.75rem',
  },
  inputIcon: { color: 'var(--text-faint)', display: 'flex', flexShrink: 0 },
  input: {
    flex: 1, background: 'none', border: 'none',
    color: 'var(--text)', fontSize: '0.95rem',
    padding: '0.65rem 0', outline: 'none',
    fontFamily: 'inherit',
  },
  clearBtn: {
    background: 'none', border: 'none',
    color: 'var(--text-faint)', cursor: 'pointer',
    fontSize: '0.75rem', padding: '0.2rem', lineHeight: 1,
  },

  filters: {
    display: 'flex', gap: '0.5rem',
    padding: '0 1.25rem 0.75rem',
    flexShrink: 0,
  },
  select: {
    flex: 1,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    fontSize: '0.82rem',
    padding: '0.4rem 0.6rem',
    cursor: 'pointer',
  },

  results: {
    flex: 1, overflowY: 'auto',
    padding: '0 1.25rem 1.25rem',
  },
  hint: {
    color: 'var(--text-faint)', fontSize: '0.88rem',
    textAlign: 'center', padding: '2.5rem 1rem',
  },

  summary: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: '0.78rem', color: 'var(--text-muted)',
    padding: '0.5rem 0 0.75rem',
    borderBottom: '1px solid var(--border-soft)',
    marginBottom: '0.25rem',
  },

  monthGroup: { marginBottom: '0.25rem' },
  monthHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.75rem 0 0.35rem',
  },
  monthLabel: {
    fontSize: '0.75rem', fontWeight: 700,
    color: 'var(--text-muted)', textTransform: 'capitalize',
  },
  monthMeta: { fontSize: '0.73rem', color: 'var(--text-faint)' },

  txRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: '0.75rem', padding: '0.55rem 0.75rem',
    borderRadius: 'var(--radius-sm)', marginBottom: 2,
    background: 'var(--bg)', border: '1px solid var(--border-soft)',
  },
  txLeft: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    minWidth: 0, flex: 1,
  },
  txDate: {
    fontSize: '0.7rem', color: 'var(--text-faint)',
    flexShrink: 0, width: 38, textAlign: 'center',
  },
  txInfo: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  txCat: {
    fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  txNote: {
    fontSize: '0.75rem', color: 'var(--text-muted)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  txRight: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    gap: 3, flexShrink: 0,
  },
  txBadge: {
    fontSize: '0.6rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.04em',
    padding: '1px 6px', borderRadius: 20,
  },
  txAmount: {
    fontSize: '0.88rem', fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
}
