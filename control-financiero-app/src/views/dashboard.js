import { state, getCat, getMonthTx, amt } from '../store.js';
import { fmt, typeIsIncome, fmtDate, fmtDateLong, typeLabel, typeBadgeCls, monthName } from '../utils.js';
import { renderPieChart, renderBarChart } from '../charts.js';

// ─── Etiqueta del mes en los 3 selectores ─────────────────────────────────────
export function updateMonthLabels() {
  const lbl = monthName(state.curY, state.curM);
  ['monthLabel', 'monthLabel2', 'monthLabel3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = lbl;
  });
}

// ─── Límite monetario de un grupo de presupuesto ─────────────────────────────
export function getGroupLimit(pctKey) {
  const mi  = state.settings.monthlyIncome || 0;
  const pct = parseFloat(state.budgets[pctKey] || 0);
  return mi > 0 && pct > 0 ? (mi * pct) / 100 : 0;
}

// ─── Barras de presupuesto en el dashboard ────────────────────────────────────
export function renderBudgetOverview(txs) {
  const groups = [
    { key: 'pct_Fijos',     label: 'Fijos',     types: ['expense'],     color: '#6366f1' },
    { key: 'pct_Variables', label: 'Variables',  types: ['expense_var'], color: '#f43f5e' },
    { key: 'pct_Ahorro',    label: 'Ahorro',     types: ['saving'],      color: '#06b6d4' },
    { key: 'pct_Inversión', label: 'Inversión',  types: ['invest'],      color: '#10b981' },
  ];
  document.getElementById('boGrid').innerHTML = groups.map(g => {
    const spent      = txs.filter(t => g.types.includes(t.type)).reduce((s, t) => s + amt(t), 0);
    const bgt        = getGroupLimit(g.key);
    const pct        = bgt > 0 ? Math.min(spent / bgt * 100, 100) : 0;
    const pctBudget  = state.budgets[g.key] || 0;
    const isSaving   = g.key === 'pct_Ahorro' || g.key === 'pct_Inversión';
    const barColor   = isSaving
      ? (pct >= 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#f43f5e')
      : (pct >= 100 ? '#f43f5e' : pct >= 80 ? '#f59e0b' : '#22c55e');
    return `<div>
      <div class="bo-label">${g.label}<span style="color:${g.color}">${fmt(spent)}</span></div>
      <div class="bo-bar-bg"><div class="bo-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
      <div class="bo-amounts"><span>${bgt > 0 ? `${Math.round(pct)}% de ${pctBudget}% (${fmt(bgt)})` : 'Configura presupuesto'}</span></div>
    </div>`;
  }).join('');
}

// ─── Fila de transacción ──────────────────────────────────────────────────────
export function txRow(t, withActions) {
  const cat    = getCat(t.catId);
  const isInc  = typeIsIncome(t.type);
  const actions = withActions
    ? `<div class="tx-actions">
         <button class="btn-sm" onclick="editTx('${t.id}')">✏</button>
         <button class="btn-sm del" onclick="deleteTxConfirm('${t.id}')">✕</button>
       </div>`
    : '';
  return `<div class="tx-item">
    <div class="tx-dot" style="background:${cat.color}"></div>
    <div class="tx-info">
      <div class="tx-cat">${cat.name}</div>
      ${t.note ? `<div class="tx-note">${t.note}</div>` : ''}
    </div>
    <div class="tx-meta">
      <div class="tx-date">${fmtDate(t.date)}</div>
      <div class="tx-type-badge ${typeBadgeCls(t.type)}">${typeLabel(t.type)}</div>
    </div>
    <div class="tx-amount ${isInc ? 'income' : 'expense'}">${isInc ? '+' : '-'}${fmt(amt(t))}</div>
    ${actions}
  </div>`;
}

// ─── Lista agrupada por fecha con chip de neto diario ─────────────────────────
export function renderGroupedByDate(txs, withActions) {
  const byDate = {};
  txs.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });
  return Object.keys(byDate).sort((a, b) => b.localeCompare(a)).map(date => {
    const group  = byDate[date];
    const dayNet = group.reduce((s, t) => s + (typeIsIncome(t.type) ? amt(t) : -amt(t)), 0);
    const netCls = dayNet > 0 ? 'pos' : dayNet < 0 ? 'neg' : 'neu';
    const netStr = dayNet >= 0 ? '+' + fmt(dayNet) : fmt(dayNet);
    return `<div class="date-header">
      <div class="date-header-line"></div>
      <div class="date-header-label">${fmtDateLong(date)}</div>
      <div class="date-header-total ${netCls}">${netStr}</div>
      <div class="date-header-line"></div>
    </div>` + group.map(t => txRow(t, withActions)).join('');
  }).join('');
}

// ─── Render principal del dashboard ──────────────────────────────────────────
export function renderDashboard() {
  updateMonthLabels();
  const txs     = getMonthTx(state.curY, state.curM);
  const income  = txs.filter(t => typeIsIncome(t.type)).reduce((s, t) => s + amt(t), 0);
  const expense = txs.filter(t => t.type === 'expense' || t.type === 'expense_var').reduce((s, t) => s + amt(t), 0);
  const saving  = txs.filter(t => t.type === 'saving'  || t.type === 'invest').reduce((s, t) => s + amt(t), 0);
  const balance = income - expense - saving;

  const sb = document.getElementById('s-balance');
  sb.textContent = fmt(balance);
  sb.className   = 'stat-value ' + (balance >= 0 ? 'pos' : 'neg');
  document.getElementById('s-income').textContent  = fmt(income);
  document.getElementById('s-expense').textContent = fmt(expense);
  document.getElementById('s-saving').textContent  = fmt(saving);

  const mi = state.settings.monthlyIncome || 0;
  if (mi > 0) {
    document.getElementById('s-income-sub').textContent  = `Objetivo: ${fmt(mi)}`;
    document.getElementById('s-expense-sub').textContent = income > 0 ? `${Math.round(expense / income * 100)}% de ingresos` : '';
    document.getElementById('s-balance-sub').textContent = income > 0 ? `${Math.round(balance / income * 100)}% de ingresos` : '';
    document.getElementById('s-saving-sub').textContent  = income > 0 ? `Tasa ahorro: ${Math.round(saving / income * 100)}%` : '';
  }

  renderBudgetOverview(txs);
  renderPieChart(txs);
  renderBarChart();

  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const el     = document.getElementById('dash-recent');
  el.innerHTML = sorted.length
    ? renderGroupedByDate(sorted, false)
    : `<div class="empty-state"><div class="ei">📭</div>Sin transacciones este mes</div>`;
}
