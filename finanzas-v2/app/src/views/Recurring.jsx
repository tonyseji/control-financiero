import { useState } from 'react'
import { useRecurring } from '../hooks/useRecurring'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency } from '../utils/formatters'
import { FREQUENCY_LABELS } from '../utils/constants'

export default function Recurring() {
  const { recurring, loading, add, toggle, remove } = useRecurring()
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const [showForm, setShowForm] = useState(false)

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Recurrentes</h1>
        <button style={s.addBtn} onClick={() => setShowForm(f => !f)}>
          {showForm ? 'Cancelar' : '+ Nueva'}
        </button>
      </div>

      {showForm && (
        <RecurringForm
          accounts={accounts}
          categories={categories}
          onSave={async (rec) => { await add(rec); setShowForm(false) }}
        />
      )}

      {loading && <p style={s.empty}>Cargando...</p>}
      {!loading && recurring.length === 0 && !showForm && (
        <p style={s.empty}>No hay transacciones recurrentes configuradas.</p>
      )}

      {recurring.map(rec => (
        <RecurringRow
          key={rec.rec_id}
          rec={rec}
          onToggle={toggle}
          onDelete={remove}
        />
      ))}
    </div>
  )
}

function RecurringForm({ accounts, categories, onSave }) {
  const [name, setName]         = useState('')
  const [type, setType]         = useState('expense')
  const [amount, setAmount]     = useState('')
  const [frequency, setFreq]    = useState('monthly')
  const [dayOfMonth, setDay]    = useState(1)
  const [accId, setAccId]       = useState('')
  const [catId, setCatId]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  const filteredCats = categories.filter(c =>
    type === 'income' ? c.cat_type === 'income' : c.cat_type !== 'income'
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name || !amount || !accId) { setError('Rellena nombre, importe y cuenta'); return }
    setSaving(true); setError(null)
    try {
      await onSave({
        rec_name:       name,
        rec_type:       type,
        rec_amount:     parseFloat(amount),
        rec_frequency:  frequency,
        rec_day_of_month: frequency === 'monthly' ? Number(dayOfMonth) : null,
        rec_acc_id:     accId,
        rec_cat_id:     catId || null,
        rec_is_active:  true,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={s.form}>
      <label style={s.label}>
        Nombre *
        <input style={s.input} placeholder="Ej: Netflix, Alquiler..." value={name} onChange={e => setName(e.target.value)} required />
      </label>

      <div style={s.row2}>
        <label style={s.label}>
          Tipo
          <select style={s.input} value={type} onChange={e => setType(e.target.value)}>
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
        </label>
        <label style={s.label}>
          Importe (€) *
          <input style={s.input} type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
        </label>
      </div>

      <div style={s.row2}>
        <label style={s.label}>
          Frecuencia
          <select style={s.input} value={frequency} onChange={e => setFreq(e.target.value)}>
            {Object.entries(FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        {frequency === 'monthly' && (
          <label style={s.label}>
            Día del mes
            <input style={s.input} type="number" min="1" max="31" value={dayOfMonth} onChange={e => setDay(e.target.value)} />
          </label>
        )}
      </div>

      <label style={s.label}>
        Cuenta *
        <select style={s.input} value={accId} onChange={e => setAccId(e.target.value)} required>
          <option value="">— Selecciona —</option>
          {accounts.map(a => <option key={a.acc_id} value={a.acc_id}>{a.acc_name}</option>)}
        </select>
      </label>

      <label style={s.label}>
        Categoría
        <select style={s.input} value={catId} onChange={e => setCatId(e.target.value)}>
          <option value="">— Sin categoría —</option>
          {filteredCats.map(c => <option key={c.cat_id} value={c.cat_id}>{c.cat_name}</option>)}
        </select>
      </label>

      {error && <p style={s.error}>{error}</p>}
      <button style={s.saveBtn} type="submit" disabled={saving}>
        {saving ? 'Guardando...' : 'Crear recurrente'}
      </button>
    </form>
  )
}

function RecurringRow({ rec, onToggle, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const isActive = rec.rec_is_active

  return (
    <div style={{ ...s.recRow, opacity: isActive ? 1 : 0.5 }}>
      <div style={s.recMain}>
        <div style={s.recInfo}>
          <p style={s.recName}>{rec.rec_name}</p>
          <p style={s.recMeta}>
            {rec.rec_type === 'income' ? 'Ingreso' : 'Gasto'}
            {' · '}{FREQUENCY_LABELS[rec.rec_frequency] ?? rec.rec_frequency}
            {rec.rec_day_of_month ? ` · día ${rec.rec_day_of_month}` : ''}
            {rec.categories?.cat_name ? ` · ${rec.categories.cat_name}` : ''}
          </p>
        </div>
        <span style={{ ...s.recAmount, color: rec.rec_type === 'income' ? '#4ade80' : '#f87171' }}>
          {formatCurrency(rec.rec_amount)}
        </span>
      </div>
      <div style={s.recActions}>
        <button
          style={{ ...s.toggleBtn, color: isActive ? '#4ade80' : '#555' }}
          onClick={() => onToggle(rec.rec_id, !isActive)}
        >
          {isActive ? 'Activa' : 'Pausada'}
        </button>
        <button
          style={{ ...s.deleteBtn, ...(confirming ? s.deleteBtnConfirm : {}) }}
          onClick={() => confirming ? onDelete(rec.rec_id) : setConfirming(true)}
        >
          {confirming ? '¿Seguro?' : '×'}
        </button>
      </div>
    </div>
  )
}

const s = {
  page:   { maxWidth: 600, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title:  { fontSize: '1.4rem', fontWeight: 700, color: '#fff' },
  addBtn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },
  empty:  { color: '#555', fontSize: '0.9rem', padding: '2rem 0', textAlign: 'center' },

  form:    { background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  row2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' },
  label:   { display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: '#888', fontWeight: 500 },
  input:   { background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '0.6rem 0.8rem', color: '#fff', fontSize: '0.9rem', outline: 'none' },
  error:   { color: '#f87171', fontSize: '0.85rem', margin: 0 },
  saveBtn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' },

  recRow:     { background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: 8 },
  recMain:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  recInfo:    { flex: 1, minWidth: 0 },
  recName:    { fontSize: '0.92rem', fontWeight: 600, color: '#ddd' },
  recMeta:    { fontSize: '0.75rem', color: '#555', marginTop: 2 },
  recAmount:  { fontSize: '1rem', fontWeight: 700, flexShrink: 0, marginLeft: '0.75rem' },
  recActions: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  toggleBtn:  { background: 'none', border: '1px solid currentColor', borderRadius: 6, padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 },
  deleteBtn:  { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' },
  deleteBtnConfirm: { color: '#f87171' },
}
