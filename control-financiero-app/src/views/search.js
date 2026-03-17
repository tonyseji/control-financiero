import { state, amt } from '../store.js';
import { fmt, typeIsIncome, parseDateParts } from '../utils.js';
import { getCat } from '../store.js';
import { txRow } from './dashboard.js';

// ─── Abrir modal de búsqueda global ──────────────────────────────────────────
export function openGlobalSearch() {
  const years = [...new Set(
    state.transactions.map(t => { const d = parseDateParts(t.date); return d ? d.getFullYear() : null; }).filter(Boolean)
  )].sort((a, b) => b - a);

  const sel = document.getElementById('sFYear');
  sel.innerHTML = '<option value="">Todos los años</option>' +
    years.map(y => `<option value="${y}">${y}</option>`).join('');

  document.getElementById('searchModal').classList.add('open');
  setTimeout(() => document.getElementById('globalSearchInput').focus(), 80);
}

// ─── Cerrar modal de búsqueda ─────────────────────────────────────────────────
export function closeGlobalSearch() {
  document.getElementById('searchModal').classList.remove('open');
  document.getElementById('globalSearchInput').value = '';
  document.getElementById('searchResults').innerHTML =
    '<div style="color:var(--muted);font-size:.88rem;text-align:center;padding:2rem">Escribe para buscar en todas tus transacciones</div>';
}

// ─── Renderizar resultados en tiempo real ─────────────────────────────────────
export function renderSearchResults() {
  const q     = document.getElementById('globalSearchInput').value.trim().toLowerCase();
  const typeF = document.getElementById('sFType').value;
  const yearF = parseInt(document.getElementById('sFYear').value) || 0;
  const el    = document.getElementById('searchResults');

  if (q.length < 2 && !typeF && !yearF) {
    el.innerHTML = '<div style="color:var(--muted);font-size:.88rem;text-align:center;padding:2rem">Escribe al menos 2 caracteres para buscar</div>';
    return;
  }

  let txs = state.transactions.filter(t => {
    if (typeF && t.type !== typeF) return false;
    if (yearF) { const d = parseDateParts(t.date); if (!d || d.getFullYear() !== yearF) return false; }
    if (q) {
      const cat = getCat(t.catId);
      return (t.note || '').toLowerCase().includes(q) || (cat.name || '').toLowerCase().includes(q);
    }
    return true;
  });

  txs.sort((a, b) => b.date.localeCompare(a.date));

  if (!txs.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:.88rem;text-align:center;padding:2rem">Sin resultados</div>';
    return;
  }

  const totalAmt = txs.reduce((s, t) => s + (typeIsIncome(t.type) ? amt(t) : -amt(t)), 0);

  // Agrupar por mes
  const byMonth = {};
  txs.forEach(t => {
    const d = parseDateParts(t.date);
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    (byMonth[key] = byMonth[key] || []).push(t);
  });

  const monthsHtml = Object.keys(byMonth).sort((a, b) => b.localeCompare(a)).map(key => {
    const group  = byMonth[key];
    const [y, m] = key.split('-').map(Number);
    const mLabel = new Date(y, m - 1, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    const mTotal = group.reduce((s, t) => s + (typeIsIncome(t.type) ? amt(t) : -amt(t)), 0);
    return `<div class="search-month-group">
      <div class="search-month-label">${mLabel}<span>${group.length} mov · ${mTotal >= 0 ? '+' : ''}${fmt(mTotal)}</span></div>
      ${group.map(t => txRow(t, true)).join('')}
    </div>`;
  }).join('');

  el.innerHTML = `<div class="search-summary">
    ${txs.length} resultado${txs.length !== 1 ? 's' : ''} · Balance:
    <strong style="color:${totalAmt >= 0 ? 'var(--green)' : 'var(--red)'}">${totalAmt >= 0 ? '+' : ''}${fmt(totalAmt)}</strong>
  </div>${monthsHtml}`;
}
