import { AppHeader } from '@/components/layout/AppHeader';
import { GoalCard } from '@/components/finance/GoalCard';
import { SectionHeader } from '@/components/finance/SectionHeader';
import { goals, formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Goals() {
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const progressPct = Math.round((totalSaved / totalTarget) * 100);

  return (
    <div>
      <AppHeader
        title="Objetivos"
        subtitle={`${goals.length} activos`}
        action={
          <Button size="sm" className="gap-1.5 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Nuevo objetivo
          </Button>
        }
      />
      <main className="p-6 space-y-4 animate-reveal">
        {/* Summary */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Total ahorrado</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums mt-1">{formatCurrency(totalSaved)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Objetivo total</p>
              <p className="text-lg font-semibold tracking-tight tabular-nums text-muted-foreground mt-0.5">{formatCurrency(totalTarget)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Progreso</p>
              <p className="text-lg font-semibold tracking-tight tabular-nums text-primary mt-0.5">{progressPct}%</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <SectionHeader title="Tus objetivos" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </main>
    </div>
  );
}
