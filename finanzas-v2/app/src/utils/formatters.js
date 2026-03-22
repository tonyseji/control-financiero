// Formatters para moneda (EUR), fechas en español y porcentajes

const currency = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dateLong = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function formatCurrency(amount) {
  return currency.format(amount)
}

export function formatDate(isoDate) {
  return dateFormatter.format(new Date(isoDate))
}

export function formatDateLong(isoDate) {
  return dateLong.format(new Date(isoDate))
}

export function formatPct(value) {
  return `${value}%`
}

// Devuelve { from: 'YYYY-MM-01', to: 'YYYY-MM-DD' } para el mes indicado
export function monthRange(year, month) {
  const lastDay = new Date(year, month, 0).getDate() // month es 1-indexed
  const m = String(month).padStart(2, '0')
  const d = String(lastDay).padStart(2, '0')
  return { from: `${year}-${m}-01`, to: `${year}-${m}-${d}` }
}