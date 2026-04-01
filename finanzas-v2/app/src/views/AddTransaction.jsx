import { useState, useEffect, useRef } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'
import { useVoiceInput } from '../hooks/useVoiceInput'

const today = () => new Date().toISOString().slice(0, 10)

function inferSubtype(tx) {
  const catType = tx?.categories?.cat_type
  if (!catType) return 'fixed_expense'
  if (['fixed_expense', 'variable_expense', 'saving', 'investment'].includes(catType)) return catType
  return 'fixed_expense'
}

export default function AddTransaction({ onSuccess, editTx }) {
  const isEdit = !!editTx
  const { add, update, addTransfer } = useTransactions()
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const { isListening, transcript, parsedFields, supported, error: voiceError, startListening, stopListening } =
    useVoiceInput({ categories, accounts })

  const [type, setType]         = useState(editTx?.tx_type ?? 'expense')
  const [subtype, setSubtype]   = useState(editTx ? inferSubtype(editTx) : 'fixed_expense')
  const [amount, setAmount]     = useState(editTx ? String(editTx.tx_amount) : '')
  const [date, setDate]         = useState(editTx?.tx_date?.slice(0, 10) ?? today())
  const [catId, setCatId]       = useState(editTx?.tx_cat_id ?? '')
  const [accId, setAccId]       = useState(editTx?.tx_acc_id ?? '')
  const [toAccId, setToAccId]   = useState('')
  const [notes, setNotes]       = useState(editTx?.tx_notes ?? '')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [voiceFeedback, setVoiceFeedback] = useState(null) // mensaje tras autorrelleno

  // Track which fields the user has manually edited after the last voice fill.
  // Prevents voice from overwriting deliberate user changes.
  const userEdited = useRef({ amount: false, date: false, catId: false, type: false })

  const isTransfer = type === 'transfer'

  const filteredCats = categories.filter(c =>
    type === 'income' ? c.cat_type === 'income' : c.cat_type === subtype
  )

  useEffect(() => {
    if (!isEdit && accounts.length === 1 && !accId) setAccId(accounts[0].acc_id)
  }, [accounts])

  useEffect(() => {
    if (isEdit) return
    // Si la voz (o el usuario) ya fijó una categoría concreta, no resetear
    if (userEdited.current.catId) return
    const first = filteredCats[0]
    setCatId(first ? first.cat_id : '')
  }, [type, subtype, categories]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Aplicar parsedFields cuando llegan (respetando ediciones manuales) ────
  //
  // Los flags en userEdited.current se ponen a true cuando el usuario edita
  // manualmente un campo. Se resetean a false cuando comienza una nueva sesión
  // de voz (ver startListening en useVoiceInput, que llama setParsedFields(null),
  // lo cual no dispara este effect). El reset aquí está en el handler del botón mic.
  useEffect(() => {
    if (!parsedFields) return

    // amount — solo si el usuario no lo ha editado manualmente
    if (parsedFields.amount !== null && !userEdited.current.amount) {
      setAmount(String(parsedFields.amount))
    }

    // date — solo si se detectó una fecha explícita y el usuario no la cambió
    if (parsedFields.date !== null && !userEdited.current.date) {
      setDate(parsedFields.date)
    }

    // type + subtype + catId — solo si no es modo edición
    if (!isEdit) {
      if (parsedFields.categoryId) {
        const matchedCat = categories.find(c => c.cat_id === parsedFields.categoryId)
        if (matchedCat) {
          // Subtype siempre se infiere de la categoría: el usuario no tiene por qué especificarlo
          if (['fixed_expense', 'variable_expense', 'saving', 'investment'].includes(matchedCat.cat_type)) {
            setSubtype(matchedCat.cat_type)
          }
          // El tipo principal (income/expense) solo si el usuario no lo cambió manualmente
          if (!userEdited.current.type) {
            setType(matchedCat.cat_type === 'income' ? 'income' : 'expense')
          }
        }
        if (!userEdited.current.catId) {
          setCatId(parsedFields.categoryId)
          // Marcar como fijado para que el efecto [type,subtype] no lo sobreescriba
          userEdited.current.catId = true
        }
      } else if (!userEdited.current.type) {
        // Sin categoría detectada, al menos aplicar el tipo
        setType(parsedFields.txType)
      }
    }

    // accountId — solo si se detectó una cuenta explícita en la voz
    if (parsedFields.accountId) {
      setAccId(parsedFields.accountId)
    }

    // note — siempre rellenar con el transcript completo cuando llega
    if (parsedFields.note) {
      setNotes(parsedFields.note)
    }

    // Mostrar feedback detallado de los campos rellenados
    // (fecha y cuenta no se muestran cuando son los valores por defecto)
    const parts = []
    if (parsedFields.amount !== null && !userEdited.current.amount) {
      parts.push(`importe: ${parsedFields.amount} €`)
    }
    if (parsedFields.date !== null && !userEdited.current.date) {
      parts.push(`fecha: ${parsedFields.date}`)
    }
    if (!isEdit && parsedFields.categoryId) {
      const matchedCat = categories.find(c => c.cat_id === parsedFields.categoryId)
      if (matchedCat) {
        const SUBTYPE_LABELS = {
          fixed_expense: 'gasto fijo', variable_expense: 'gasto variable',
          saving: 'ahorro', investment: 'inversión', income: 'ingreso',
        }
        const subtypeLabel = SUBTYPE_LABELS[matchedCat.cat_type] ?? 'gasto'
        parts.push(`${subtypeLabel}: ${matchedCat.cat_name}`)
      }
    } else if (!isEdit && !userEdited.current.type) {
      parts.push(`tipo: ${parsedFields.txType === 'income' ? 'ingreso' : 'gasto'}`)
    }
    if (parsedFields.accountId && parsedFields.accountId !== accounts[0]?.acc_id) {
      const matchedAcc = accounts.find(a => a.acc_id === parsedFields.accountId)
      if (matchedAcc) parts.push(`cuenta: ${matchedAcc.acc_name}`)
    }
    const feedbackMsg = parts.length > 0
      ? `Rellenado → ${parts.join(' · ')}`
      : `Escuché: "${transcript}" (sin datos reconocidos)`
    setVoiceFeedback(feedbackMsg)
    const timer = setTimeout(() => setVoiceFeedback(null), 5000)
    return () => clearTimeout(timer)
  }, [parsedFields, categories, transcript]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e) {
    e.preventDefault()
    if (!amount) { setError('El importe es obligatorio'); return }
    if (isTransfer && !toAccId) { setError('Selecciona la cuenta destino'); return }
    if (!isTransfer && !catId) { setError('Selecciona una categoría'); return }
    if (!accId) { setError('Selecciona una cuenta'); return }

    setError(null)
    setLoading(true)
    try {
      if (isEdit) {
        await update(editTx.tx_id, {
          tx_type:   type,
          tx_amount: parseFloat(amount),
          tx_date:   date,
          tx_cat_id: catId || null,
          tx_acc_id: accId,
          tx_notes:  notes || null,
        })
      } else if (isTransfer) {
        await addTransfer({
          fromAccId: accId,
          toAccId,
          amount:    parseFloat(amount),
          date,
          notes:     notes || null,
        })
      } else {
        await add({
          tx_type:   type,
          tx_amount: parseFloat(amount),
          tx_date:   date,
          tx_cat_id: catId,
          tx_acc_id: accId,
          tx_notes:  notes || null,
          tx_source: parsedFields ? 'voice' : 'manual',
        })
      }
      onSuccess?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Colors by type
  const typeColor = type === 'income' ? 'var(--income)' : type === 'transfer' ? 'var(--accent)' : 'var(--expense)'

  return (
    <div style={s.page}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <p style={s.headerSub}>{isEdit ? 'Editar' : 'Nuevo'}</p>
        <div style={s.headerRow}>
          <h1 style={s.headerTitle}>{isEdit ? 'Editar movimiento' : 'Añadir movimiento'}</h1>
          {supported && !isEdit && (
            <button
              type="button"
              className={`voice-btn${isListening ? ' listening' : ''}`}
              onClick={isListening ? stopListening : () => {
                // Reset manual-edit flags so the next voice result can fill all fields
                userEdited.current = { amount: false, date: false, catId: false, type: false }
                startListening()
              }}
              aria-label={isListening ? 'Detener reconocimiento de voz' : 'Iniciar reconocimiento de voz'}
              title={isListening ? 'Detener' : 'Rellenar con voz'}
            >
              {isListening ? <IconMicActive /> : <IconMic />}
            </button>
          )}
        </div>
        {isListening && (
          <p style={s.voiceStatus} aria-live="polite">
            <span style={s.voiceDot} />
            Escuchando…
          </p>
        )}
        {voiceFeedback && !isListening && (
          <p style={s.voiceFeedback} aria-live="polite">{voiceFeedback}</p>
        )}
        {voiceError && (
          <p style={s.voiceError} aria-live="assertive">{voiceError}</p>
        )}
      </div>

      {/* ── Type toggle ──────────────────────────────────────────────────── */}
      <div style={s.typeToggle}>
        <TypeButton active={type === 'expense'} onClick={() => { userEdited.current.type = true; setType('expense') }} label="Gasto" />
        <TypeButton active={type === 'income'}  onClick={() => { userEdited.current.type = true; setType('income') }}  label="Ingreso" />
        {!isEdit && (
          <TypeButton active={type === 'transfer'} onClick={() => { userEdited.current.type = true; setType('transfer') }} label="Transferencia" />
        )}
      </div>

      {/* ── Subtype toggle (expense only) ────────────────────────────────── */}
      {type === 'expense' && (
        <div style={s.subtypeToggle}>
          <SubtypeButton active={subtype === 'fixed_expense'}    onClick={() => setSubtype('fixed_expense')}    label="Gasto fijo" />
          <SubtypeButton active={subtype === 'variable_expense'} onClick={() => setSubtype('variable_expense')} label="Gasto variable" />
          <SubtypeButton active={subtype === 'saving'}           onClick={() => setSubtype('saving')}           label="Ahorro" />
          <SubtypeButton active={subtype === 'investment'}       onClick={() => setSubtype('investment')}       label="Inversión" />
        </div>
      )}

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={s.form}>

        {/* Importe */}
        <FormField label="Importe">
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...s.input, caretColor: typeColor, paddingRight: '2rem' }}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => { userEdited.current.amount = true; setAmount(e.target.value) }}
              required
              autoFocus
            />
            <span style={s.amountCurrencySuffix}>€</span>
          </div>
        </FormField>

        {/* Fecha */}
        <FormField label="Fecha">
          <input
            style={s.input}
            type="date"
            value={date}
            onChange={e => { userEdited.current.date = true; setDate(e.target.value) }}
            required
          />
        </FormField>

        {/* Cuenta origen */}
        <FormField label={isTransfer ? 'Cuenta origen' : 'Cuenta'}>
          <select style={s.input} value={accId} onChange={e => setAccId(e.target.value)} required>
            <option value="">— Selecciona —</option>
            {accounts.map(a => <option key={a.acc_id} value={a.acc_id}>{a.acc_name}</option>)}
          </select>
        </FormField>

        {/* Cuenta destino */}
        {isTransfer && (
          <FormField label="Cuenta destino">
            <select style={s.input} value={toAccId} onChange={e => setToAccId(e.target.value)} required>
              <option value="">— Selecciona —</option>
              {accounts.filter(a => a.acc_id !== accId).map(a => (
                <option key={a.acc_id} value={a.acc_id}>{a.acc_name}</option>
              ))}
            </select>
          </FormField>
        )}

        {/* Categoría */}
        {!isTransfer && (
          <FormField label="Categoría">
            <select style={s.input} value={catId} onChange={e => { userEdited.current.catId = true; setCatId(e.target.value) }} required>
              <option value="">— Selecciona —</option>
              {filteredCats.map(c => <option key={c.cat_id} value={c.cat_id}>{c.cat_name}</option>)}
            </select>
          </FormField>
        )}

        {/* Nota */}
        <FormField label="Nota (opcional)">
          <input
            style={s.input}
            type="text"
            placeholder="Descripción del movimiento..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={200}
          />
        </FormField>

        {/* Error */}
        {error && (
          <div style={s.errorBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          style={{ ...s.submitBtn, background: 'var(--accent)', boxShadow: '0 4px 20px var(--accent-glow)' }}
          type="submit"
          disabled={loading}
        >
          {loading
            ? <span style={s.btnSpinner}>Guardando…</span>
            : (isEdit ? 'Guardar cambios' : `Añadir ${labelType(type)}`)
          }
        </button>
      </form>
    </div>
  )
}

// ── Iconos SVG de micrófono ───────────────────────────────────────────────────

function IconMic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8"  y1="23" x2="16" y2="23"/>
    </svg>
  )
}

function IconMicActive() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path fill="none" d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8"  y1="23" x2="16" y2="23"/>
    </svg>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SubtypeButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...s.subtypeBtn,
        ...(active ? {
          background: 'var(--accent)',
          color: '#fff',
          boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
        } : {}),
      }}
    >
      {label}
    </button>
  )
}

function TypeButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...s.typeBtn,
        ...(active ? {
          background: 'var(--accent)',
          color: '#fff',
          boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
        } : {}),
      }}
    >
      {label}
    </button>
  )
}

function FormField({ label, children }) {
  return (
    <label style={s.field}>
      <span style={s.fieldLabel}>{label}</span>
      {children}
    </label>
  )
}

function labelType(type) {
  return type === 'income' ? 'ingreso' : type === 'transfer' ? 'transferencia' : 'gasto'
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { maxWidth: 520, margin: '0 auto', paddingBottom: '2rem' },

  header: { marginBottom: '1.5rem' },
  headerSub: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.25rem',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  headerTitle: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '-0.03em',
  },

  // Voice feedback messages
  voiceStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginTop: '0.4rem',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: 'var(--expense)',
  },
  voiceDot: {
    display: 'inline-block',
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--expense)',
    flexShrink: 0,
    animation: 'voice-pulse 1s ease-in-out infinite',
  },
  voiceFeedback: {
    marginTop: '0.4rem',
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  voiceError: {
    marginTop: '0.4rem',
    fontSize: '0.78rem',
    color: 'var(--expense)',
  },

  // Type toggle — segmented control
  typeToggle: {
    display: 'flex',
    gap: 0,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '3px',
    marginBottom: '1.5rem',
  },
  typeBtn: {
    flex: 1,
    padding: '0.6rem 0.5rem',
    borderRadius: 9,
    border: 'none',
    background: 'none',
    color: 'var(--text-muted)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.85rem',
    transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  },

  // Subtype toggle — smaller segmented control
  subtypeToggle: {
    display: 'flex',
    gap: 0,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '3px',
    marginBottom: '1.5rem',
    marginTop: '-1rem',
  },
  subtypeBtn: {
    flex: 1,
    padding: '0.4rem 0.35rem',
    borderRadius: 7,
    border: 'none',
    background: 'none',
    color: 'var(--text-muted)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.78rem',
    transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  },

  // Amount currency suffix
  amountCurrencySuffix: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-faint)',
    userSelect: 'none',
    pointerEvents: 'none',
  },

  // Regular fields
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  fieldLabel: {
    fontSize: 'var(--text-sm)',
    color: 'var(--text-muted)',
    fontWeight: 500,
    letterSpacing: '0.02em',
  },
  input: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-btn)',
    padding: '10px 14px',
    color: 'var(--text)',
    fontSize: '0.9rem',
    width: '100%',
    appearance: 'none',
    WebkitAppearance: 'none',
  },

  // Error
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'var(--expense-soft)',
    border: '1px solid rgba(248,81,73,0.2)',
    borderRadius: 8,
    padding: '0.6rem 0.9rem',
    color: 'var(--expense)',
    fontSize: '0.85rem',
    fontWeight: 500,
  },

  // Submit
  submitBtn: {
    width: '100%',
    padding: '0.875rem',
    borderRadius: 10,
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '0.5rem',
    color: '#fff',
    transition: 'opacity var(--transition)',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  },
  btnSpinner: { opacity: 0.7 },
}
