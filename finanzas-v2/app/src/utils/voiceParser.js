/**
 * voiceParser.js — Parser de texto hablado → campos de transacción.
 *
 * Sin dependencias externas. Diseñado para español (es-ES).
 *
 * API pública:
 *   parseVoiceText(text, categories, accounts)
 *   textToNumber(text)
 */

// ── Utilidades de normalización ───────────────────────────────────────────────

/**
 * Quita tildes y pasa a minúsculas para comparación case-insensitive sin acento.
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// ── textToNumber ──────────────────────────────────────────────────────────────

/** Unidades 0-19 */
const UNITS = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
}

/** Decenas */
const TENS = {
  veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50,
  sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
}

/** Centenas */
const HUNDREDS = {
  cien: 100, ciento: 100,
  doscientos: 200, doscientas: 200,
  trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400,
  quinientos: 500, quinientas: 500,
  seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700,
  ochocientos: 800, ochocientas: 800,
  novecientos: 900, novecientas: 900,
}

/** Multiplicadores de mil */
const THOUSANDS = {
  mil: 1, 'dos mil': 2, 'tres mil': 3, 'cuatro mil': 4, 'cinco mil': 5,
  'seis mil': 6, 'siete mil': 7, 'ocho mil': 8, 'nueve mil': 9,
}

// Pre-sorted key arrays (longest first) — computed once at module load
const THOUSAND_KEYS = Object.keys(THOUSANDS).sort((a, b) => b.length - a.length)
const HUNDRED_KEYS  = Object.keys(HUNDREDS).sort((a, b) => b.length - a.length)
const TEN_KEYS      = Object.keys(TENS).sort((a, b) => b.length - a.length)
const UNIT_KEYS     = Object.keys(UNITS).sort((a, b) => b.length - a.length)

/**
 * Convierte un texto en español a número (0–9999).
 * Soporta: "cuarenta y cinco", "doscientos", "mil quinientos", "dos mil trescientos veinte".
 *
 * @param {string} text
 * @returns {number|null}
 */
export function textToNumber(text) {
  const t = normalize(text).trim()
  if (!t) return null

  // ── Intentar con los compuestos de mil primero ──────────────────────────────
  // Patrón: "[N] mil [resto]"  — buscar clave de THOUSANDS en el texto
  for (const tKey of THOUSAND_KEYS) {
    const idx = t.indexOf(normalize(tKey))
    if (idx === -1) continue

    const milValue = THOUSANDS[tKey] * 1000
    const rest = t.slice(idx + normalize(tKey).length).trim()
    const restValue = rest ? parseSmallNumber(rest) : 0
    if (restValue === null && rest) continue // no entendimos el resto → skip
    return milValue + (restValue ?? 0)
  }

  // ── Sin "mil" ───────────────────────────────────────────────────────────────
  return parseSmallNumber(t)
}

/**
 * Parsea números hasta 999 (sin "mil").
 * @param {string} t — texto ya normalizado
 * @returns {number|null}
 */
function parseSmallNumber(t) {
  // Intentar centenas primero (pueden ir solas o combinadas)
  for (const hKey of HUNDRED_KEYS) {
    if (!t.includes(normalize(hKey))) continue
    const hundVal = HUNDREDS[hKey]
    const rest = t.replace(normalize(hKey), '').replace(/\by\b/g, '').trim()
    const restVal = rest ? parseUpTo99(rest) : 0
    if (restVal === null && rest) continue
    return hundVal + (restVal ?? 0)
  }

  // Intentar decenas + unidades
  return parseUpTo99(t)
}

/**
 * Parsea números 0-99.
 * @param {string} t — texto ya normalizado
 * @returns {number|null}
 */
function parseUpTo99(t) {
  // Decenas compuestas de 20-29 (veinti*)
  for (const tKey of TEN_KEYS) {
    if (!t.includes(normalize(tKey))) continue
    const tenVal = TENS[tKey]
    // Si la clave es "veinte" exacto pero hay "veinti*" en el texto, skip
    // (evitar que "veinte" matchee dentro de "veintiuno")
    if (tKey === 'veinte' && /veinti\w+/.test(t)) continue
    const rest = t.replace(normalize(tKey), '').replace(/\by\b/g, '').trim()
    const restVal = rest ? parseUnits(rest) : 0
    if (restVal === null && rest) continue
    return tenVal + (restVal ?? 0)
  }

  return parseUnits(t)
}

/**
 * Parsea unidades 0-19.
 * @param {string} t
 * @returns {number|null}
 */
function parseUnits(t) {
  for (const uKey of UNIT_KEYS) {
    if (t.includes(uKey)) {
      return UNITS[uKey]
    }
  }
  return null
}

// ── extractAmount ─────────────────────────────────────────────────────────────

