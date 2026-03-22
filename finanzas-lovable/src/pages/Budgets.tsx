import { AppHeader } from '@/components/layout/AppHeader';
import { BudgetCard } from '@/components/finance/BudgetCard';
import { SectionHeader } from '@/components/finance/SectionHeader';
import { budgets, formatCurrency } from '@/data/mockData';

export default function Budgets() {
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalPercentage = Math.round((totalSpent / totalBudgeted) * 100);

  return (
    <div>
      <AppHeader title="Presupuestos" subtitle="Marzo 2026" />
      <main className="p-6 space-y-4 animate-reveal">
        {/* Summary */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Gastado este mes</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums mt-1">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Presupuesto total</p>
              <p className="text-lg font-semibold tracking-tight tabular-nums text-muted-foreground mt-0.5">{formatCurrency(totalBudgeted)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Utilizado</p>
              <p className="text-lg font-semibold tracking-tight tabular-nums text-primary mt-0.5">{totalPercentage}%</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${totalPercentage}%` }} />
          </div>
        </div>

        <SectionHeader title="Presupuestos por categoría" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          {budgets.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} />
          ))}
        </div>
      </main>
    </div>
  );
}
