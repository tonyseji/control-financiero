import { useState } from 'react'
import { useAccounts } from '../hooks/useAccounts'
import { formatCurrency } from '../utils/formatters'
import { ACC_TYPE_LABELS } from '../utils/constants'

export default function Accounts() {
  const { accounts, loading, add, remove } = useAccounts()
  const [showForm, setShowForm] = useState(false)
  const [name, setName]         = useState('')
  const [type, setType]         = useState('bank')
  const [balance, setBalance]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  async function handleAdd(e) {
    e.preventDefault()
    if (!name) return
    setSaving(true)
    setError(null)
    try {
      await add({ acc_name: name, acc_type: type, acc_initial_balance: parseFloat(balance) || 0 })
      setName(''); setType('bank'); setBalance('')
      setShowForm(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Cuentas</h1>
        <button style={s.addBtn} onClick={() => setShowForm(f => !f)}>
          {showForm ? 'Cancelar' : '+ Nueva cuenta'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={s.form}>
          <input style={s.input} placeholder="Nombre de la cuenta" value={name} onChange={e => setName(e.target.value)} required autoFocus />
          <select style={s.input} value={type} onChange={e => setType(e.target.value)}>
            {Object.entries(ACC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input style={s.input} type="number" step="0.01" placeholder="Saldo inicial (€) — opcional" value={balance} onChange={e => setBalance(e.target.value)} />
          {error && <p style={s.error}>{error}</p>}
          <button style={s.submitBtn} type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Crear cuenta'}</button>
        </form>
      )}

      {loading && <p style={s.empty}>Cargando...</p>}
      {!loading && accounts.length === 0 && <p style={s.empty}>No hay cuentas creadas aún</p>}

      {accounts.map(acc => <AccountRow key={acc.acc_id} acc={acc} onDelete={remove} />)}
    </div>
  )
}

function AccountRow({ acc, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div style={s.row}>
      <div>
        <p style={s.accName}>{acc.acc_name}</p>
        <p style={s.accType}>{ACC_TYPE_LABELS[acc.acc_type] ?? acc.acc_type}</p>
      </div>
      <div style={s.rowRight}>
        <span style={{ ...s.balance, color: acc.acc_current_balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
          {formatCurrency(acc.acc_current_balance ?? 0)}
        </span>
        <button
          style={{ ...s.deleteBtn, ...(confirming ? s.deleteBtnConfirm : {}) }}
          onClick={() => confirming ? onDelete(acc.acc_id) : setConfirming(true)}
        >
          {confirming ? '¿Seguro?' : '×'}
        </button>
      </div>
    </div>
  )
}

const s = {
  page: { maxWidth: 600, margin: '0 auto', paddingBottom: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: {
    fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em',
  },
  addBtn: {
    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
    padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
    fontFamily: 'inherit',
  },

  form: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
    boxShadow: 'var(--shadow)',
  },
  input: {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '0.7rem 0.9rem', color: 'var(--text)', fontSize: '0.9rem', outline: 'none',
    fontFamily: 'inherit',
  },
  error: { color: 'var(--expense)', fontSize: '0.85rem', margin: 0 },
  submitBtn: {
    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
    padding: '0.7rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit',
  },

  empty: { color: 'var(--text-faint)', fontSize: '0.9rem', padding: '2rem 0', textAlign: 'center' },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: 8,
    boxShadow: 'var(--shadow)',
  },
  accName:  { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' },
  accType:  { fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 2 },
  rowRight: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  balance:  { fontSize: '1rem', fontWeight: 700 },
  deleteBtn: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)',
    borderRadius: 6, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem',
    transition: 'border-color var(--transition), color var(--transition)',
  },
  deleteBtnConfirm: { borderColor: 'var(--expense)', color: 'var(--expense)' },
}
