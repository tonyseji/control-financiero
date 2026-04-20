import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { CAT_TYPE_LABELS } from '../utils/constants'

const COLORS = ['#f87171','#fb923c','#fbbf24','#4ade80','#34d399','#22d3ee','#60a5fa','#a78bfa','#f472b6','#94a3b8']

export default function Categories() {
  const { categories, loading, add, update, hide } = useCategories()
  const [showForm, setShowForm]     = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [name, setName]             = useState('')
  const [type, setType]             = useState('variable_expense')
  const [color, setColor]           = useState(COLORS[0])
  const [parentId, setParentId]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)

  // Padres del tipo seleccionado (sin cat_parent_id) — excluir la cat en edición
  const parentOptions = categories.filter(
    c => c.cat_type === type && !c.cat_parent_id && c.cat_id !== editingCat?.cat_id
  )

  function openForm() {
    setEditingCat(null)
    setName(''); setType('variable_expense'); setColor(COLORS[0]); setParentId('')
    setError(null)
    setShowForm(true)
  }

  function openEdit(cat) {
    setEditingCat(cat)
    setName(cat.cat_name)
    setType(cat.cat_type)
    setColor(cat.cat_color ?? COLORS[0])
    setParentId(cat.cat_parent_id ?? '')
    setError(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelForm() {
    setShowForm(false)
    setEditingCat(null)
    setName(''); setType('variable_expense'); setColor(COLORS[0]); setParentId('')
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name) return
    setSaving(true)
    setError(null)
    try {
      if (editingCat) {
        await update(editingCat.cat_id, {
          cat_name:  name,
          cat_type:  type,
          cat_color: color,
        })
      } else {
        await add({
          cat_name:      name,
          cat_type:      type,
          cat_color:     color,
          cat_parent_id: parentId || null,
        })
      }
      cancelForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Separar padres y subcategorías
  const parents    = categories.filter(c => !c.cat_parent_id)
  const childrenOf = (pid) => categories.filter(c => c.cat_parent_id === pid)

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
        {!showForm && (
          <button style={s.addBtn} onClick={openForm}>+ Nueva</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <p style={s.formHeading}>{editingCat ? 'Editar categoría' : 'Nueva categoría'}</p>
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

          {/* Selector de categoría padre — solo disponible al crear, no al editar */}
          {!editingCat && parentOptions.length > 0 && (
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

          <div style={s.formActions}>
            <button style={s.submitBtn} type="submit" disabled={saving}>
              {saving ? 'Guardando...' : editingCat ? 'Guardar cambios' : 'Crear categoría'}
            </button>
            <button style={s.cancelBtn} type="button" onClick={cancelForm}>
              Cancelar
            </button>
          </div>
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
                  <CatRow cat={cat} onHide={hide} onEdit={openEdit} />
                  {subs.map(sub => (
                    <CatRow key={sub.cat_id} cat={sub} onHide={hide} onEdit={openEdit} isChild />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}

function CatRow({ cat, onHide, onEdit, isChild = false }) {
  return (
    <div style={{ ...s.catRow, ...(isChild ? s.catRowChild : {}) }}>
      <div style={s.catLeft}>
        {isChild && <span style={s.childIndent}>↳</span>}
        <span style={{ ...s.dot, background: cat.cat_color ?? '#555' }} />
        <span style={s.catName}>{cat.cat_name}</span>
        {cat.cat_is_system && <span style={s.systemBadge}>sistema</span>}
      </div>
      <div style={s.catActions}>
        {!cat.cat_is_system && (
          <button style={s.editBtn} onClick={() => onEdit(cat)} title="Editar" aria-label="Editar categoría">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
        {!cat.cat_is_system && (
          <button style={s.hideBtn} onClick={() => onHide(cat.cat_id)} title="Ocultar" aria-label="Ocultar categoría">×</button>
        )}
      </div>
    </div>
  )
}

const s = {
  page:   { maxWidth: 600, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title:  { fontSize: '1.4rem', fontWeight: 700, color: '#fff' },
  addBtn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },

  form:        { background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  formHeading: { margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:       { background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '0.7rem 0.9rem', color: '#fff', fontSize: '0.9rem', outline: 'none' },
  colorPicker: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  colorDot:    { width: 28, height: 28, borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer', padding: 0 },
  colorDotActive: { border: '2px solid #fff' },
  error:       { color: '#f87171', fontSize: '0.85rem', margin: 0 },
  formActions: { display: 'flex', gap: '0.5rem' },
  submitBtn:   { flex: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' },
  cancelBtn:   { background: 'none', border: '1px solid #333', color: '#888', borderRadius: 8, padding: '0.7rem 1rem', cursor: 'pointer', fontSize: '0.9rem' },

  empty:      { color: '#555', fontSize: '0.9rem', padding: '2rem 0', textAlign: 'center' },
  group:      { marginBottom: '1.25rem' },
  groupLabel: { fontSize: '0.75rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' },

  catRow:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: '#1a1a1a', borderRadius: 8, marginBottom: 4 },
  catRowChild: { background: '#111', marginLeft: '1.25rem' },
  catLeft:     { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  catActions:  { display: 'flex', alignItems: 'center', gap: '0.25rem' },
  childIndent: { color: '#444', fontSize: '0.8rem', flexShrink: 0 },
  dot:         { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  catName:     { fontSize: '0.9rem', color: '#ddd' },
  systemBadge: { fontSize: '0.65rem', color: '#555', border: '1px solid #333', borderRadius: 4, padding: '1px 5px' },
  editBtn:     { background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center', borderRadius: 4 },
  hideBtn:     { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' },
}
