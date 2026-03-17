import { state, getCat, getMonthTx } from '../store.js';

import { updateMonthLabels, renderGroupedByDate } from './dashboard.js';

// ─── Poblar selectores de filtro ──────────────────────────────────────────────
export function populateCatFilter() {
  document.getElementById('fCat').innerHTML =
    '<option value="">Todas las categorías</option>' +
    state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('fAccount').innerHTML =
    '<option value="">Todas las cuentas</option>' +
    state.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
}

// ─── Render de la vista de transacciones ──────────────────────────────────────
export function renderTransactions() {
  updateMonthLabels();
  let txs    = getMonthTx(state.curY, state.curM);
  const typeF   = document.getElementById('fType').value;
  const catF    = document.getElementById('fCat').value;
  const accF    = document.getElementById('fAccount').value;
  const search  = document.getElementById('fSearch').value.toLowerCase();

  if (typeF)   txs = txs.filter(t => t.type === typeF);
  if (catF)    txs = txs.filter(t => t.catId === catF);
  if (accF)    txs = txs.filter(t => t.accountId === accF);
  if (search)  txs = txs.filter(t =>
    (t.note || '').toLowerCase().includes(search) ||
    (getCat(t.catId).name || '').toLowerCase().includes(search)
  );

  txs.sort((a, b) => b.date.localeCompare(a.date));

  const el = document.getElementById('tx-list');
  if (!txs.length) {
    el.innerHTML = `<div class="empty-state"><div class="ei">🔍</div>Sin transacciones que coincidan</div>`;
    return;
  }
  el.innerHTML = renderGroupedByDate(txs, true);
}
