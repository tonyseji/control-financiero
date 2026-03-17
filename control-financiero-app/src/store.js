import { load, normalizeDate, STORE } from './utils.js';


// ─── Categorías por defecto ───────────────────────────────────────────────────
export const DEFAULT_CATS = [
  { id: 'c1', name: 'Vivienda',       color: '#6366f1', type: 'expense' },
  { id: 'c2', name: 'Alimentación',   color: '#f59e0b', type: 'expense' },
  { id: 'c3', name: 'Transporte',     color: '#3b82f6', type: 'expense' },
  { id: 'c4', name: 'Ocio',           color: '#a855f7', type: 'expense' },
  { id: 'c5', name: 'Salud',          color: '#ec4899', type: 'expense' },
  { id: 'c6', name: 'Suscripciones',  color: '#8b5cf6', type: 'expense' },
  { id: 'c7', name: 'Otros gastos',   color: '#64748b', type: 'expense' },
  { id: 'c8', name: 'Nómina',         color: '#22c55e', type: 'income'  },
  { id: 'c9', name: 'Otros ingresos', color: '#6b7280', type: 'income'  },
];

// ─── Cuentas por defecto ──────────────────────────────────────────────────────
export const DEFAULT_ACCOUNTS = [
  { id: 'acc1', name: 'Cuenta principal' },
  { id: 'acc2', name: 'Cuenta comun' },
  { id: 'acc3', name: 'Tarjeta débito' },
  { id: 'acc4', name: 'Cuenta ahorro' },
  { id: 'acc5', name: 'Broker' },
];

// ─── Tipos de transacción ─────────────────────────────────────────────────────
export const TX_TYPES = [
  { id: 'expense',     label: '🔴 Gasto fijo',    cls: 'expense' },
  { id: 'expense_var', label: '🟠 Gasto variable', cls: 'expense' },
  { id: 'income',      label: '🟢 Ingreso',        cls: 'income'  },
  { id: 'saving',      label: '💧 Ahorro',         cls: 'saving'  },
  { id: 'invest',      label: '📈 Inversión',      cls: 'saving'  },
];

// ─── Estado global mutable ────────────────────────────────────────────────────
export const state = {
  categories:   load(STORE.CATS) || DEFAULT_CATS,
  transactions: (load(STORE.TX) || []).map(t => ({ ...t, date: normalizeDate(t.date) })),
  budgets:      load(STORE.BUDGETS) || {},
  settings:     load(STORE.SETTINGS) || { monthlyIncome: 0 },
  recurring:    load(STORE.RECURRING) || [],
  accounts:     load(STORE.ACCOUNTS) || DEFAULT_ACCOUNTS,
  editingAccId: null,

  curY:  new Date().getFullYear(),
  curM:  new Date().getMonth(),

  editingTxId:      null,
  editingCatId:     null,
  pendingConfirmFn: null,

  chartPieI:  null,
  chartBarI:  null,
  formType:   'expense',
  chartPeriod:'6m',
  chartY:     new Date().getFullYear(),
};

// ─── Helpers de acceso al estado ─────────────────────────────────────────────
export const getCat     = id => state.categories.find(c => c.id === id) || { name: 'Sin categoría', color: '#64748b', type: 'both' };
export const getAccount = id => state.accounts.find(a => a.id === id) || null;
export const getMonthTx = (y, m) => state.transactions.filter(t => {
  const d = new Date(t.date);
  return d.getFullYear() === y && d.getMonth() === m;
});
export const amt = t => parseFloat(t.amount || 0);
