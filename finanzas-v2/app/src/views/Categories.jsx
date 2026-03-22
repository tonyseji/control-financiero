import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { CAT_TYPE_LABELS } from '../utils/constants'

const COLORS = ['#f87171','#fb923c','#fbbf24','#4ade80','#34d399','#22d3ee','#60a5fa','#a78bfa','#f472b6','#94a3b8']

export default function Categories() {
  const { categories, loading, add, hide } = useCategories()
  const [showForm, setShowForm] = useState(false)
  const [name, setName]         = useState('')
  const [type, setType]         = useState('variable_expense')
  const [color, setColor]       = useState(COLORS[0])
  const [parentId, setParentId] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  // Padres del tipo seleccionado (sin cat_parent_id)
  const parentOptions = categories.filter(c => c.cat_type === type && !c.cat_parent_id)

  async function handleAdd(e) {
    e.preventDefault()
    if (!name) return
    setSaving(true)
    setError(null)
    try {
      await add({
        cat_name:      name,
        cat_type:      type,
        cat_color:     color,
        cat_parent_id: parentId || null,
      })
      setName(''); setType('variable_expense'); setColor(COLORS[0]); setParentId('')
      setShowForm(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Separar padres y subcategorías
  const parents = categories.filter(c => !c.cat_parent_id)
  const childrenOf = (parentId) => categories.filter(c => c.cat_parent_id === parentId)

  // Agrupar padres por tipo
  const grouped = parents.reduce((acc, c) => {
    if (!acc[c.cat_type]) acc[c.cat_type] = []
    acc[c.cat_type].push(c)
    return acc
  }, {})

  const typeOrder = ['income', 'fixed_expense', 'variable_expense', 'saving', 'investment']

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Categorías</h1>
        <button style={s.addBtn} onClick={() => setShowForm(f => !f)}>
          {showForm ? 'Cancelar' : '+ Nueva'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={s.form}>
          <input
            style={s.input}
            placeholder="Nombre de la categoría"
            value={name}
            onChange={e => setName(e.target.value)}
            required autoFocus
          />
          <select style={s.input} value={type} onChange={e => { setType(e.target.value); setParentId('') }}>
            {Object.entries(CAT_TYPE_LABELS)
              .filter(([k]) => k !== 'transfer')
              .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {/* Selector de categoría padre (opcional) */}
          {parentOptions.length > 0 && (
            <select style={s.input} value={parentId} onChange={e => setParentId(e.target.value)}>
              <option value="">— Sin padre (categoría principal) —</option>
              {parentOptions.map(c => (
                <option key={c.cat_id} value={c.cat_id}>{c.cat_name}</option>
              ))}
            </select>
          )}

          <div style={s.colorPicker}>
            {COLORS.map(c => (
              <button
                key={c} type="button"
                style={{ ...s.colorDot, background: c, ...(color === c ? s.colorDotActive : {}) }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          {error && <p style={s.error}>{error}</p>}
          <button style={s.submitBtn} type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear categoría'}
          </button>
        </form>
      )}

      {loading && <p style={s.empty}>Cargando...</p>}

      {typeOrder
        .filter(t => grouped[t]?.length > 0)
        .map(t => (
          <div key={t} style={s.group}>
            <p style={s.groupLabel}>{CAT_TYPE_LABELS[t] ?? t}</p>
            {grouped[t].map(cat => {
              const subs = childrenOf(cat.cat_id)
              return (
                <div key={cat.cat_id}>
                  <CatRow cat={cat} onHide={hide} />
                  {subs.map(sub => (
                    <CatRow key={sub.cat_id} cat={sub} onHide={hide} isChild />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}

function CatRow({ cat, onHide, isChild = false }) {
  return (
    <div style={{ ...s.catRow, ...(isChild ? s.catRowChild : {}) }}>
      <div style={s.catLeft}>
        {isChild && <span style={s.childIndent}>↳</span>}
        <span style={{ ...s.dot, background: cat.cat_color ?? '#555' }} />
        <span style={s.catName}>{cat.cat_name}</span>
        {cat.cat_is_system && <span style={s.systemBadge}>sistema</span>}
      </div>
      {!cat.cat_is_system && (
        <button style={s.hideBtn} onClick={() => onHide(cat.cat_id)} title="Ocultar">×</button>
      )}
    </div>
  )
}

const s = {
  page:   { maxWidth: 600, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title:  { fontSize: '1.4rem', fontWeight: 700, color: '#fff' },
  addBtn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },

  form:         { background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input:        { background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '0.7rem 0.9rem', color: '#fff', fontSize: '0.9rem', outline: 'none' },
  colorPicker:  { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  colorDot:     { width: 28, height: 28, borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer', padding: 0 },
  colorDotActive: { border: '2px solid #fff' },
  error:        { color: '#f87171', fontSize: '0.85rem', margin: 0 },
  submitBtn:    { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' },

  empty:      { color: '#555', fontSize: '0.9rem', padding: '2rem 0', textAlign: 'center' },
  group:      { marginBottom: '1.25rem' },
  groupLabel: { fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' },

  catRow:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: '#1a1a1a', borderRadius: 8, marginBottom: 4 },
  catRowChild: { background: '#111', marginLeft: '1.25rem' },
  catLeft:     { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  childIndent: { color: '#444', fontSize: '0.8rem', flexShrink: 0 },
  dot:         { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  catName:     { fontSize: '0.9rem', color: '#ddd' },
  systemBadge: { fontSize: '0.65rem', color: '#555', border: '1px solid #333', borderRadius: 4, padding: '1px 5px' },
  hideBtn:     { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' },
}
