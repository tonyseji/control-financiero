import { cn } from '@/lib/utils';
import { formatCurrency } from '@/data/mockData';
import type { Goal } from '@/data/mockData';

interface GoalCardProps {
  goal: Goal;
  className?: string;
}

export function GoalCard({ goal, className }: GoalCardProps) {
  const percentage = Math.round((goal.currentAmount / goal.targetAmount) * 100);
  const remaining = goal.targetAmount - goal.currentAmount;
  const deadlineDate = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(goal.deadline));

  return (
    <div className={cn(
      'rounded-lg border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover',
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-tight">{goal.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{goal.category} · {deadlineDate}</p>
        </div>
        <span className="text-xs font-semibold text-primary tabular-nums flex-shrink-0">{percentage}%</span>
      </div>
      <div className="mt-3">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] tabular-nums">
          <span className="text-foreground font-medium">{formatCurrency(goal.currentAmount)}</span>
          <span className="text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Faltan {formatCurrency(remaining)}
      </p>
    </div>
  );
}