/**
 * Extrae el importe del texto.
 * Soporta: "45", "45,50", "45 euros", "cuarenta y cinco euros", "mil quinientos",
 * "cuarenta y cinco con cincuenta", "doce coma noventa y nueve", "tres y medio".
 *
 * @param {string} text
 * @returns {number|null}
 */
function extractAmount(text) {
  const t = normalize(text)

  // Número literal con posibles decimales (tiene prioridad)
  const literalMatch = t.match(/\b(\d{1,6}(?:[.,]\d{1,2})?)\b/)
  if (literalMatch) {
    return parseFloat(literalMatch[1].replace(',', '.'))
  }

  // Texto en palabras — separar parte entera y decimal si existe
  // Patrones: "cuarenta y cinco con cincuenta", "... coma cincuenta", "... y medio"
  const cleaned = t
    .replace(/\beuros?\b/g, '')
    .replace(/\bcent[eé]simos?\b/g, '')
    .trim()

  // Detectar separador decimal en palabras: "con", "coma", "punto"
  const decimalSepMatch = cleaned.match(/^(.*?)\s+(?:con|coma|punto)\s+(.+)$/)
  if (decimalSepMatch) {
    const intPart = decimalSepMatch[1].trim()
    const decPart = decimalSepMatch[2].trim()
    const intVal  = textToNumber(intPart)
    if (intVal !== null) {
      // Parsear la parte decimal: "cincuenta" → 50 → 0.50, "cinco" → 5 → 0.05
      const decVal = textToNumber(decPart)
      if (decVal !== null) {
        // Normalizar a centésimas: 50→.50, 5→.05, 1→.01
        const decStr = String(decVal).padStart(2, '0').slice(0, 2)
        return parseFloat(`${intVal}.${decStr}`)
      }
      return intVal
    }
  }

  // "medio" / "media" como decimal → X,50
  const medioMatch = cleaned.match(/^(.*?)\s+y\s+medi[oa]$/)
  if (medioMatch) {
    const intVal = textToNumber(medioMatch[1].trim())
    if (intVal !== null) return intVal + 0.5
  }

  return textToNumber(cleaned)
}

// ── extractDate ───────────────────────────────────────────────────────────────

const DAY_NAMES = {
  lunes: 1, martes: 2, miercoles: 3, jueves: 4,
  viernes: 5, sabado: 6, domingo: 0,
}

const MONTH_NAMES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
}

/**
 * Devuelve una fecha ISO (YYYY-MM-DD) o null si no se detecta ninguna en el texto.
 *
 * Patrones reconocidos:
 *   - "hoy"
 *   - "ayer"
 *   - "el lunes" / "el martes" … → día de la semana más reciente
 *   - "el 3 de febrero" / "el 3/2" / "el día 3"
 *
 * @param {string} text
 * @returns {string|null}
 */
function extractDate(text) {
  const t = normalize(text)
  const now = new Date()

  // hoy
  if (/\bhoy\b/.test(t)) {
    return toISO(now)
  }

  // ayer
  if (/\bayer\b/.test(t)) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return toISO(d)
  }

  // "el/la lunes/martes/..." → día de la semana más reciente (≤ hoy)
  for (const [name, targetDay] of Object.entries(DAY_NAMES)) {
    const pattern = new RegExp(`\\b(el|la)?\\s*${name}\\b`)
    if (pattern.test(t)) {
      const d = new Date(now)
      const currentDay = d.getDay()
      let diff = currentDay - targetDay
      if (diff < 0) diff += 7
      if (diff === 0) diff = 0 // hoy mismo si coincide
      d.setDate(d.getDate() - diff)
      return toISO(d)
    }
  }

  // "el 3 de febrero" o "el 3/2" o "el día 3"
  // Formato "el día N de mes" o "el N de mes"
  const dayMonthTextMatch = t.match(/\b(?:el\s+)?(?:d[ií]a\s+)?(\d{1,2})\s+de\s+(\w+)/)
  if (dayMonthTextMatch) {
    const day = parseInt(dayMonthTextMatch[1], 10)
    const monthName = normalize(dayMonthTextMatch[2])
    const month = MONTH_NAMES[monthName]
    if (month && day >= 1 && day <= 31) {
      const year = now.getFullYear()
      const d = new Date(year, month - 1, day)
      if (!isNaN(d.getTime())) return toISO(d)
    }
  }

  // Formato numérico: "el 3/2" o "3/2"
  const numericDateMatch = t.match(/\b(\d{1,2})\/(\d{1,2})\b/)
  if (numericDateMatch) {
    const day = parseInt(numericDateMatch[1], 10)
    const month = parseInt(numericDateMatch[2], 10)
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const year = now.getFullYear()
      const d = new Date(year, month - 1, day)
      if (!isNaN(d.getTime())) return toISO(d)
    }
  }

  // "el día 3" → día N del mes actual
  const dayOnlyMatch = t.match(/\b(?:el\s+)?d[ií]a\s+(\d{1,2})\b/)
  if (dayOnlyMatch) {
    const day = parseInt(dayOnlyMatch[1], 10)
    if (day >= 1 && day <= 31) {
      const d = new Date(now.getFullYear(), now.getMonth(), day)
      if (!isNaN(d.getTime())) return toISO(d)
    }
  }

  return null
}

