export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  account: string;
  amount: number;
  type: 'income' | 'expense';
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash';
  typeLabel: string;
  balance: number;
  currency: string;
  lastActivity: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
}

export interface Budget {
  id: string;
  category: string;
  budgeted: number;
  spent: number;
  icon: string;
}

export interface CategorySummary {
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

export const transactions: Transaction[] = [
  { id: '1', date: '2026-03-22', description: 'Supermercado Carrefour', category: 'Alimentación', account: 'Cuenta corriente', amount: -87.40, type: 'expense' },
  { id: '2', date: '2026-03-21', description: 'Nómina Marzo', category: 'Salario', account: 'Cuenta corriente', amount: 3250.00, type: 'income' },
  { id: '3', date: '2026-03-20', description: 'Netflix', category: 'Entretenimiento', account: 'Tarjeta Visa', amount: -15.99, type: 'expense' },
  { id: '4', date: '2026-03-19', description: 'Gasolina Repsol', category: 'Transporte', account: 'Tarjeta Visa', amount: -62.30, type: 'expense' },
  { id: '5', date: '2026-03-18', description: 'Farmacia Central', category: 'Salud', account: 'Cuenta corriente', amount: -23.50, type: 'expense' },
  { id: '6', date: '2026-03-17', description: 'Freelance diseño web', category: 'Ingreso extra', account: 'Cuenta corriente', amount: 450.00, type: 'income' },
  { id: '7', date: '2026-03-16', description: 'Restaurante La Tasca', category: 'Alimentación', account: 'Tarjeta Visa', amount: -42.80, type: 'expense' },
  { id: '8', date: '2026-03-15', description: 'Factura electricidad', category: 'Servicios', account: 'Cuenta corriente', amount: -78.90, type: 'expense' },
  { id: '9', date: '2026-03-14', description: 'Zara - ropa', category: 'Compras', account: 'Tarjeta Visa', amount: -129.95, type: 'expense' },
  { id: '10', date: '2026-03-13', description: 'Transferencia recibida', category: 'Ingreso extra', account: 'Ahorro', amount: 200.00, type: 'income' },
  { id: '11', date: '2026-03-12', description: 'Gimnasio mensual', category: 'Salud', account: 'Cuenta corriente', amount: -39.90, type: 'expense' },
  { id: '12', date: '2026-03-11', description: 'Uber', category: 'Transporte', account: 'Tarjeta Visa', amount: -18.50, type: 'expense' },
  { id: '13', date: '2026-03-10', description: 'Curso Udemy', category: 'Educación', account: 'Tarjeta Visa', amount: -12.99, type: 'expense' },
  { id: '14', date: '2026-03-09', description: 'Mercadona', category: 'Alimentación', account: 'Cuenta corriente', amount: -56.20, type: 'expense' },
  { id: '15', date: '2026-03-08', description: 'Spotify Premium', category: 'Entretenimiento', account: 'Tarjeta Visa', amount: -9.99, type: 'expense' },
];

export const accounts: Account[] = [
  { id: '1', name: 'Cuenta corriente', type: 'checking', typeLabel: 'Cuenta corriente', balance: 4832.50, currency: 'EUR', lastActivity: '2026-03-22' },
  { id: '2', name: 'Ahorro', type: 'savings', typeLabel: 'Cuenta de ahorro', balance: 12450.00, currency: 'EUR', lastActivity: '2026-03-20' },
  { id: '3', name: 'Tarjeta Visa', type: 'credit', typeLabel: 'Tarjeta de crédito', balance: -1230.42, currency: 'EUR', lastActivity: '2026-03-21' },
  { id: '4', name: 'Efectivo', type: 'cash', typeLabel: 'Efectivo', balance: 185.00, currency: 'EUR', lastActivity: '2026-03-18' },
];

export const goals: Goal[] = [
  { id: '1', title: 'Fondo de emergencia', targetAmount: 10000, currentAmount: 7500, deadline: '2026-09-01', category: 'Ahorro' },
  { id: '2', title: 'Vacaciones verano', targetAmount: 3000, currentAmount: 1850, deadline: '2026-06-15', category: 'Viajes' },
  { id: '3', title: 'MacBook Pro', targetAmount: 2500, currentAmount: 800, deadline: '2026-12-01', category: 'Tecnología' },
  { id: '4', title: 'Entrada piso', targetAmount: 30000, currentAmount: 12450, deadline: '2028-01-01', category: 'Vivienda' },
];

export const budgets: Budget[] = [
  { id: '1', category: 'Alimentación', budgeted: 400, spent: 186.40, icon: '🛒' },
  { id: '2', category: 'Transporte', budgeted: 150, spent: 80.80, icon: '🚗' },
  { id: '3', category: 'Entretenimiento', budgeted: 100, spent: 25.98, icon: '🎬' },
  { id: '4', category: 'Servicios', budgeted: 200, spent: 78.90, icon: '💡' },
  { id: '5', category: 'Salud', budgeted: 100, spent: 63.40, icon: '🏥' },
  { id: '6', category: 'Compras', budgeted: 200, spent: 129.95, icon: '🛍️' },
  { id: '7', category: 'Educación', budgeted: 50, spent: 12.99, icon: '📚' },
];

export const categoryExpenses: CategorySummary[] = [
  { name: 'Alimentación', amount: 186.40, color: 'hsl(228, 68%, 50%)', percentage: 32 },
  { name: 'Compras', amount: 129.95, color: 'hsl(340, 65%, 50%)', percentage: 22 },
  { name: 'Transporte', amount: 80.80, color: 'hsl(38, 92%, 50%)', percentage: 14 },
  { name: 'Servicios', amount: 78.90, color: 'hsl(152, 56%, 38%)', percentage: 14 },
  { name: 'Salud', amount: 63.40, color: 'hsl(262, 52%, 50%)', percentage: 11 },
  { name: 'Entretenimiento', amount: 25.98, color: 'hsl(190, 70%, 42%)', percentage: 4 },
  { name: 'Educación', amount: 12.99, color: 'hsl(20, 70%, 50%)', percentage: 2 },
];

export const monthlyTrend = [
  { month: 'Oct', ingresos: 3250, gastos: 2180 },
  { month: 'Nov', ingresos: 3700, gastos: 2450 },
  { month: 'Dic', ingresos: 4100, gastos: 3200 },
  { month: 'Ene', ingresos: 3250, gastos: 2100 },
  { month: 'Feb', ingresos: 3250, gastos: 2380 },
  { month: 'Mar', ingresos: 3900, gastos: 578.42 },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(dateStr));
}

export function formatDateLong(dateStr: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}
