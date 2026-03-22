import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function KPICard({ title, value, icon: Icon, trend, className }: KPICardProps) {
  return (
    <div className={cn(
      'rounded-lg border border-border bg-card p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/[0.07]">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <p className="text-xl font-semibold tracking-tight tabular-nums text-foreground leading-none">{value}</p>
      {trend && (
        <p className={cn(
          'mt-2 text-[11px] font-medium',
          trend.positive ? 'text-success' : 'text-destructive'
        )}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </p>
      )}
    </div>
  );
}