/**
 * Convierte un Date a string ISO YYYY-MM-DD (zona local).
 * @param {Date} d
 * @returns {string}
 */
function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── extractTxType ─────────────────────────────────────────────────────────────

const EXPENSE_KEYWORDS = [
  'gaste', 'pague', 'compre', 'cuesta', 'vale', 'costo', 'gasto',
  'pago', 'desembolse', 'inverti', 'ahorre', 'comprar', 'pagado',
]

const INCOME_KEYWORDS = [
  'cobre', 'ingrese', 'recibi', 'me pagaron', 'me ingresaron',
  'salario', 'nomina', 'sueldo', 'ingreso',
]

/**
 * Detecta si la transacción es income o expense.
 * @param {string} text
 * @returns {'income'|'expense'}
 */
function extractTxType(text) {
  const t = normalize(text)
  if (INCOME_KEYWORDS.some(kw => t.includes(kw))) return 'income'
  if (EXPENSE_KEYWORDS.some(kw => t.includes(kw))) return 'expense'
  return 'expense'
}

// ── extractCategoryId ─────────────────────────────────────────────────────────

/**
 * Cada entrada define alias de texto hablado → fragmentos a buscar en cat_name.
 * Los fragmentos de hints se comparan sin tildes.
 *
 * @type {Array<{ terms: string[], hints: string[] }>}
 */
const CATEGORY_HINTS = [
  {
    terms: ['supermercado', 'mercadona', 'lidl', 'carrefour', 'alcampo', 'dia', 'super', 'mercado', 'compra', 'alimentacion', 'comida', 'comestibles', 'fruta', 'verdura', 'carniceria'],
    hints: ['supermercado', 'alimentaci', 'comida', 'mercado'],
  },
  {
    terms: ['restaurante', 'bar', 'cafeteria', 'comer', 'cenar', 'almorzar', 'desayunar', 'pizza', 'hamburguesa', 'comida fuera'],
    hints: ['restaur', 'comida fuera', 'ocio', 'bar', 'cafe'],
  },
  {
    terms: ['gasolina', 'gasolinera', 'combustible', 'carburante', 'repostaje', 'diesel', 'gasoil'],
    hints: ['gasolin', 'transport', 'coche', 'combustible'],
  },
  {
    terms: ['metro', 'autobus', 'bus', 'tren', 'taxi', 'uber', 'cabify', 'renfe', 'avion', 'vuelo', 'transporte'],
    hints: ['transport'],
  },
  {
    terms: ['farmacia', 'medico', 'medicamento', 'medicina', 'doctor', 'clinica', 'hospital', 'salud'],
    hints: ['salud', 'farmac', 'medic'],
  },
  {
    terms: ['gym', 'gimnasio', 'deporte', 'fitness', 'natacion', 'sport'],
    hints: ['deporte', 'gym', 'gimnasio'],
  },
  {
    terms: ['netflix', 'spotify', 'hbo', 'amazon', 'prime', 'suscripcion', 'cine', 'teatro', 'concierto', 'ocio', 'entretenimiento'],
    hints: ['suscripci', 'ocio', 'entretenim'],
  },
  {
    terms: ['alquiler', 'hipoteca', 'piso', 'casa', 'vivienda', 'renta'],
    hints: ['vivienda', 'alquiler', 'hipoteca', 'hogar'],
  },
  {
    terms: ['luz', 'agua', 'gas', 'electricidad', 'internet', 'wifi', 'fibra', 'factura', 'suministro'],
    hints: ['suministro', 'luz', 'agua', 'gas', 'electricidad', 'servicios', 'hogar'],
  },
  {
    terms: ['movil', 'telefono', 'vodafone', 'movistar', 'orange', 'yoigo'],
    hints: ['movil', 'telefon', 'comunicaci'],
  },
  {
    terms: ['ropa', 'calzado', 'zapatos', 'zapatillas', 'camiseta', 'vestido', 'moda'],
    hints: ['ropa', 'calzado', 'moda'],
  },
  {
    terms: ['nomina', 'sueldo', 'salario'],
    hints: ['nomina', 'sueldo', 'salario'],
  },
  {
    terms: ['freelance', 'proyecto', 'cliente', 'factura'],
    hints: ['freelance', 'proyecto', 'trabajo'],
  },
  {
    terms: ['ahorro', 'ahorrar', 'ahorros', 'guardar', 'guarde'],
    hints: ['ahorro', 'saving'],
  },
  {
    terms: ['inversion', 'invertir', 'fondo', 'bolsa', 'acciones', 'etf'],
    hints: ['inversion', 'invest', 'fondo'],
  },
]

