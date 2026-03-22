import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, type Transaction } from '@/data/mockData';
import { CategoryChip } from './CategoryChip';

interface TransactionTableProps {
  transactions: Transaction[];
  compact?: boolean;
  className?: string;
}

export function TransactionTable({ transactions, compact, className }: TransactionTableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Fecha</th>
            <th className="pb-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Descripción</th>
            {!compact && <th className="pb-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Categoría</th>}
            {!compact && <th className="pb-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Cuenta</th>}
            <th className="pb-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Monto</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-b border-border/40 last:border-0 group transition-colors hover:bg-muted/40">
              <td className="py-2.5 pr-4 text-xs text-muted-foreground tabular-nums whitespace-nowrap">{formatDate(t.date)}</td>
              <td className="py-2.5 pr-4 text-[13px] font-medium text-foreground">{t.description}</td>
              {!compact && <td className="py-2.5 pr-4"><CategoryChip category={t.category} /></td>}
              {!compact && <td className="py-2.5 pr-4 text-xs text-muted-foreground">{t.account}</td>}
              <td className={cn(
                'py-2.5 text-right text-[13px] font-semibold tabular-nums whitespace-nowrap',
                t.amount >= 0 ? 'text-success' : 'text-foreground'
              )}>
                {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
