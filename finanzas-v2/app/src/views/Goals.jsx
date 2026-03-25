import { useState, useMemo } from 'react'
import { formatCurrency } from '../utils/formatters'
import { useGoals } from '../hooks/useGoals'

const CATEGORY_ICONS = {
  emergency:  '🛡️',
  travel:     '✈️',
  car:        '🚗',
  home:       '🏠',
  education:  '📚',
  retirement: '🌴',
  other:      '🎯',
}

export default function Goals() {
  const { goals, loading, error, add, update, addAmount, remove } = useGoals()
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [name,     setName]     = useState('')
  const [target,   setTarget]   = useState('')
  const [saved,    setSaved]    = useState('')
  const [monthly,  setMonthly]  = useState('')
  const [category, setCategory] = useState('other')
  const [deadline, setDeadline] = useState('')
  const [editId,   setEditId]   = useState(null)
  const [saving,   setSaving]   = useState(false)

  function resetForm() {
    setName(''); setTarget(''); setSaved(''); setMonthly('')
    setCategory('other'); setDeadline(''); setEditId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !target) return
    setSaving(true)
    try {
      const payload = {
        name:     name.trim(),
        target:   parseFloat(target)  || 0,
        saved:    parseFloat(saved)   || 0,
        monthly:  parseFloat(monthly) || 0,
        category,
        deadline: deadline || null,
      }
      if (editId) {
        await update(editId, {
          goal_name:     payload.name,
          goal_target:   payload.target,
          goal_saved:    payload.saved,
          goal_monthly:  payload.monthly,
          goal_category: payload.category,
          goal_deadline: payload.deadline,
        })
      } else {
        await add(payload)
      }
      resetForm()
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(goal) {
    setEditId(goal.goal_id)
    setName(goal.goal_name)
    setTarget(String(goal.goal_target))
    setSaved(String(goal.goal_saved))
    setMonthly(String(goal.goal_monthly || ''))
    setCategory(goal.goal_category || 'other')
    setDeadline(goal.goal_deadline || '')
    setShowForm(true)
  }

  const totalTarget = useMemo(() => goals.reduce((s, g) => s + Number(g.goal_target), 0), [goals])
  const totalSaved  = useMemo(() => goals.reduce((s, g) => s + Number(g.goal_saved),  0), [goals])

  if (loading) return <div className="empty-state"><p>Cargando objetivos…</p></div>
  if (error)   return <div className="empty-state"><p style={{ color: 'var(--expense)' }}>Error: {error}</p></div>

  return (
    <div style={s.page}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <p style={s.headerSup}>Finanzas personales</p>
          <h1 style={s.headerTitle}>Objetivos</h1>
        </div>
        <button style={s.addBtn} onClick={() => { resetForm(); setShowForm(f => !f) }}>
          {showForm && !editId ? 'Cancelar' : '+ Nuevo objetivo'}
        </button>
      </div>

      {/* ── Banner resumen ────────────────────────────────────────────────── */}
      {goals.length > 0 && (
        <div style={s.banner}>
          <div style={s.bannerItem}>
            <span style={s.bannerLabel}>Objetivos activos</span>
            <span style={s.bannerValue}>{goals.length}</span>
          </div>
          <div style={s.bannerDivider} />
          <div style={s.bannerItem}>
            <span style={s.bannerLabel}>Total ahorrado</span>
            <span style={s.bannerValue}>{formatCurrency(totalSaved)}</span>
          </div>
          <div style={s.bannerDivider} />
          <div style={s.bannerItem}>
            <span style={s.bannerLabel}>Meta total</span>
            <span style={s.bannerValue}>{formatCurrency(totalTarget)}</span>
          </div>
          <div style={s.bannerDivider} />
          <div style={s.bannerItem}>
            <span style={s.bannerLabel}>Progreso global</span>
            <span style={s.bannerValue}>
              {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
            </span>
          </div>
        </div>
      )}

      {/* ── Formulario ───────────────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <p style={s.formTitle}>{editId ? 'Editar objetivo' : 'Nuevo objetivo'}</p>
          <div style={s.formGrid}>
            <div style={s.formGroup}>
              <label style={s.label}>Nombre del objetivo</label>
              <input style={s.input} placeholder="Ej: Fondo de emergencia" value={name}
                onChange={e => setName(e.target.value)} required autoFocus />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Categoría</label>
              <select style={s.input} value={category} onChange={e => setCategory(e.target.value)}>
                {Object.entries(CATEGORY_ICONS).map(([k, icon]) => (
                  <option key={k} value={k}>{icon} {k.charAt(0).toUpperCase() + k.slice(1)}</option>
                ))}
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Meta (€)</label>
              <input style={s.input} type="number" min="1" step="0.01" placeholder="5000"
                value={target} onChange={e => setTarget(e.target.value)} required />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Ya ahorrado (€)</label>
              <input style={s.input} type="number" min="0" step="0.01" placeholder="0"
                value={saved} onChange={e => setSaved(e.target.value)} />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Aportación mensual (€)</label>
              <input style={s.input} type="number" min="0" step="0.01" placeholder="200"
                value={monthly} onChange={e => setMonthly(e.target.value)} />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Fecha objetivo</label>
              <input style={s.input} type="date" value={deadline}
                onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={s.submitBtn} type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editId ? 'Guardar cambios' : 'Crear objetivo'}
            </button>
            <button style={s.cancelBtn} type="button"
              onClick={() => { setShowForm(false); resetForm() }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* ── Empty ────────────────────────────────────────────────────────── */}
      {goals.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="ei">🎯</div>
          <p>Sin objetivos de ahorro aún</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', marginTop: '0.3rem' }}>
            Define una meta, establece cuánto puedes aportar al mes y rastrea tu progreso
          </p>
          <button style={{ ...s.addBtn, marginTop: '1rem' }} onClick={() => setShowForm(true)}>
            Crear mi primer objetivo
          </button>
        </div>
      )}

      {/* ── Grid de objetivos ─────────────────────────────────────────────── */}
      {goals.length > 0 && (
        <div style={s.grid}>
          {goals.map(goal => (
            <GoalCard
              key={goal.goal_id}
              goal={goal}
              onEdit={startEdit}
              onDelete={remove}
              onAddSavings={addAmount}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GoalCard({ goal, onEdit, onDelete, onAddSavings }) {
  const [confirming, setConfirming] = useState(false)
  const [addAmt,     setAddAmt]     = useState('')
  const [showAdd,    setShowAdd]    = useState(false)
  const [saving,     setSaving]     = useState(false)

  const pct        = goal.goal_target > 0 ? Math.min((goal.goal_saved / goal.goal_target) * 100, 100) : 0
  const remaining  = Math.max(Number(goal.goal_target) - Number(goal.goal_saved), 0)
  const monthsLeft = goal.goal_monthly > 0 ? Math.ceil(remaining / goal.goal_monthly) : null
  const icon       = CATEGORY_ICONS[goal.goal_category] ?? '🎯'

  let deadlineInfo = null
  if (goal.goal_deadline) {
    const diff = Math.round((new Date(goal.goal_deadline) - new Date()) / (1000 * 60 * 60 * 24 * 30))
    deadlineInfo = diff > 0 ? `${diff} meses restantes` : 'Plazo vencido'
  }

  const barColor = pct >= 100 ? 'var(--income)' : pct >= 50 ? 'var(--accent)' : 'var(--warning)'

  async function handleAddSavings(e) {
    e.preventDefault()
    const amt = parseFloat(addAmt)
    if (!amt || amt <= 0) return
    setSaving(true)
    try {
      await onAddSavings(goal.goal_id, amt)
      setAddAmt('')
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={s.cardHeader}>
        <span style={s.cardIcon}>{icon}</span>
        <div style={s.cardTitles}>
          <p style={s.cardName}>{goal.goal_name}</p>
          {deadlineInfo && (
            <p style={{ ...s.cardSub, color: deadlineInfo === 'Plazo vencido' ? 'var(--expense)' : 'var(--text-faint)' }}>
              {deadlineInfo}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto', flexShrink: 0 }}>
          <button style={s.actionBtn} onClick={() => onEdit(goal)} title="Editar">✏</button>
          <button
            style={{ ...s.actionBtn, ...(confirming ? { color: 'var(--expense)', borderColor: 'var(--expense)' } : {}) }}
            onClick={() => confirming ? onDelete(goal.goal_id) : setConfirming(true)}
            onBlur={() => setConfirming(false)}
            title="Eliminar"
          >
            {confirming ? '¿?' : '×'}
          </button>
        </div>
      </div>

      {/* Progreso */}
      <div style={s.progressWrap}>
        <div style={s.progressTrack}>
          <div style={{ ...s.progressBar, width: `${pct}%`, background: barColor }} />
        </div>
        <div style={s.progressLabels}>
          <span style={{ fontWeight: 700 }}>{formatCurrency(goal.goal_saved)}</span>
          <span style={{ color: 'var(--text-faint)' }}>de {formatCurrency(goal.goal_target)}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: barColor }}>{Math.round(pct)}%</span>
        </div>
      </div>

      {/* Sugerencia mensual */}
      {monthsLeft !== null && pct < 100 && (
        <p style={s.monthlySuggestion}>
          {formatCurrency(goal.goal_monthly)}/mes → {monthsLeft} mes{monthsLeft !== 1 ? 'es' : ''} para completar
        </p>
      )}
      {pct >= 100 && (
        <p style={{ ...s.monthlySuggestion, color: 'var(--income)', fontWeight: 700 }}>¡Objetivo alcanzado! 🎉</p>
      )}

      {/* Añadir ahorro */}
      {pct < 100 && (
        showAdd ? (
          <form onSubmit={handleAddSavings} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
            <input
              style={{ ...s.input, flex: 1 }}
              type="number" min="0.01" step="0.01"
              placeholder="€ a añadir"
              value={addAmt}
              onChange={e => setAddAmt(e.target.value)}
              autoFocus
            />
            <button style={s.submitBtn} type="submit" disabled={saving}>
              {saving ? '…' : '+'}
            </button>
            <button style={s.cancelBtn} type="button" onClick={() => setShowAdd(false)}>×</button>
          </form>
        ) : (
          <button style={s.addSavingsBtn} onClick={() => setShowAdd(true)}>+ Añadir ahorro</button>
        )
      )}
    </div>
  )
}

const s = {
  page: { maxWidth: 720, margin: '0 auto', paddingBottom: '2rem' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' },
  headerSup: { fontSize: '0.67rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.15rem' },
  headerTitle: { fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' },
  addBtn: {
    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
    padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit',
  },

  banner: {
    display: 'flex',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 14, padding: '1.1rem 1.5rem', marginBottom: '1.5rem',
    gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap',
    boxShadow: 'var(--shadow-card)',
  },
  bannerItem:   { display: 'flex', flexDirection: 'column', gap: 2 },
  bannerLabel:  { fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' },
  bannerValue:  { fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' },
  bannerDivider: { width: 1, height: 36, background: 'var(--border)' },

  form: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '1.25rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-card)',
  },
  formTitle: { fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.9rem' },
  formGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.9rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  label:     { fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '0.6rem 0.9rem', color: 'var(--text)', fontSize: '0.88rem',
    outline: 'none', fontFamily: 'inherit',
  },
  submitBtn: {
    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
    padding: '0.6rem 1.25rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit',
  },
  cancelBtn: {
    background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '0.6rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit',
  },

  grid: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },

  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '1.25rem', boxShadow: 'var(--shadow-card)',
  },
  cardHeader:  { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.9rem' },
  cardIcon:    { fontSize: '1.5rem', lineHeight: 1 },
  cardTitles:  { display: 'flex', flexDirection: 'column', gap: 2 },
  cardName:    { fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' },
  cardSub:     { fontSize: '0.72rem', color: 'var(--text-faint)' },
  actionBtn: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)',
    borderRadius: 6, padding: '0.25rem 0.55rem', cursor: 'pointer', fontSize: '0.8rem',
    transition: 'border-color var(--transition), color var(--transition)', fontFamily: 'inherit',
  },

  progressWrap:   { marginBottom: '0.6rem' },
  progressTrack:  { height: 8, background: 'var(--bg-layer2)', borderRadius: 99, overflow: 'hidden', marginBottom: '0.4rem' },
  progressBar:    { height: '100%', borderRadius: 99, transition: 'width 0.4s ease' },
  progressLabels: { display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' },

  monthlySuggestion: {
    fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem',
    background: 'var(--bg-hover)', borderRadius: 6, padding: '0.35rem 0.6rem', display: 'inline-block',
  },
  addSavingsBtn: {
    marginTop: '0.75rem', background: 'var(--income-soft)', color: 'var(--income)',
    border: '1px solid rgba(22,163,74,0.2)', borderRadius: 8,
    padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit',
  },
}
