// Gráfica de barras SVG nativa — sin dependencias externas.
// Props: data = [{ key, label, income, expenses }]

const BAR_W     = 18   // ancho de cada barra
const BAR_GAP   = 4    // gap entre las dos barras del mismo mes
const GROUP_GAP = 20   // gap entre grupos de meses
const CHART_H   = 120  // altura del área de barras
const PADDING_B = 24   // espacio para labels de mes
const PADDING_T = 8    // espacio superior
const SVG_H     = CHART_H + PADDING_B + PADDING_T

export default function MonthlyChart({ data }) {
  if (!data || data.length === 0) return null

  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1)

  const groupW  = BAR_W * 2 + BAR_GAP
  const totalW  = data.length * groupW + (data.length - 1) * GROUP_GAP
  const viewBox = `0 0 ${totalW} ${SVG_H}`

  function barHeight(val) {
    return Math.max((val / maxVal) * CHART_H, val > 0 ? 2 : 0)
  }

  // Usamos currentColor trick via un SVG inline con fill hardcodeado en CSS vars.
  // Como SVG no puede leer CSS vars en atributos fill directamente, usamos un
  // pequeño workaround: definimos los colores en un <defs> con un rectángulo de
  // referencia invisible, o simplemente usamos los colores directamente como
  // strings CSS var() dentro de un style= de React (que sí funciona).
  const colorIncome  = 'var(--income)'
  const colorExpense = 'var(--expense)'

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={viewBox} width="100%" style={{ display: 'block', maxWidth: totalW * 1.5 }}>
        {data.map((d, i) => {
          const x = i * (groupW + GROUP_GAP)

          const hIncome  = barHeight(d.income)
          const hExpense = barHeight(d.expenses)

          const yIncome  = PADDING_T + CHART_H - hIncome
          const yExpense = PADDING_T + CHART_H - hExpense

          const xIncome  = x
          const xExpense = x + BAR_W + BAR_GAP

          const labelX = x + groupW / 2
          const labelY = SVG_H - 4

          return (
            <g key={d.key}>
              {/* Barra ingresos */}
              <rect
                x={xIncome} y={yIncome}
                width={BAR_W} height={hIncome}
                rx={3} fill={colorIncome} opacity={0.85}
              />
              {/* Barra gastos */}
              <rect
                x={xExpense} y={yExpense}
                width={BAR_W} height={hExpense}
                rx={3} fill={colorExpense} opacity={0.85}
              />
              {/* Label mes */}
              <text
                x={labelX} y={labelY}
                textAnchor="middle"
                fontSize={9}
                fill="var(--text-faint)"
                fontFamily="inherit"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Leyenda */}
      <div style={s.legend}>
        <span style={s.legendItem}>
          <span style={{ ...s.dot, background: colorIncome }} />
          Ingresos
        </span>
        <span style={s.legendItem}>
          <span style={{ ...s.dot, background: colorExpense }} />
          Gastos
        </span>
      </div>
    </div>
  )
}

const s = {
  legend:     { display: 'flex', gap: '1rem', marginTop: '0.5rem' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' },
  dot:        { width: 8, height: 8, borderRadius: 2, flexShrink: 0 },
}
