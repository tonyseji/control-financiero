const PERSONAL_KEYWORDS = [
  'mi', 'mío', 'yo', 'mía',
  'gasto', 'ingreso', 'balance', 'ahorro', 'cuenta',
  'marzo', 'febrero', 'mes', 'semana',
  'peor', 'mejor', 'más', 'menos',
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  '2026', '2025',
]

const GENERAL_KEYWORDS = [
  'cómo', 'qué', 'cuándo', 'dónde',
  'invertir', 'ahorrar', 'pagar', 'hipoteca',
  'casa', 'piso', 'coche', 'viaje',
  'tarjeta', 'crédito', 'deuda', 'impuesto',
  'fondo', 'bolsa', 'acciones', 'crypto',
]

export function classifyQuestion(question) {
  const lower = question.toLowerCase()

  const personalScore = PERSONAL_KEYWORDS.filter(kw => lower.includes(kw)).length
  const generalScore = GENERAL_KEYWORDS.filter(kw => lower.includes(kw)).length

  if (personalScore > 0 && personalScore >= generalScore) {
    return { isPersonal: true, confidence: personalScore / PERSONAL_KEYWORDS.length }
  }

  return { isPersonal: false, confidence: generalScore / GENERAL_KEYWORDS.length }
}