/**
 * Busca en la lista de categorías del usuario la más adecuada al texto hablado.
 *
 * @param {string} text
 * @param {Array<{ cat_id: string, cat_name: string, cat_type: string }>} categories
 * @returns {string|null} cat_id o null
 */
function extractCategoryId(text, categories) {
  if (!categories?.length) return null

  const t = normalize(text)

  for (const { terms, hints } of CATEGORY_HINTS) {
    const termMatch = terms.some(term => t.includes(normalize(term)))
    if (!termMatch) continue

    for (const hint of hints) {
      const found = categories.find(c =>
        normalize(c.cat_name).includes(normalize(hint))
      )
      if (found) return found.cat_id
    }
  }

  // Fallback: coincidencia directa entre palabras del transcript y cat_name
  const words = t.split(/\s+/).filter(w => w.length > 3)
  for (const word of words) {
    const found = categories.find(c => {
      const catNorm = normalize(c.cat_name)
      return catNorm.includes(word) || word.includes(catNorm)
    })
    if (found) return found.cat_id
  }

  return null
}

// ── extractAccountId ─────────────────────────────────────────────────────────

/**
 * Busca en el texto el nombre de una cuenta del usuario.
 * Patrones: "en [nombre]", "con [nombre]", "de [nombre]", "cuenta [nombre]"
 * o simplemente si el nombre de cuenta aparece en el texto.
 *
 * @param {string} text
 * @param {Array<{ acc_id: string, acc_name: string }>} accounts
 * @returns {string|null} acc_id o null
 */
function extractAccountId(text, accounts) {
  if (!accounts?.length) return null
  const t = normalize(text)

  // Patrones explícitos: "en la cuenta X", "con la tarjeta X", "en X"
  const accountPrefixes = [
    /\bcuenta\s+(\w[\w\s]*)/,
    /\btarjeta\s+(\w[\w\s]*)/,
    /\ben\s+(?:la\s+)?(?:cuenta\s+)?(\w[\w\s]*)/,
    /\bcon\s+(?:la\s+)?(?:cuenta\s+|tarjeta\s+)?(\w[\w\s]*)/,
    /\bde\s+(?:la\s+)?(?:cuenta\s+)?(\w[\w\s]*)/,
  ]

  for (const pattern of accountPrefixes) {
    const match = t.match(pattern)
    if (!match) continue
    const candidate = normalize(match[1]).trim()
    const found = accounts.find(a => {
      const accNorm = normalize(a.acc_name)
      return accNorm.includes(candidate) || candidate.includes(accNorm)
    })
    if (found) return found.acc_id
  }

  // Fallback: coincidencia directa del nombre de cuenta en el texto
  // Ordenar por longitud descendente para que "banco sabadell" no pierda contra "sabadell"
  const sorted = [...accounts].sort((a, b) => b.acc_name.length - a.acc_name.length)
  for (const acc of sorted) {
    if (acc.acc_name.length < 3) continue // evitar falsos positivos en nombres muy cortos
    if (t.includes(normalize(acc.acc_name))) return acc.acc_id
  }

  return null
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Parsea el texto hablado y extrae los campos del formulario de transacción.
 *
 * @param {string} text — transcripción completa del reconocimiento de voz
 * @param {Array<{ cat_id: string, cat_name: string, cat_type: string }>} categories
 * @param {Array<{ acc_id: string, acc_name: string }>} accounts
 * @returns {{
 *   amount:     number|null,
 *   date:       string|null,
 *   accountId:  string|null,
 *   note:       string,
 *   categoryId: string|null,
 *   txType:     'income'|'expense',
 * }}
 *
 * @example
 * parseVoiceText("gasté 45 euros ayer en supermercado con la tarjeta BBVA", categories, accounts)
 * // → { amount: 45, date: "2026-03-26", accountId: "...(BBVA id)", note: "...", categoryId: "...", txType: "expense" }
 */
export function parseVoiceText(text, categories = [], accounts = []) {
  if (!text?.trim()) {
    return {
      amount: null,
      date: null,
      accountId: accounts[0]?.acc_id ?? null,
      note: '',
      categoryId: null,
      txType: 'expense',
    }
  }

  const accountId = extractAccountId(text, accounts) ?? accounts[0]?.acc_id ?? null

  return {
    amount:     extractAmount(text),
    date:       extractDate(text),
    accountId,
    note:       text.trim(),
    categoryId: extractCategoryId(text, categories),
    txType:     extractTxType(text),
  }
}
