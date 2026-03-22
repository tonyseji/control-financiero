import { cn } from '@/lib/utils';
import { formatCurrency } from '@/data/mockData';
import { Landmark, PiggyBank, CreditCard, Wallet } from 'lucide-react';
import type { Account } from '@/data/mockData';

const iconMap = {
  checking: Landmark,
  savings: PiggyBank,
  credit: CreditCard,
  cash: Wallet,
};

interface AccountCardProps {
  account: Account;
  className?: string;
}

export function AccountCard({ account, className }: AccountCardProps) {
  const Icon = iconMap[account.type];
  const isNegative = account.balance < 0;

  return (
    <div className={cn(
      'rounded-lg border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover group',
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/[0.07]">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-tight">{account.name}</p>
          <p className="text-[11px] text-muted-foreground">{account.typeLabel}</p>
        </div>
      </div>
      <p className={cn(
        'mt-3 text-lg font-semibold tabular-nums tracking-tight leading-none',
        isNegative ? 'text-destructive' : 'text-foreground'
      )}>
        {formatCurrency(account.balance)}
      </p>
    </div>
  );
}
