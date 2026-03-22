import { AppHeader } from '@/components/layout/AppHeader';
import { KPICard } from '@/components/finance/KPICard';
import { SectionHeader } from '@/components/finance/SectionHeader';
import { TransactionTable } from '@/components/finance/TransactionTable';
import { transactions, categoryExpenses, formatCurrency, monthlyTrend } from '@/data/mockData';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const totalBalance = 16237.08;
const monthlyIncome = 3900;
const monthlyExpenses = 578.42;
const monthlySavings = monthlyIncome - monthlyExpenses;

const chartTooltipStyle = {
  borderRadius: 8,
  border: '1px solid hsl(220, 16%, 91%)',
  fontSize: 12,
  boxShadow: '0 4px 16px 0 rgb(0 0 0 / 0.06)',
};

export default function Dashboard() {
  return (
    <div>
      <AppHeader title="Dashboard" subtitle="Resumen financiero" />
      <main className="p-6 space-y-6 animate-reveal">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          <KPICard
            title="Balance total"
            value={formatCurrency(totalBalance)}
            icon={Wallet}
            trend={{ value: '+2.4% este mes', positive: true }}
          />
          <KPICard
            title="Ingresos del mes"
            value={formatCurrency(monthlyIncome)}
            icon={TrendingUp}
            trend={{ value: '+€650 vs. feb', positive: true }}
          />
          <KPICard
            title="Gastos del mes"
            value={formatCurrency(monthlyExpenses)}
            icon={TrendingDown}
            trend={{ value: '-75% vs. feb', positive: true }}
          />
          <KPICard
            title="Ahorro del mes"
            value={formatCurrency(monthlySavings)}
            icon={PiggyBank}
          />
        </div>

        {/* Monthly budget summary */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-overline uppercase text-muted-foreground">Presupuesto mensual</h2>
            <Link
              to="/presupuestos"
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Configurar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Fijos', amount: 750, color: 'bg-primary', pct: 36 },
              { label: 'Variables', amount: 50, color: 'bg-destructive', pct: 2 },
              { label: 'Ahorro', amount: 0, color: 'bg-success', pct: 0 },
              { label: 'Inversión', amount: 0, color: 'bg-[hsl(var(--chart-4))]', pct: 0 },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                  <span className="text-[13px] font-semibold tabular-nums text-foreground">{formatCurrency(item.amount)}</span>
                </div>
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${Math.max(item.pct, 1)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums">{item.pct}% de ingresos</p>
              </div>
            ))}
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Trend chart */}
          <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 shadow-card">
            <SectionHeader title="Tendencia mensual" description="Ingresos vs. gastos" />
            <div className="mt-4 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 93%)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(220, 10%, 50%)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(220, 10%, 50%)' }} tickFormatter={(v) => `€${v / 1000}k`} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [formatCurrency(value)]} />
                  <Area type="monotone" dataKey="ingresos" stroke="hsl(152, 52%, 36%)" fill="hsl(152, 52%, 36%)" fillOpacity={0.06} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="gastos" stroke="hsl(224, 60%, 48%)" fill="hsl(224, 60%, 48%)" fillOpacity={0.06} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category pie */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <SectionHeader title="Gastos por categoría" />
            <div className="mt-3 h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryExpenses} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} strokeWidth={2} stroke="hsl(0, 0%, 100%)">
                    {categoryExpenses.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value)]} contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-1 space-y-1">
              {categoryExpenses.slice(0, 4).map((cat) => (
                <li key={cat.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-muted-foreground">{cat.name}</span>
                  </div>
                  <span className="font-medium tabular-nums">{formatCurrency(cat.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <SectionHeader
            title="Últimas transacciones"
            action={
              <Link to="/transacciones" className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <div className="mt-4">
            <TransactionTable transactions={transactions.slice(0, 6)} compact />
          </div>
        </div>
      </main>
    </div>
  );
}
