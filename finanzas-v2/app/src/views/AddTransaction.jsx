import { useState, useEffect } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'

const today = () => new Date().toISOString().slice(0, 10)

export default function AddTransaction({ onSuccess, editTx }) {
  const isEdit = !!editTx
  const { add, update, addTransfer } = useTransactions()
  const { accounts } = useAccounts()
  const { categories } = useCategories()

  const [type, setType]       = useState(editTx?.tx_type ?? 'expense')
  const [amount, setAmount]   = useState(editTx ? String(editTx.tx_amount) : '')
  const [date, setDate]       = useState(editTx?.tx_date?.slice(0, 10) ?? today())
  const [catId, setCatId]     = useState(editTx?.tx_cat_id ?? '')
  const [accId, setAccId]     = useState(editTx?.tx_acc_id ?? '')
  const [toAccId, setToAccId] = useState('')
  const [notes, setNotes]     = useState(editTx?.tx_notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const isTransfer = type === 'transfer'

  const filteredCats = categories.filter(c =>
    type === 'income' ? c.cat_type === 'income' : c.cat_type !== 'income'
  )

  useEffect(() => {
    if (!isEdit && accounts.length === 1 && !accId) setAccId(accounts[0].acc_id)
  }, [accounts])

  useEffect(() => {
    if (isEdit) return
    const first = filteredCats[0]
    setCatId(first ? first.cat_id : '')
  }, [type, categories])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!amount) { setError('El importe es obligatorio'); return }
    if (isTransfer && !toAccId) { setError('Selecciona la cuenta destino'); return }
    if (!isTransfer && !catId) { setError('Selecciona una categoría'); return }
    if (!accId) { setError('Selecciona una cuenta'); return }

    setError(null)
    setLoading(true)
    try {
      if (isEdit) {
        await update(editTx.tx_id, {
          tx_type:   type,
          tx_amount: parseFloat(amount),
          tx_date:   date,
          tx_cat_id: catId || null,
          tx_acc_id: accId,
          tx_notes:  notes || null,
        })
      } else if (isTransfer) {
        await addTransfer({
          fromAccId: accId,
          toAccId,
          amount:    parseFloat(amount),
          date,
          notes:     notes || null,
        })
      } else {
        await add({
          tx_type:   type,
          tx_amount: parseFloat(amount),
          tx_date:   date,
          tx_cat_id: catId,
          tx_acc_id: accId,
          tx_notes:  notes || null,
          tx_source: 'manual',
        })
      }
      onSuccess?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Colors by type
  const typeColor = type === 'income' ? 'var(--income)' : type === 'transfer' ? 'var(--accent)' : 'var(--expense)'
  const typeBg    = type === 'income' ? 'var(--income-soft)' : type === 'transfer' ? 'var(--accent-soft)' : 'var(--expense-soft)'

  return (
    <div style={s.page}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <p style={s.headerSub}>{isEdit ? 'Editar' : 'Nuevo'}</p>
        <h1 style={s.headerTitle}>{isEdit ? 'Editar movimiento' : 'Añadir movimiento'}</h1>
      </div>

      {/* ── Type toggle ──────────────────────────────────────────────────── */}
      {!isEdit && (
        <div style={s.typeToggle}>
          <TypeButton active={type === 'expense'}  onClick={() => setType('expense')}  label="Gasto" />
          <TypeButton active={type === 'income'}   onClick={() => setType('income')}   label="Ingreso" />
          <TypeButton active={type === 'transfer'} onClick={() => setType('transfer')} label="Transferencia" />
        </div>
      )}

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={s.form}>

        {/* Importe — grande y prominente */}
        <div style={s.amountWrap}>
          <label style={s.amountLabel}>Importe</label>
          <div style={s.amountInputWrap}>
            <span style={s.amountCurrency}>€</span>
            <input
              style={{ ...s.amountInput, caretColor: typeColor }}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>
        </div>

        {/* Fecha */}
        <FormField label="Fecha">
          <input
            style={s.input}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </FormField>

        {/* Cuenta origen */}
        <FormField label={isTransfer ? 'Cuenta origen' : 'Cuenta'}>
          <select style={s.input} value={accId} onChange={e => setAccId(e.target.value)} required>
            <option value="">— Selecciona —</option>
            {accounts.map(a => <option key={a.acc_id} value={a.acc_id}>{a.acc_name}</option>)}
          </select>
        </FormField>

        {/* Cuenta destino */}
        {isTransfer && (
          <FormField label="Cuenta destino">
            <select style={s.input} value={toAccId} onChange={e => setToAccId(e.target.value)} required>
              <option value="">— Selecciona —</option>
              {accounts.filter(a => a.acc_id !== accId).map(a => (
                <option key={a.acc_id} value={a.acc_id}>{a.acc_name}</option>
              ))}
            </select>
          </FormField>
        )}

        {/* Categoría */}
        {!isTransfer && (
          <FormField label="Categoría">
            <select style={s.input} value={catId} onChange={e => setCatId(e.target.value)} required>
              <option value="">— Selecciona —</option>
              {filteredCats.map(c => <option key={c.cat_id} value={c.cat_id}>{c.cat_name}</option>)}
            </select>
          </FormField>
        )}

        {/* Nota */}
        <FormField label="Nota (opcional)">
          <input
            style={s.input}
            type="text"
            placeholder="Descripción del movimiento..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={200}
          />
        </FormField>

        {/* Error */}
        {error && (
          <div style={s.errorBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          style={{ ...s.submitBtn, background: 'var(--accent)', boxShadow: '0 4px 20px var(--accent-glow)' }}
          type="submit"
          disabled={loading}
        >
          {loading
            ? <span style={s.btnSpinner}>Guardando…</span>
            : (isEdit ? 'Guardar cambios' : `Añadir ${labelType(type)}`)
          }
        </button>
      </form>
    </div>
  )
}

function TypeButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...s.typeBtn,
        ...(active ? {
          background: 'var(--accent)',
          color: '#fff',
          boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
        } : {}),
      }}
    >
      {label}
    </button>
  )
}

