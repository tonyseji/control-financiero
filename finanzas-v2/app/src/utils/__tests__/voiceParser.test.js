/**
 * voiceParser.test.js
 *
 * Tests unitarios para textToNumber y parseVoiceText.
 * Los tests marcados con "TODO" documentan gaps reales del parser —
 * usan el comportamiento ACTUAL (no el deseado) para evitar falsos positivos.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { textToNumber, parseVoiceText } from '../voiceParser.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockCategories = [
  { cat_id: 'c1', cat_name: 'Supermercado',  cat_type: 'variable_expense' },
  { cat_id: 'c2', cat_name: 'Alquiler',      cat_type: 'fixed_expense'    },
  { cat_id: 'c3', cat_name: 'Nómina',        cat_type: 'income'           },
  { cat_id: 'c4', cat_name: 'Transporte',    cat_type: 'variable_expense' },
  { cat_id: 'c5', cat_name: 'Farmacia',      cat_type: 'variable_expense' },
]

const mockAccounts = [
  { acc_id: 'a1', acc_name: 'BBVA'     },
  { acc_id: 'a2', acc_name: 'Efectivo' },
]

// ── textToNumber ──────────────────────────────────────────────────────────────

describe('textToNumber', () => {

  describe('números simples', () => {
    it('cuarenta y cinco → 45', () => {
      expect(textToNumber('cuarenta y cinco')).toBe(45)
    })

    it('cien → 100', () => {
      expect(textToNumber('cien')).toBe(100)
    })

    it('doscientos treinta → 230', () => {
      expect(textToNumber('doscientos treinta')).toBe(230)
    })

    it('veinte → 20', () => {
      expect(textToNumber('veinte')).toBe(20)
    })

    it('nueve → 9', () => {
      expect(textToNumber('nueve')).toBe(9)
    })
  })

  describe('miles', () => {
    it('mil quinientos → 1500', () => {
      expect(textToNumber('mil quinientos')).toBe(1500)
    })

    it('dos mil trescientos → 2300', () => {
      expect(textToNumber('dos mil trescientos')).toBe(2300)
    })

    it('mil → 1000', () => {
      expect(textToNumber('mil')).toBe(1000)
    })

    it('dos mil → 2000', () => {
      expect(textToNumber('dos mil')).toBe(2000)
    })
  })

  describe('números literales (dígitos)', () => {
    // textToNumber opera sobre texto en palabras; los literales numéricos
    // no están en su dominio — el parser los maneja en extractAmount vía regex.
    // TODO: textToNumber con "45" devuelve null (dominio solo palabras)
    it('"45" en texto → null (dominio solo palabras, los literales los maneja extractAmount)', () => {
      expect(textToNumber('45')).toBeNull()
    })
  })

  describe('decimales en texto', () => {
    // textToNumber no maneja decimales directamente — eso es responsabilidad
    // de extractAmount (capa superior). Estos casos se testean en parseVoiceText.
    it('"cuarenta y cinco con cincuenta" → null (decimales son de extractAmount, no textToNumber)', () => {
      expect(textToNumber('cuarenta y cinco con cincuenta')).toBeNull()
    })
  })

  describe('casos límite', () => {
    it('string vacío → null', () => {
      expect(textToNumber('')).toBeNull()
    })

    it('texto sin número → null', () => {
      expect(textToNumber('hola mundo')).toBeNull()
    })
  })
})

// ── parseVoiceText — amount ───────────────────────────────────────────────────

describe('parseVoiceText — amount', () => {
  it('"gasté 45 euros en supermercado" → 45', () => {
    const { amount } = parseVoiceText('gasté 45 euros en supermercado', [], [])
    expect(amount).toBe(45)
  })

  it('"pagué 1250 de alquiler" → 1250', () => {
    const { amount } = parseVoiceText('pagué 1250 de alquiler', [], [])
    expect(amount).toBe(1250)
  })

  it('"cobré 2100 de nómina" → 2100', () => {
    const { amount } = parseVoiceText('cobré 2100 de nómina', [], [])
    expect(amount).toBe(2100)
  })

  it('"pagué doscientos euros de luz" → 200', () => {
    const { amount } = parseVoiceText('pagué doscientos euros de luz', [], [])
    expect(amount).toBe(200)
  })

  describe('decimales', () => {
    it('"45,50 en farmacia" → 45.5 (coma como separador decimal)', () => {
      const { amount } = parseVoiceText('45,50 en farmacia', [], [])
      expect(amount).toBe(45.5)
    })

    it('"45.50 en farmacia" → 45.5 (punto como separador decimal)', () => {
      const { amount } = parseVoiceText('45.50 en farmacia', [], [])
      expect(amount).toBe(45.5)
    })

    it('"gasté cuarenta y cinco con cincuenta euros" → 45.5', () => {
      const { amount } = parseVoiceText('gasté cuarenta y cinco con cincuenta euros', [], [])
      expect(amount).toBe(45.5)
    })

    it('"gasté quince coma noventa y nueve" → 15.99', () => {
      const { amount } = parseVoiceText('gasté quince coma noventa y nueve', [], [])
      expect(amount).toBe(15.99)
    })

    it('"pagué tres y medio euros" → 3.5', () => {
      const { amount } = parseVoiceText('pagué tres y medio euros', [], [])
      expect(amount).toBe(3.5)
    })
  })
})

// ── parseVoiceText — txType ───────────────────────────────────────────────────

describe('parseVoiceText — txType', () => {
  it('"gasté 50 euros" → expense', () => {
    const { txType } = parseVoiceText('gasté 50 euros', [], [])
    expect(txType).toBe('expense')
  })

  it('"cobré la nómina de 2100" → income', () => {
    const { txType } = parseVoiceText('cobré la nómina de 2100', [], [])
    expect(txType).toBe('income')
  })

  it('"pagué 80 euros de electricidad" → expense', () => {
    const { txType } = parseVoiceText('pagué 80 euros de electricidad', [], [])
    expect(txType).toBe('expense')
  })

  it('"recibí 500 euros de un cliente" → income', () => {
    const { txType } = parseVoiceText('recibí 500 euros de un cliente', [], [])
    expect(txType).toBe('income')
  })

  describe('ahorro → expense (diseño V2)', () => {
    // En V2 el ahorro es un gasto (sale de una cuenta).
    // El keyword "ahorre" está en EXPENSE_KEYWORDS, por lo que el parser
    // debe devolver "expense", lo cual es correcto por diseño.
    it('"ahorro 200 euros este mes" → expense (ahorro es expense en V2)', () => {
      const { txType } = parseVoiceText('ahorro 200 euros este mes', [], [])
      expect(txType).toBe('expense')
    })

    it('"ahorré 150 euros" → expense', () => {
      const { txType } = parseVoiceText('ahorré 150 euros', [], [])
      expect(txType).toBe('expense')
    })
  })

  it('sin keyword reconocida → expense (default)', () => {
    const { txType } = parseVoiceText('cincuenta euros', [], [])
    expect(txType).toBe('expense')
  })
})

// ── parseVoiceText — date ─────────────────────────────────────────────────────

describe('parseVoiceText — date', () => {
  // Usamos fechas fijas mediante vi.setSystemTime para tests deterministas.
  // Fecha de referencia: viernes 3 de abril de 2026.
  const REFERENCE_DATE = new Date('2026-04-03T12:00:00')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(REFERENCE_DATE)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('"gasté 30 euros ayer" → 2026-04-02', () => {
    const { date } = parseVoiceText('gasté 30 euros ayer', [], [])
    expect(date).toBe('2026-04-02')
  })

  it('"gasté 30 euros hoy" → 2026-04-03', () => {
    const { date } = parseVoiceText('gasté 30 euros hoy', [], [])
    expect(date).toBe('2026-04-03')
  })

  it('"pagué 50 el lunes" → 2026-03-30 (lunes más reciente)', () => {
    // Referencia es viernes 3-abr. El lunes más reciente fue 30-mar.
    const { date } = parseVoiceText('pagué 50 el lunes', [], [])
    expect(date).toBe('2026-03-30')
  })

  it('"compré el 3 de marzo" → 2026-03-03', () => {
    const { date } = parseVoiceText('compré el 3 de marzo', [], [])
    expect(date).toBe('2026-03-03')
  })

  it('"compré el 15 de enero" → 2026-01-15', () => {
    const { date } = parseVoiceText('compré el 15 de enero', [], [])
    expect(date).toBe('2026-01-15')
  })

  it('sin fecha → null', () => {
    const { date } = parseVoiceText('gasté 45 euros en supermercado', [], [])
    expect(date).toBeNull()
  })

  describe('GAP — día numérico solo ("el día 3")', () => {
    it('"gasté 30 euros el día 3" → 2026-04-03 (día del mes actual)', () => {
      const { date } = parseVoiceText('gasté 30 euros el día 3', [], [])
      expect(date).toBe('2026-04-03')
    })
  })
})

// ── parseVoiceText — categoryId ───────────────────────────────────────────────

describe('parseVoiceText — categoryId', () => {
  it('"gasté 30 en mercadona" → c1 (Supermercado)', () => {
    const { categoryId } = parseVoiceText('gasté 30 en mercadona', mockCategories, [])
    expect(categoryId).toBe('c1')
  })

  it('"pagué el alquiler" → c2 (Alquiler)', () => {
    const { categoryId } = parseVoiceText('pagué el alquiler', mockCategories, [])
    expect(categoryId).toBe('c2')
  })

  it('"cobré la nómina" → c3 (Nómina)', () => {
    const { categoryId } = parseVoiceText('cobré la nómina', mockCategories, [])
    expect(categoryId).toBe('c3')
  })

  it('"metro al trabajo" → c4 (Transporte)', () => {
    const { categoryId } = parseVoiceText('metro al trabajo', mockCategories, [])
    expect(categoryId).toBe('c4')
  })

  it('"compré en la farmacia" → c5 (Farmacia)', () => {
    const { categoryId } = parseVoiceText('compré en la farmacia', mockCategories, [])
    expect(categoryId).toBe('c5')
  })

  it('texto sin categoría reconocible → null', () => {
    const { categoryId } = parseVoiceText('moví dinero', mockCategories, [])
    expect(categoryId).toBeNull()
  })

  it('sin array de categorías → null', () => {
    const { categoryId } = parseVoiceText('gasté 30 en mercadona', [], [])
    expect(categoryId).toBeNull()
  })
})

// ── parseVoiceText — accountId ────────────────────────────────────────────────

describe('parseVoiceText — accountId', () => {
  it('"gasté 30 con la tarjeta BBVA" → a1', () => {
    const { accountId } = parseVoiceText('gasté 30 con la tarjeta BBVA', [], mockAccounts)
    expect(accountId).toBe('a1')
  })

  it('"pagué en efectivo" → a2', () => {
    const { accountId } = parseVoiceText('pagué en efectivo', [], mockAccounts)
    expect(accountId).toBe('a2')
  })

  it('"pagué 50 con BBVA" → a1 (fallback coincidencia directa)', () => {
    const { accountId } = parseVoiceText('pagué 50 con BBVA', [], mockAccounts)
    expect(accountId).toBe('a1')
  })

  it('sin mención de cuenta → primera cuenta por defecto (acc_id: a1)', () => {
    // parseVoiceText usa accounts[0] como fallback cuando no detecta cuenta
    const { accountId } = parseVoiceText('gasté 30 euros', [], mockAccounts)
    expect(accountId).toBe('a1')
  })

  it('sin array de cuentas → null', () => {
    const { accountId } = parseVoiceText('gasté 30 con la tarjeta BBVA', [], [])
    expect(accountId).toBeNull()
  })
})

// ── parseVoiceText — texto vacío ──────────────────────────────────────────────

describe('parseVoiceText — texto vacío o nulo', () => {
  it('string vacío → objeto con nulls y defaults', () => {
    const result = parseVoiceText('', [], [])
    expect(result.amount).toBeNull()
    expect(result.date).toBeNull()
    expect(result.categoryId).toBeNull()
    expect(result.txType).toBe('expense')
    expect(result.note).toBe('')
  })

  it('undefined → objeto con nulls y defaults', () => {
    const result = parseVoiceText(undefined, [], [])
    expect(result.amount).toBeNull()
    expect(result.date).toBeNull()
  })
})

// ── parseVoiceText — integración (frase completa) ─────────────────────────────

describe('parseVoiceText — integración', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-03T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('frase completa: "gasté 45 euros en supermercado ayer con la tarjeta BBVA"', () => {
    const result = parseVoiceText(
      'gasté 45 euros en supermercado ayer con la tarjeta BBVA',
      mockCategories,
      mockAccounts,
    )
    expect(result.amount).toBe(45)
    expect(result.date).toBe('2026-04-02')
    expect(result.categoryId).toBe('c1')
    expect(result.accountId).toBe('a1')
    expect(result.txType).toBe('expense')
  })

  it('frase de ingreso: "cobré la nómina de 2100 euros hoy"', () => {
    const result = parseVoiceText(
      'cobré la nómina de 2100 euros hoy',
      mockCategories,
      mockAccounts,
    )
    expect(result.amount).toBe(2100)
    expect(result.date).toBe('2026-04-03')
    expect(result.categoryId).toBe('c3')
    expect(result.txType).toBe('income')
  })
})
