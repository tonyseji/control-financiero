// ─── Constantes de almacenamiento ────────────────────────────────────────────
export const STORE = {
  CATS: 'cf_cats',
  TX: 'cf_tx',
  BUDGETS: 'cf_budgets',
  SETTINGS: 'cf_settings',
  RECURRING: 'cf_recurring',
};

// ─── localStorage helpers ─────────────────────────────────────────────────────
export const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
export const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ─── Normalización de fechas ──────────────────────────────────────────────────
/** Convierte cualquier formato de fecha a YYYY-MM-DD */
export function normalizeDate(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime()))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return s;
}

/** Parse seguro: devuelve Date o null */
export function parseDateParts(iso) {
  const n = normalizeDate(iso);
  if (!n) return null;
  const [y, m, d] = n.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

// ─── Formatters ───────────────────────────────────────────────────────────────
export const fmtDate = iso => {
  const dt = parseDateParts(iso);
  if (!dt || isNaN(dt)) return '—';
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtDateLong = iso => {
  const dt = parseDateParts(iso);
  if (!dt || isNaN(dt)) return '—';
  return dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const monthName = (y, m) => new Date(y, m, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
export const hhmm = () => new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
export const fmt = n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ─── Helpers de tipo de transacción ──────────────────────────────────────────
export const typeIsIncome  = t => t === 'income';
export const typeIsExpense = t => ['expense', 'expense_var', 'saving', 'invest'].includes(t);

export const typeLabel = t => ({
  expense: 'Gasto fijo', expense_var: 'Gasto variable',
  income: 'Ingreso', saving: 'Ahorro', invest: 'Inversión',
}[t] || t);

export const typeBadgeCls = t => ({
  expense: 'gf', expense_var: 'gv', income: 'ing', saving: 'aho', invest: 'aho',
}[t] || 'gv');

export const catTypeLabel = t => ({
  expense: 'Gasto fijo', expense_var: 'Gasto variable', income: 'Ingreso',
  saving: 'Ahorro', invest: 'Inversión', both: 'Ambos',
}[t] || t);
