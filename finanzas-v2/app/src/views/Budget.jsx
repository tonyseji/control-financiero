import { useState, useMemo } from 'react'
import { useBudgets } from '../hooks/useBudgets'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency, formatPct, monthRange } from '../utils/formatters'
import { CAT_TYPE_LABELS } from '../utils/constants'

const now = new Date()

// Tipos que cuentan como gasto en el presupuesto
const EXPENSE_TYPES = ['fixed_expense', 'variable_expense', 'saving', 'investment']

// Color de la barra según porcentaje consumido (gasto: rojo malo; ahorro: verde bueno)
function barColor(pct, inverse = false) {
  if (inverse) return pct >= 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'
  return pct >= 100 ? '#dc2626' : pct >= 80 ? '#d97706' : '#16a34a'
}

export default function Budget() {
  const { from, to } = useMemo(() => monthRange(now.getFullYear(), now.getMonth() + 1), [])
  const { budgets, config, loading, saveConfig, saveBudget, removeBudget } = useBudgets()
  const { transactions, loading: txLoading } = useTransactions({ from, to })
  const { categories } = useCategories()

  const [editingConfig, setEditingConfig] = useState(false)

  if (loading || txLoading) return <div style={s.loading}>Cargando...</div>

  return (
    <div style={s.page}>
      <h1 style={s.title}>Presupuesto</h1>
      <p style={s.subtitle}>{now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>

      <ConfigSection
        config={config}
        editing={editingConfig}
        onEdit={() => setEditingConfig(true)}
        onSave={async (values) => { await saveConfig(values); setEditingConfig(false) }}
        onCancel={() => setEditingConfig(false)}
      />

      {config?.fcfg_monthly_income_target && (
        <OverviewSection config={config} transactions={transactions} />
      )}

      <CategoryBudgets
        budgets={budgets}
        categories={categories}
        transactions={transactions}
        onSave={saveBudget}
        onDelete={removeBudget}
      />
    </div>
  )
}

// ── Sección: configuración de ingreso objetivo y % distribución ──────────────

function ConfigSection({ config, editing, onEdit, onSave, onCancel }) {
  const [income, setIncome]   = useState(config?.fcfg_monthly_income_target ?? '')
  const [pctFix, setPctFix]   = useState(config?.fcfg_pct_fixed_expense ?? 40)
  const [pctVar, setPctVar]   = useState(config?.fcfg_pct_variable_expense ?? 25)
  const [pctSav, setPctSav]   = useState(config?.fcfg_pct_saving ?? 15)
  const [pctInv, setPctInv]   = useState(config?.fcfg_pct_investment ?? 15)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState(null)

  const total = Number(pctFix) + Number(pctVar) + Number(pctSav) + Number(pctInv)
  const totalOk = total <= 100

  async function handleSave(e) {
    e.preventDefault()
    if (!totalOk) { setErr('La suma de porcentajes no puede superar 100%'); return }
    setSaving(true); setErr(null)
    try {
      await onSave({
        fcfg_monthly_income_target: parseFloat(income) || null,
        fcfg_pct_fixed_expense:    Number(pctFix),
        fcfg_pct_variable_expense: Number(pctVar),
        fcfg_pct_saving:           Number(pctSav),
        fcfg_pct_investment:       Number(pctInv),
      })
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <section style={s.card}>
        <div style={s.cardHeader}>
          <h2 style={s.cardTitle}>Configuración</h2>
          <button style={s.editBtn} onClick={onEdit}>Editar</button>
        </div>
        {config ? (
          <div>
            <div style={s.configIncomeRow}>
              <ConfigItem label="Ingreso objetivo" value={config.fcfg_monthly_income_target ? formatCurrency(config.fcfg_monthly_income_target) : '—'} centered />
            </div>
            <div style={s.configGrid}>
              <ConfigItem label="Gastos fijos" value={formatPct(config.fcfg_pct_fixed_expense ?? 0)} />
              <ConfigItem label="Gastos variables" value={formatPct(config.fcfg_pct_variable_expense ?? 0)} />
              <ConfigItem label="Ahorro" value={formatPct(config.fcfg_pct_saving ?? 0)} />
              <ConfigItem label="Inversión" value={formatPct(config.fcfg_pct_investment ?? 0)} />
            </div>
          </div>
        ) : (
          <p style={s.emptyConfig}>Configura tu ingreso objetivo y distribución por tipo de gasto.</p>
        )}
      </section>
    )
  }

  return (
    <section style={s.card}>
      <h2 style={s.cardTitle}>Configuración</h2>
      <form onSubmit={handleSave} style={s.configForm}>
        <label style={s.label}>
          Ingreso mensual objetivo (€)
          <input style={s.input} type="number" min="0" step="0.01" value={income} onChange={e => setIncome(e.target.value)} placeholder="2100" />
        </label>
        <div style={s.pctGrid}>
          <PctInput label="Gastos fijos %" value={pctFix} onChange={setPctFix} />
          <PctInput label="Gastos variables %" value={pctVar} onChange={setPctVar} />
          <PctInput label="Ahorro %" value={pctSav} onChange={setPctSav} />
          <PctInput label="Inversión %" value={pctInv} onChange={setPctInv} />
        </div>
        <p style={{ ...s.pctTotal, color: totalOk ? '#4ade80' : '#f87171' }}>
          Suma: {total}% {totalOk ? `(queda ${100 - total}% libre)` : '— excede 100%'}
        </p>
        {err && <p style={s.error}>{err}</p>}
        <div style={s.formActions}>
          <button type="button" style={s.cancelBtn} onClick={onCancel}>Cancelar</button>
          <button type="submit" style={s.saveBtn} disabled={saving || !totalOk}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </section>
  )
}

function ConfigItem({ label, value, centered }) {
  return (
    <div style={{ ...s.configItem, ...(centered ? { alignItems: 'center', textAlign: 'center' } : {}) }}>
      <span style={s.configLabel}>{label}</span>
      <span style={s.configValue}>{value}</span>
    </div>
  )
}

function PctInput({ label, value, onChange }) {
  return (
    <label style={s.label}>
      {label}
      <input style={s.input} type="number" min="0" max="100" step="1" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

// ── Sección: resumen por tipo (gráficas de progreso agregadas) ───────────────

function OverviewSection({ config, transactions }) {
  const target = config.fcfg_monthly_income_target

  // Agrupar gasto real por cat_type
  const spentByType = useMemo(() => {
    const acc = {}
    for (const tx of transactions) {
      if (tx.tx_type !== 'expense') continue
      const type = tx.categories?.cat_type ?? 'variable_expense'
      acc[type] = (acc[type] ?? 0) + tx.tx_amount
    }
    return acc
  }, [transactions])

  const groups = [
    { type: 'fixed_expense',    pct: config.fcfg_pct_fixed_expense ?? 0,    color: '#f43f5e' },
    { type: 'variable_expense', pct: config.fcfg_pct_variable_expense ?? 0, color: '#22c55e' },
    { type: 'saving',           pct: config.fcfg_pct_saving ?? 0,           color: '#06b6d4' },
    { type: 'investment',       pct: config.fcfg_pct_investment ?? 0,       color: '#f59e0b' },
  ].filter(g => g.pct > 0)

  if (groups.length === 0) return null

  return (
    <section style={s.card}>
      <h2 style={s.cardTitle}>Resumen del mes</h2>
      {groups.map(({ type, pct, color }) => {
        const limit  = (pct * target) / 100
        const spent  = spentByType[type] ?? 0
        const usedPct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0
        return (
          <div key={type} style={s.overviewRow}>
            <div style={s.overviewTop}>
              <span style={s.overviewLabel}>{CAT_TYPE_LABELS[type]}</span>
              <span style={s.overviewAmounts}>
                <span style={{ color }}>{formatCurrency(spent)}</span>
                <span style={s.overviewLimit}> / {formatCurrency(limit)}</span>
              </span>
            </div>
            <div style={s.barTrack}>
              <div style={{ ...s.barFill, width: `${usedPct}%`, background: color }} />
            </div>
            <span style={{ ...s.barPct, color }}>{usedPct}%</span>
          </div>
        )
      })}
    </section>
  )
}

// ── Sección: presupuestos por categoría ──────────────────────────────────────

function CategoryBudgets({ budgets, categories, transactions, onSave, onDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [catId, setCatId]       = useState('')
  const [amount, setAmount]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState(null)

  // Gasto real por categoría este mes
  const spentByCat = useMemo(() => {
    const acc = {}
    for (const tx of transactions) {
      if (tx.tx_type !== 'expense' || !tx.tx_cat_id) continue
      acc[tx.tx_cat_id] = (acc[tx.tx_cat_id] ?? 0) + tx.tx_amount
    }
    return acc
  }, [transactions])

  // Categorías que no tienen presupuesto ya asignado
  const availableCats = categories.filter(
    c => EXPENSE_TYPES.includes(c.cat_type) && !budgets.find(b => b.bud_cat_id === c.cat_id)
  )

  async function handleAdd(e) {
    e.preventDefault()
    if (!catId || !amount) return
    setSaving(true); setErr(null)
    try {
      await onSave({
        bud_cat_id: catId,
        bud_amount: parseFloat(amount),
        bud_period: 'monthly',
        bud_start_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      })
      setCatId(''); setAmount(''); setShowForm(false)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section style={s.card}>
      <div style={s.cardHeader}>
        <h2 style={s.cardTitle}>Por categoría</h2>
        {availableCats.length > 0 && (
          <button style={s.editBtn} onClick={() => setShowForm(f => !f)}>
            {showForm ? 'Cancelar' : '+ Añadir'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={s.budgetForm}>
          <select style={s.input} value={catId} onChange={e => setCatId(e.target.value)} required>
            <option value="">— Categoría —</option>
            {availableCats.map(c => (
              <option key={c.cat_id} value={c.cat_id}>{c.cat_name}</option>
            ))}
          </select>
          <input style={s.input} type="number" min="0.01" step="0.01" placeholder="Límite (€)" value={amount} onChange={e => setAmount(e.target.value)} required />
          {err && <p style={s.error}>{err}</p>}
          <button style={s.saveBtn} type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear presupuesto'}
          </button>
        </form>
      )}

      {budgets.length === 0 && !showForm && (
        <p style={s.empty}>No hay presupuestos por categoría. Añade uno para hacer seguimiento.</p>
      )}

      <div className="cat-budget-grid">
        {budgets.map(bud => {
          const spent   = spentByCat[bud.bud_cat_id] ?? 0
          const usedPct = bud.bud_amount > 0 ? Math.min(Math.round((spent / bud.bud_amount) * 100), 100) : 0
          const color   = barColor(usedPct)
          return (
            <BudgetRow
              key={bud.bud_id}
              bud={bud}
              spent={spent}
              usedPct={usedPct}
              color={color}
              onDelete={onDelete}
            />
          )
        })}
      </div>
    </section>
  )
}

function BudgetRow({ bud, spent, usedPct, color, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const catName  = bud.categories?.cat_name ?? '—'
  const isOver   = usedPct >= 100
  const isWarn   = usedPct >= 80 && !isOver
  const pctCls   = isOver ? 'over' : isWarn ? 'warn' : 'ok'
  const remaining = bud.bud_amount - spent

  return (
    <div className={`cat-budget-card${isOver ? ' over-budget' : ''}`}>
      <div className="cat-budget-card-hd">
        <span className="cat-budget-card-name">{catName}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`cat-budget-card-pct ${pctCls}`}>{usedPct}%</span>
          <button
            className="cat-budget-card-del"
            onClick={() => confirming ? onDelete(bud.bud_id) : setConfirming(true)}
            title={confirming ? 'Confirmar eliminación' : 'Eliminar presupuesto'}
          >
            {confirming ? '✓' : '×'}
          </button>
        </div>
      </div>
      <div className="cat-budget-card-bar-track">
        <div className="cat-budget-card-bar-fill" style={{ width: `${usedPct}%`, background: color }} />
      </div>
      <div className="cat-budget-card-amounts">
        <span className="cat-budget-card-spent">{formatCurrency(spent)}</span>
        <span className="cat-budget-card-limit">de {formatCurrency(bud.bud_amount)}</span>
      </div>
      <div className={`cat-budget-card-footer ${isOver ? 'over' : 'avail'}`}>
        {isOver
          ? `Excedido en ${formatCurrency(Math.abs(remaining))}`
          : `Disponible: ${formatCurrency(remaining)}`
        }
      </div>
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = {
  page:     { maxWidth: 640, margin: '0 auto' },
  loading:  { padding: '2rem', color: 'var(--text-muted)', textAlign: 'center' },
  title:    { fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)' },
  subtitle: { fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textTransform: 'capitalize' },

  card:       { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', boxShadow: 'var(--shadow-card)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  cardTitle:  { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },

  editBtn:  { background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font)' },
  empty:    { color: 'var(--text-faint)', fontSize: '0.85rem', padding: '0.5rem 0' },
  error:    { color: 'var(--expense)', fontSize: '0.85rem', margin: 0 },

  emptyConfig: { color: 'var(--text-muted)', fontSize: '0.85rem' },
  configIncomeRow: { display: 'flex', justifyContent: 'center', paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)' },
  configGrid:  { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' },
  configItem:  { display: 'flex', flexDirection: 'column', gap: 2 },
  configLabel: { fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  configValue: { fontSize: '0.95rem', color: 'var(--text)', fontWeight: 600 },

  configForm: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  pctGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' },
  pctTotal:   { fontSize: '0.85rem', fontWeight: 600, margin: 0 },
  formActions:{ display: 'flex', gap: '0.5rem' },
  saveBtn:    { flex: 1, padding: '0.65rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font)' },
  cancelBtn:  { padding: '0.65rem 1rem', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font)' },

  label: { display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 },
  input: { background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem 0.8rem', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' },

  overviewRow:    { marginBottom: '20px' },
  overviewTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' },
  overviewLabel:  { fontSize: '0.88rem', color: 'var(--text)', fontWeight: 500 },
  overviewAmounts:{ fontSize: '0.88rem', fontWeight: 600 },
  overviewLimit:  { color: 'var(--text-muted)', fontWeight: 400 },

  barTrack: { height: 6, background: 'var(--bg-layer2)', borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 3, transition: 'width 0.3s ease' },
  barPct:   { fontSize: '0.7rem', fontWeight: 600, marginTop: 3, display: 'block' },

  budgetForm: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', background: 'var(--bg-hover)', borderRadius: 8, padding: '0.75rem' },
  budgetRow:  { marginBottom: '0.75rem' },
  budgetTop:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' },
  budgetCatName: { fontSize: '0.88rem', color: 'var(--text)', fontWeight: 500 },
  budgetRight:   { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  budgetAmounts: { fontSize: '0.85rem', fontWeight: 600 },
  budgetLimit:   { color: 'var(--text-muted)', fontWeight: 400 },
  deleteBtn:     { background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '0.85rem', padding: '0 4px' },
  deleteBtnConfirm: { color: 'var(--expense)' },
}
