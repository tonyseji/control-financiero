import { useState, useMemo } from 'react'
import { useAccounts } from '../hooks/useAccounts'
import { useDemoData } from '../hooks/useDemoData'
import { formatCurrency } from '../utils/formatters'
import { ACC_TYPE_LABELS } from '../utils/constants'

const TYPE_COLORS = {
  bank:        { bg: 'var(--accent-soft)',   color: 'var(--accent)' },
  cash:        { bg: 'var(--income-soft)',   color: 'var(--income)' },
  credit_card: { bg: 'var(--expense-soft)',  color: 'var(--expense)' },
  savings:     { bg: 'var(--cyan-soft)',     color: 'var(--cyan)' },
  investment:  { bg: 'var(--purple-soft)',   color: 'var(--purple)' },
}

export default function Accounts() {
  const { accounts, loading, add, update, remove } = useAccounts()
  const { demoTxs, demoActive } = useDemoData()
  const [showForm, setShowForm] = useState(false)
  const [name,    setName]    = useState('')
  const [type,    setType]    = useState('bank')
  const [balance, setBalance] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  // Delta de transacciones demo (solo mientras están activas)
  const demoDelta = useMemo(() => {
    if (!demoActive) return 0
    return demoTxs.reduce((s, tx) => tx.tx_type === 'income' ? s + tx.tx_amount : s - tx.tx_amount, 0)
  }, [demoTxs, demoActive])

  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + (a.acc_current_balance ?? 0), 0) + demoDelta,
    [accounts, demoDelta]
  )

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true); setError(null)
    try {
      await add({ acc_name: name.trim(), acc_type: type, acc_initial_balance: parseFloat(balance) || 0 })
      setName(''); setType('bank'); setBalance('')
      setShowForm(false)
    } catch (e) { setError(e.message) }
    finally     { setSaving(false) }
  }

  return (
    <div style={s.page}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <p style={s.headerSup}>Patrimonio</p>
          <h1 style={s.headerTitle}>Cuentas</h1>
        </div>
        <button style={s.addBtn} onClick={() => setShowForm(f => !f)}>
          {showForm ? 'Cancelar' : '+ Nueva cuenta'}
        </button>
      </div>

      {/* ── Hero balance total ────────────────────────────────────────────── */}
      {!loading && accounts.length > 0 && (
        <div style={s.heroCard}>
          <p style={s.heroLabel}>Balance total</p>
          <p style={{ ...s.heroValue, color: totalBalance >= 0 ? 'var(--income)' : 'var(--expense)' }} className="num">
            {totalBalance >= 0 ? '' : '−'}{formatCurrency(Math.abs(totalBalance))}
          </p>
          <p style={s.heroSub}>{accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* ── Formulario nueva cuenta ──────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleAdd} style={s.form}>
          <p style={s.formTitle}>Nueva cuenta</p>
          <div style={s.formRow}>
            <input
              style={s.input}
              placeholder="Nombre (ej: Cuenta BBVA)"
              value={name}
              onChange={e => setName(e.target.value)}
              required autoFocus
            />
            <select style={s.input} value={type} onChange={e => setType(e.target.value)}>
              {Object.entries(ACC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input
              style={s.input}
              type="number" step="0.01"
              placeholder="Saldo inicial (€)"
              value={balance}
              onChange={e => setBalance(e.target.value)}
            />
          </div>
          {error && <p style={s.errMsg}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={s.submitBtn} type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Crear cuenta'}
            </button>
            <button style={s.cancelBtn} type="button" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <div style={s.grid}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
        </div>
      )}

      {/* ── Empty ────────────────────────────────────────────────────────── */}
      {!loading && accounts.length === 0 && (
        <div className="empty-state">
          <div className="ei">🏦</div>
          <p>No hay cuentas creadas aún</p>
          <button style={s.addBtn} onClick={() => setShowForm(true)}>Crear primera cuenta</button>
        </div>
      )}

      {/* ── Grid de cuentas ──────────────────────────────────────────────── */}
      {!loading && accounts.length > 0 && (
        <div style={s.grid}>
          {accounts.map((acc, i) => (
            <AccountCard key={acc.acc_id} acc={acc} onUpdate={update} onDelete={remove} demoDelta={i === 0 ? demoDelta : 0} />
          ))}
        </div>
      )}
    </div>
  )
}

function AccountCard({ acc, onUpdate, onDelete, demoDelta = 0 }) {
  const [editing,    setEditing]    = useState(false)
  const [editName,   setEditName]   = useState(acc.acc_name)
  const [editType,   setEditType]   = useState(acc.acc_type)
  const [saving,     setSaving]     = useState(false)
  const [confirming, setConfirming] = useState(false)

  const typeStyle = TYPE_COLORS[acc.acc_type] ?? TYPE_COLORS.bank
  const displayBalance = (acc.acc_current_balance ?? 0) + demoDelta
  const isNeg = displayBalance < 0

  async function handleSave() {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await onUpdate(acc.acc_id, { acc_name: editName.trim(), acc_type: editType })
      setEditing(false)
    } finally { setSaving(false) }
  }

  function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    onDelete(acc.acc_id)
  }

  return (
    <div style={s.card}>
      {/* Tipo badge */}
      <div style={{ ...s.typeBadge, background: typeStyle.bg, color: typeStyle.color }}>
        {ACC_TYPE_LABELS[acc.acc_type] ?? acc.acc_type}
      </div>

      {editing ? (
        <div style={s.editArea}>
          <input
            style={s.editInput}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          />
          <select style={s.editInput} value={editType} onChange={e => setEditType(e.target.value)}>
            {Object.entries(ACC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? '…' : 'Guardar'}</button>
            <button style={s.cancelEditBtn} onClick={() => { setEditing(false); setEditName(acc.acc_name); setEditType(acc.acc_type) }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <p style={s.accName}>{acc.acc_name}</p>
          <p style={{ ...s.accBalance, color: isNeg ? 'var(--expense)' : 'var(--income)' }} className="num">
            {isNeg ? '−' : ''}{formatCurrency(Math.abs(displayBalance))}
          </p>
        </>
      )}

      {/* Acciones */}
      {!editing && (
        <div style={s.cardActions}>
          <button style={s.editBtn} onClick={() => { setEditing(true); setConfirming(false) }}>Editar</button>
          <button
            style={{ ...s.delBtn, ...(confirming ? s.delBtnConfirm : {}) }}
            onClick={handleDelete}
          >
            {confirming ? '¿Seguro?' : 'Eliminar'}
          </button>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { maxWidth: 680, margin: '0 auto', paddingBottom: '2rem' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' },
  headerSup: { fontSize: '0.67rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.15rem' },
  headerTitle: { fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' },
  addBtn: {
    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
    padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
    fontFamily: 'inherit', flexShrink: 0,
  },

  heroCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '1.5rem 1.75rem',
    marginBottom: '1.5rem',
    boxShadow: 'var(--shadow-card)',
    textAlign: 'center',
  },
  heroLabel: { fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', marginBottom: '0.4rem', textAlign: 'center' },
  heroValue: { fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.25rem', textAlign: 'center' },
  heroSub:   { fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' },

  form: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '1.25rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-card)',
  },
  formTitle: { fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.75rem' },
  formRow: { display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' },
  input: {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '0.65rem 0.9rem', color: 'var(--text)', fontSize: '0.88rem',
    outline: 'none', fontFamily: 'inherit',
  },
  errMsg: { color: 'var(--expense)', fontSize: '0.82rem', margin: '0 0 0.5rem' },
  submitBtn: {
    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
    padding: '0.6rem 1.25rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit',
  },
  cancelBtn: {
    background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '0.6rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit',
  },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' },

  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '1.25rem', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '0.4rem',
    transition: 'box-shadow var(--transition)',
  },
  typeBadge: {
    display: 'inline-block', alignSelf: 'flex-start',
    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
    padding: '0.2rem 0.5rem', borderRadius: 6, marginBottom: '0.35rem',
  },
  accName: { fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)', margin: 0 },
  accBalance: { fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.025em', margin: 0, lineHeight: 1.2 },

  cardActions: { display: 'flex', gap: '0.4rem', marginTop: '0.5rem' },
  editBtn: {
    background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)',
    borderRadius: 6, padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.75rem',
    fontWeight: 600, fontFamily: 'inherit',
  },
  delBtn: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)',
    borderRadius: 6, padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.75rem',
    fontWeight: 600, fontFamily: 'inherit',
    transition: 'border-color var(--transition), color var(--transition)',
  },
  delBtnConfirm: { borderColor: 'var(--expense)', color: 'var(--expense)' },

  editArea: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  editInput: {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6,
    padding: '0.5rem 0.7rem', color: 'var(--text)', fontSize: '0.85rem',
    outline: 'none', fontFamily: 'inherit',
  },
  saveBtn: {
    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6,
    padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit',
  },
  cancelEditBtn: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)',
    borderRadius: 6, padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.75rem',
    fontWeight: 600, fontFamily: 'inherit',
  },
}
