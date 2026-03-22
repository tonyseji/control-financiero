import { AppHeader } from '@/components/layout/AppHeader';
import { AccountCard } from '@/components/finance/AccountCard';
import { SectionHeader } from '@/components/finance/SectionHeader';
import { accounts, formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Accounts() {
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div>
      <AppHeader
        title="Cuentas"
        subtitle={`${accounts.length} vinculadas`}
        action={
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Añadir cuenta
          </Button>
        }
      />
      <main className="p-6 space-y-4 animate-reveal">
        {/* Total */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <p className="text-xs text-muted-foreground">Balance total de todas las cuentas</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums mt-1 text-foreground">{formatCurrency(totalBalance)}</p>
        </div>

        <SectionHeader title="Tus cuentas" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      </main>
    </div>
  );
}
