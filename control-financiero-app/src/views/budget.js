import { state, getCat, getMonthTx, amt } from '../store.js';
import { save, fmt, STORE } from '../utils.js';
import { toast } from '../ui.js';
import { updateMonthLabels, getGroupLimit } from './dashboard.js';

// ─── Guardar ingreso objetivo ─────────────────────────────────────────────────
export function saveSettings() {
  state.settings.monthlyIncome = parseFloat(document.getElementById('settingIncome').value) || 0;
  save(STORE.SETTINGS, state.settings);
  updateBudgetTotal();
}

// ─── Actualizar indicador de suma de porcentajes ──────────────────────────────
export function updateBudgetTotal() {
  const inputs    = document.querySelectorAll('.budget-pct-input');
  if (!inputs.length) return;
  const total     = Array.from(inputs).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
  const el        = document.getElementById('budgetPctTotal');
  if (!el) return;
  const remaining = 100 - total;
  if (Math.abs(remaining) < 0.01) {
    el.style.color = 'var(--green)';
    el.textContent = '✓ Suma exactamente 100%';
  } else if (total < 100) {
    el.style.color = 'var(--yellow)';
    el.textContent = `Suma: ${total.toFixed(1)}% — quedan ${remaining.toFixed(1)}% sin asignar (buffer/libre)`;
  } else {
    el.style.color = 'var(--red)';
    el.textContent = `⚠ Suma ${total.toFixed(1)}% — supera el 100% en ${(-remaining).toFixed(1)}%`;
  }
}

// ─── Guardar presupuesto ──────────────────────────────────────────────────────
export function saveBudgets() {
  document.querySelectorAll('.budget-pct-input').forEach(inp => {
    const k = inp.dataset.key;
    const v = parseFloat(inp.value) || 0;
    if (v > 0) state.budgets[k] = v;
    else delete state.budgets[k];
  });
  save(STORE.BUDGETS, state.budgets);
  renderBudgetView();
  toast('Presupuesto guardado ✓', 'success');
}

// ─── Render de la vista de presupuesto ────────────────────────────────────────
export function renderBudgetView() {
  updateMonthLabels();
  document.getElementById('settingIncome').value = state.settings.monthlyIncome || '';

  const groups = [
    { key: 'pct_Fijos',     label: 'Gastos Fijos',     types: ['expense'],     color: '#6366f1' },
    { key: 'pct_Variables', label: 'Gastos Variables',  types: ['expense_var'], color: '#f43f5e' },
    { key: 'pct_Ahorro',    label: 'Ahorro',            types: ['saving'],      color: '#06b6d4' },
    { key: 'pct_Inversión', label: 'Inversión',         types: ['invest'],      color: '#10b981' },
  ];
  const mi = state.settings.monthlyIncome || 0;

  // Inputs de porcentaje
  document.getElementById('budgetCatInputs').innerHTML = '<div class="form-grid">' +
    groups.map(g => {
      const pctVal  = state.budgets[g.key] || '';
      const limitEur = mi > 0 && pctVal ? ` ≈ ${fmt(mi * pctVal / 100)}` : '';
      return `<div class="fg">
        <label style="color:${g.color}">${g.label} (%)</label>
        <div style="display:flex;align-items:center;gap:.4rem">
          <input class="budget-pct-input" type="number" data-key="${g.key}"
            placeholder="0" min="0" max="100" step="1" value="${pctVal}"
            oninput="updateBudgetTotal()"
            style="background:var(--s2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:.56rem .82rem;font-size:.88rem;outline:none;width:90px;flex-shrink:0">
          <span style="font-size:.78rem;color:var(--muted)">${limitEur}</span>
        </div>
      </div>`;
    }).join('') + '</div>';
  setTimeout(updateBudgetTotal, 0);

  // Secciones de seguimiento mensual
  const txs = getMonthTx(state.curY, state.curM);
  document.getElementById('budgetSections').innerHTML = groups.map(g => {
    const spent     = txs.filter(t => g.types.includes(t.type)).reduce((s, t) => s + amt(t), 0);
    const bgt       = getGroupLimit(g.key);
    const pct       = bgt > 0 ? Math.min(spent / bgt * 100, 100) : 0;
    const pctBudget = state.budgets[g.key] || 0;
    const isSaving  = g.key === 'pct_Ahorro' || g.key === 'pct_Inversión';
    const barColor  = isSaving
      ? (pct >= 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#f43f5e')
      : (pct >= 100 ? '#f43f5e' : pct >= 80 ? '#f59e0b' : '#22c55e');
    const limitInfo = bgt > 0
      ? ` / ${pctBudget}% = ${fmt(bgt)}`
      : mi > 0 ? ' — configura el %' : ' — ingreso no configurado';

    // Desglose por categoría dentro del grupo
    const byCat = {};
    txs.filter(t => g.types.includes(t.type)).forEach(t => {
      byCat[t.catId] = (byCat[t.catId] || 0) + amt(t);
    });
    const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cid, v]) => {
      const cat = getCat(cid);
      const p   = spent > 0 ? Math.min(v / spent * 100, 100) : 0;
      return `<div class="budget-cat-row">
        <div class="bcr-dot" style="background:${cat.color}"></div>
        <div class="bcr-name">${cat.name}</div>
        <div class="bcr-bar-wrap">
          <div class="bcr-bar-bg"><div class="bcr-bar-fill" style="width:${p}%;background:${cat.color}"></div></div>
        </div>
        <div class="bcr-amounts"><span>${fmt(v)}</span></div>
      </div>`;
    }).join('');

    return `<div class="budget-section-card">
      <div class="bsc-header">
        <div class="bsc-title" style="color:${g.color}">${g.label}</div>
        <div class="bsc-total">${isSaving ? 'Ahorrado' : 'Gastado'}: <span>${fmt(spent)}</span>${limitInfo}</div>
      </div>
      ${bgt > 0 ? `<div class="bo-bar-bg" style="margin-bottom:1rem"><div class="bo-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>` : ''}
      <div class="budget-cat-list">${catRows || '<div style="color:var(--muted);font-size:.82rem;padding:.3rem 0">Sin movimientos este mes</div>'}</div>
    </div>`;
  }).join('');
}
