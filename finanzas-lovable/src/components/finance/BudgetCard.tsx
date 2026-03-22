import { cn } from '@/lib/utils';
import { formatCurrency } from '@/data/mockData';
import type { Budget } from '@/data/mockData';

interface BudgetCardProps {
  budget: Budget;
  className?: string;
}

export function BudgetCard({ budget, className }: BudgetCardProps) {
  const percentage = Math.round((budget.spent / budget.budgeted) * 100);
  const remaining = budget.budgeted - budget.spent;
  const isOverBudget = budget.spent > budget.budgeted;
  const isWarning = percentage >= 80 && !isOverBudget;

  return (
    <div className={cn(
      'rounded-lg border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover',
      isOverBudget ? 'border-destructive/30' : 'border-border',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-base">{budget.icon}</span>
          <p className="text-[13px] font-semibold text-foreground">{budget.category}</p>
        </div>
        <span className={cn(
          'text-[11px] font-semibold tabular-nums',
          isOverBudget ? 'text-destructive' : isWarning ? 'text-warning' : 'text-muted-foreground'
        )}>
          {percentage}%
        </span>
      </div>
      <div className="mt-3">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isOverBudget ? 'bg-destructive' : isWarning ? 'bg-warning' : 'bg-primary'
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] tabular-nums">
          <span className="text-foreground font-medium">{formatCurrency(budget.spent)}</span>
          <span className="text-muted-foreground">de {formatCurrency(budget.budgeted)}</span>
        </div>
      </div>
      {isOverBudget ? (
        <p className="mt-2 text-[11px] font-medium text-destructive">
          Excedido en {formatCurrency(Math.abs(remaining))}
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Disponible: {formatCurrency(remaining)}
        </p>
      )}
    </div>
  );
}