function FormField({ label, children }) {
  return (
    <label style={s.field}>
      <span style={s.fieldLabel}>{label}</span>
      {children}
    </label>
  )
}

function labelType(type) {
  return type === 'income' ? 'ingreso' : type === 'transfer' ? 'transferencia' : 'gasto'
}

const s = {
  page: { maxWidth: 520, margin: '0 auto', paddingBottom: '2rem' },

  header: { marginBottom: '1.5rem' },
  headerSub: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.25rem',
  },
  headerTitle: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '-0.03em',
  },

  // Type toggle — segmented control
  typeToggle: {
    display: 'flex',
    gap: 0,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '3px',
    marginBottom: '1.5rem',
  },
  typeBtn: {
    flex: 1,
    padding: '0.6rem 0.5rem',
    borderRadius: 9,
    border: 'none',
    background: 'none',
    color: 'var(--text-muted)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.85rem',
    transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  },

  // Amount field — hero input centrado
  amountWrap: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1.5rem 1.5rem 1.25rem',
    marginBottom: '0.25rem',
    textAlign: 'center',
  },
  amountLabel: {
    fontSize: '0.68rem',
    color: 'var(--text-faint)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    display: 'block',
    marginBottom: '0.875rem',
  },
  amountInputWrap: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '0.25rem',
  },
  amountCurrency: {
    fontSize: '1.75rem',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1,
    userSelect: 'none',
    color: 'var(--text-muted)',
    paddingBottom: '0.1em',
  },
  amountInput: {
    background: 'none',
    border: 'none',
    color: 'var(--text)',
    fontSize: '2.75rem',
    fontWeight: 800,
    letterSpacing: '-0.04em',
    padding: 0,
    outline: 'none',
    width: '180px',
    fontFamily: 'inherit',
    textAlign: 'center',
    caretColor: 'var(--accent)',
  },

  // Regular fields
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  fieldLabel: {
    fontSize: 'var(--text-sm)',
    color: 'var(--text-muted)',
    fontWeight: 500,
    letterSpacing: '0.02em',
  },
  input: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-btn)',
    padding: '10px 14px',
    color: 'var(--text)',
    fontSize: '0.9rem',
    width: '100%',
    appearance: 'none',
    WebkitAppearance: 'none',
  },

  // Error
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'var(--expense-soft)',
    border: '1px solid rgba(248,81,73,0.2)',
    borderRadius: 8,
    padding: '0.6rem 0.9rem',
    color: 'var(--expense)',
    fontSize: '0.85rem',
    fontWeight: 500,
  },

  // Submit
  submitBtn: {
    width: '100%',
    padding: '0.875rem',
    borderRadius: 10,
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '0.5rem',
    color: '#fff',
    transition: 'opacity var(--transition)',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  },
  btnSpinner: { opacity: 0.7 },
}
