import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

// Tooltip personalizado — usa variables CSS para compatibilidad dark/light
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '0.6rem 0.85rem',
      fontSize: '0.78rem',
      boxShadow: 'var(--shadow)',
      minWidth: 140,
    }}>
      <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
            {p.dataKey === 'income' ? 'Ingresos' : 'Gastos'}
          </span>
          <span style={{ color: p.stroke }}>
            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MonthlyChart({ data }) {
  if (!data || data.length === 0) return null

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--text-faint)', fontFamily: 'inherit' }}
            dy={6}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--text-faint)', fontFamily: 'inherit' }}
            tickFormatter={v => v >= 1000 ? `€${(v / 1000).toFixed(0)}k` : `€${v}`}
            width={42}
            tickCount={5}
            allowDecimals={false}
            domain={['auto', 'auto']}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="income"
            stroke="#22c55e"
            strokeWidth={1.5}
            fill="url(#fillIncome)"
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e', stroke: 'var(--bg-card)', strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="#f43f5e"
            strokeWidth={1.5}
            fill="url(#fillExpense)"
            dot={false}
            activeDot={{ r: 4, fill: '#f43f5e', stroke: 'var(--bg-card)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Leyenda — alineada con el área de datos (compensando el ancho del YAxis) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginTop: '0.5rem', paddingLeft: 42 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
          <span style={{ width: 12, height: 2.5, borderRadius: 2, background: '#22c55e', flexShrink: 0, display: 'inline-block' }} />
          Ingresos
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
          <span style={{ width: 12, height: 2.5, borderRadius: 2, background: '#f43f5e', flexShrink: 0, display: 'inline-block' }} />
          Gastos
        </span>
      </div>
    </div>
  )
}
