import { AppHeader } from '@/components/layout/AppHeader';
import { SectionHeader } from '@/components/finance/SectionHeader';
import { categoryExpenses, monthlyTrend, formatCurrency } from '@/data/mockData';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer,
} from 'recharts';

const chartTooltipStyle = {
  borderRadius: 8,
  border: '1px solid hsl(220, 16%, 91%)',
  fontSize: 12,
  boxShadow: '0 4px 16px 0 rgb(0 0 0 / 0.06)',
};

export default function Analytics() {
  return (
    <div>
      <AppHeader title="Análisis" subtitle="Insights financieros" />
      <main className="p-6 space-y-4 animate-reveal">
        {/* Monthly trend */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <SectionHeader title="Evolución mensual" description="Ingresos y gastos de los últimos 6 meses" />
          <div className="mt-4 h-[280px]">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Category bar chart */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <SectionHeader title="Gastos por categoría" description="Comparativa del mes actual" />
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryExpenses} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 93%)" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(220, 10%, 50%)' }} tickFormatter={(v) => `€${v}`} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(220, 10%, 50%)' }} width={90} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [formatCurrency(value)]} />
                  <Bar dataKey="amount" radius={[0, 3, 3, 0]} barSize={16}>
                    {categoryExpenses.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribution donut */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <SectionHeader title="Distribución de gastos" description="Proporción por categoría" />
            <div className="mt-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryExpenses} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} strokeWidth={2} stroke="hsl(0, 0%, 100%)">
                    {categoryExpenses.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value)]} contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {categoryExpenses.map((cat) => (
                <li key={cat.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-muted-foreground truncate">{cat.name}</span>
                  </div>
                  <span className="font-medium tabular-nums ml-2">{cat.percentage}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
