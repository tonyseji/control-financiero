import { state } from './store.js';

// ─── Toast ────────────────────────────────────────────────────────────────────
export function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + (type || '');
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = ''), 2800);
}

// ─── Badge de sincronización ──────────────────────────────────────────────────
export function setSyncStatus(s, label) {
  const b = document.getElementById('syncBadge');
  const l = document.getElementById('syncLabel');
  b.className = 'sync-badge ' + (s || '');
  l.textContent = label || {
    idle: 'Listo', syncing: 'Sincronizando…', ok: 'Sincronizado',
    error: 'Error', none: 'Sin configurar',
  }[s] || s;
}

// ─── Modal de confirmación ────────────────────────────────────────────────────
export function showConfirm(title, msg, fn) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent   = msg;
  state.pendingConfirmFn = fn;
  document.getElementById('confirmModal').classList.add('open');
}

export function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('open');
  state.pendingConfirmFn = null;
}

export function confirmAction() {
  if (state.pendingConfirmFn) state.pendingConfirmFn();
  closeConfirm();
}
