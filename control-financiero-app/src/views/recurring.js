import { state, getCat, amt } from '../store.js';
import { save, normalizeDate, fmt, typeIsIncome, typeLabel, STORE } from '../utils.js';
import { toast } from '../ui.js';
import { showConfirm } from '../ui.js';

// ─── Auto-generación de transacciones recurrentes al iniciar ──────────────────
export function initRecurring() {
  const now    = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let newCount = 0;

  state.recurring.forEach(r => {
    if (!r.active) return;
    let lastKey  = r.lastGenerated || curKey;
    let [ly, lm] = lastKey.split('-').map(Number);

    while (true) {
      lm++;
      if (lm > 12) { lm = 1; ly++; }
      const key = `${ly}-${String(lm).padStart(2, '0')}`;
      if (key > curKey) break;

      const txId = `rec_${r.id}_${key}`;
      if (!state.transactions.find(t => t.id === txId)) {
        const day  = Math.min(r.dayOfMonth || 1, new Date(ly, lm, 0).getDate());
        const date = `${ly}-${String(lm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        state.transactions.push({
          id: txId, type: r.type, amount: r.amount,
          date, catId: r.catId, note: r.note || r.name, recurring: true,
        });
        newCount++;
      }
      r.lastGenerated = key;
    }
  });

  if (newCount > 0) {
    save(STORE.TX,        state.transactions);
    save(STORE.RECURRING, state.recurring);
    setTimeout(() => toast(`🔁 ${newCount} recurrente${newCount > 1 ? 's' : ''} generado${newCount > 1 ? 's' : ''} ✓`, 'info'), 800);
  }
}

// ─── Render de la lista de recurrentes ───────────────────────────────────────
export function renderRecurringList() {
  const el = document.getElementById('recList');
  if (!el) return;
  if (!state.recurring.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:.82rem;padding:.3rem 0">No tienes recurrentes configurados aún.</div>';
    return;
  }
  el.innerHTML = state.recurring.map(r => {
    const cat   = getCat(r.catId);
    const isInc = typeIsIncome(r.type);
    return `<div class="rec-card">
      <div class="tx-dot" style="background:${cat.color}"></div>
      <div class="rec-info">
        <div class="rec-name">${r.name || r.note || cat.name} <span class="rec-badge">${r.active ? 'ACTIVO' : 'PAUSADO'}</span></div>
        <div class="rec-detail">Día ${r.dayOfMonth} de cada mes · ${typeLabel(r.type)} · ${cat.name}</div>
      </div>
      <div class="rec-amount" style="color:${isInc ? 'var(--green)' : 'var(--red)'}">${isInc ? '+' : '-'}${fmt(amt(r))}</div>
      <div class="rec-actions">
        <button class="btn-sm" onclick="toggleRecurringActive('${r.id}')" title="${r.active ? 'Pausar' : 'Reanudar'}">${r.active ? '⏸' : '▶'}</button>
        <button class="btn-sm del" onclick="deleteRecurringConfirm('${r.id}')" title="Eliminar">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ─── Pausar / reanudar recurrente ─────────────────────────────────────────────
export function toggleRecurringActive(id) {
  const r = state.recurring.find(x => x.id === id);
  if (!r) return;
  r.active = !r.active;
  save(STORE.RECURRING, state.recurring);
  renderRecurringList();
  toast(r.active ? 'Recurrente activado' : 'Recurrente pausado', 'info');
}

// ─── Eliminar recurrente ──────────────────────────────────────────────────────
export function deleteRecurringConfirm(id) {
  const r = state.recurring.find(x => x.id === id);
  if (!r) return;
  showConfirm(
    'Eliminar recurrente',
    `¿Eliminar "${r.name || r.note}"? Las transacciones ya generadas se mantienen.`,
    () => {
      state.recurring = state.recurring.filter(x => x.id !== id);
      save(STORE.RECURRING, state.recurring);
      renderRecurringList();
      toast('Recurrente eliminado', 'info');
    }
  );
}
