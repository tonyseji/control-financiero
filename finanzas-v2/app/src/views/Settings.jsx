import { useState, useEffect } from 'react'
import { signOut, requestPasswordReset } from '../services/auth'
import { supabase } from '../services/supabase'
import { useDemoData } from '../hooks/useDemoData'
import { usePushNotifications } from '../hooks/usePushNotifications'

const THEME_KEY = 'cf_v2_theme'

function getTheme() {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}
function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.classList.add('dark')
  else                  document.documentElement.classList.remove('dark')
  localStorage.setItem(THEME_KEY, theme)
}

export default function Settings({ profile, onProfileUpdate, onNavigate }) {
  const [email,       setEmail]       = useState(null)
  const [pwdStatus,   setPwdStatus]   = useState(null)
  const [pwdError,    setPwdError]    = useState('')
  const [editName,    setEditName]    = useState(false)
  const [nameVal,     setNameVal]     = useState(profile?.prof_full_name ?? '')
  const [nameSaving,  setNameSaving]  = useState(false)
  const [nameError,   setNameError]   = useState('')
  const [demoClearing, setDemoClearing] = useState(false)

  const { demoActive, demoTxs, clear: clearDemo } = useDemoData()
  const {
    isSubscribed,
    isLoading:        pushLoading,
    error:            pushError,
    isSupported:      pushSupported,
    permissionDenied: pushDenied,
    enable:           enablePush,
    disable:          disablePush,
  } = usePushNotifications()

  // Cargar email desde la sesión de Supabase
  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data?.user?.email) setEmail(data.user.email)
    })
    return () => { cancelled = true }
  }, [])

  async function handleSaveName(e) {
    e.preventDefault()
    if (!nameVal.trim()) return
    setNameSaving(true); setNameError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ prof_full_name: nameVal.trim() })
        .eq('prof_id', profile.prof_id)
      if (error) throw error
      await onProfileUpdate()
      setEditName(false)
    } catch (err) {
      setNameError(err?.message ?? 'Error al guardar')
    } finally {
      setNameSaving(false)
    }
  }

  async function handlePasswordReset() {
    const addr = email || profile?.prof_email
    if (!addr) {
      setPwdError('No hay email asociado a la cuenta')
      setPwdStatus('error')
      return
    }
    setPwdStatus('sending')
    setPwdError('')
    try {
      await requestPasswordReset(addr)
      setPwdStatus('ok')
    } catch (err) {
      setPwdError(err?.message ?? 'Error al enviar el email')
      setPwdStatus('error')
    }
  }

  async function handleClearDemo() {
    setDemoClearing(true)
    try {
      await clearDemo()
    } finally {
      setDemoClearing(false)
    }
  }

  const initials = (profile?.prof_full_name ?? '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const isAdmin = profile?.prof_role === 'admin'

  return (
    <div style={s.page}>
      <h1 style={s.title}>Ajustes</h1>

      {/* ── Perfil ─────────────────────────────────────────────────────── */}
      <div style={s.profileCard}>
        <div style={s.avatar}>{initials}</div>
        <div style={s.profileInfo}>
          <p style={s.profileName}>{profile?.prof_full_name ?? '—'}</p>
          {email && <p style={s.profileEmail}>{email}</p>}
        </div>
      </div>

      {/* ── Nombre editable ───────────────────────────────────────────── */}
      <div style={s.section}>
        <p style={s.fieldLabel}>Nombre</p>
        {editName ? (
          <form onSubmit={handleSaveName} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
            <input
              style={{ ...s.fieldInput, flex: 1 }}
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              autoFocus
              required
            />
            <button style={s.smallBtn} type="submit" disabled={nameSaving}>{nameSaving ? '…' : 'Guardar'}</button>
            <button style={s.smallBtnGhost} type="button" onClick={() => { setEditName(false); setNameVal(profile?.prof_full_name ?? '') }}>Cancelar</button>
            {nameError && <p style={s.feedbackErr}>{nameError}</p>}
          </form>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
            <p style={s.fieldValue}>{profile?.prof_full_name ?? '—'}</p>
            <button style={s.editNameBtn} onClick={() => { setEditName(true); setNameVal(profile?.prof_full_name ?? '') }}>Editar</button>
          </div>
        )}
      </div>

      {/* ── Gestión ───────────────────────────────────────────────────── */}
      <p style={s.groupLabel}>Gestión</p>

      <button style={s.navBtn} onClick={() => onNavigate('categories')}>
        <span>Categorías</span>
        <span style={s.chevron}>›</span>
      </button>

      <button style={s.navBtn} onClick={() => onNavigate('recurring')}>
        <span>Recurrentes</span>
        <span style={s.chevron}>›</span>
      </button>

      {demoActive && (
        <div style={s.demoSection}>
          <div>
            <p style={s.demoLabel}>Datos de ejemplo</p>
            <p style={s.demoHint}>{demoTxs.length} transacciones de ejemplo activas</p>
          </div>
          <button
            style={{ ...s.demoClearBtn, ...(demoClearing ? s.demoClearBtnDisabled : {}) }}
            onClick={handleClearDemo}
            disabled={demoClearing}
          >
            {demoClearing ? 'Limpiando…' : 'Limpiar →'}
          </button>
        </div>
      )}

      {/* ── Notificaciones ────────────────────────────────────────────── */}
      <p style={s.groupLabel}>Notificaciones</p>
      <div style={s.section}>
        <div style={s.notifRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.fieldLabel}>Recordatorio diario</p>
            <p style={s.fieldHint}>
              {!pushSupported
                ? 'Tu navegador no soporta notificaciones push'
                : pushDenied
                ? 'Permiso bloqueado — actívalo en la configuración del navegador'
                : isSubscribed
                ? 'Recibirás un recordatorio a las 22:30'
                : 'Activa para recibir un recordatorio de anotar gastos'}
            </p>
          </div>
          {pushSupported && !pushDenied && (
            <button
              style={{
                ...s.toggleBtn,
                ...(isSubscribed ? s.toggleBtnOn : s.toggleBtnOff),
                ...(pushLoading ? s.toggleBtnDisabled : {}),
              }}
              onClick={isSubscribed ? disablePush : enablePush}
              disabled={pushLoading}
              aria-pressed={isSubscribed}
            >
              {pushLoading ? '…' : isSubscribed ? 'Activado' : 'Activar'}
            </button>
          )}
        </div>
        {pushError && <p style={s.feedbackErr}>{pushError}</p>}
      </div>

      {/* ── Seguridad ─────────────────────────────────────────────────── */}
      <p style={s.groupLabel}>Seguridad</p>

      <div style={s.section}>
        <div style={s.securityRow}>
          <div>
            <p style={s.fieldLabel}>Contraseña</p>
            <p style={s.fieldHint}>
              {email
                ? `Se enviará un enlace a ${email}`
                : 'Conectado con Google OAuth'}
            </p>
          </div>
          <button
            style={{ ...s.pwdBtn, ...(pwdStatus === 'sending' ? s.pwdBtnDisabled : {}) }}
            onClick={handlePasswordReset}
            disabled={pwdStatus === 'sending'}
          >
            {pwdStatus === 'sending' ? 'Enviando…' : 'Cambiar contraseña'}
          </button>
        </div>

        {pwdStatus === 'ok' && (
          <p style={s.feedbackOk}>
            Email enviado. Revisa tu bandeja de entrada.
          </p>
        )}
        {pwdStatus === 'error' && (
          <p style={s.feedbackErr}>{pwdError || 'Error desconocido'}</p>
        )}
      </div>

      {/* ── Cerrar sesión ─────────────────────────────────────────────── */}
      <button style={s.signOutBtn} onClick={() => signOut()}>
        Cerrar sesión
      </button>
    </div>
  )
}

const s = {
  page: {
    maxWidth: 480,
    margin: '0 auto',
    paddingBottom: '2rem',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '1.5rem',
  },

  // Perfil
  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1rem 1.25rem',
    marginBottom: '1rem',
    boxShadow: 'var(--shadow)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    fontWeight: 800,
    flexShrink: 0,
    border: '2px solid var(--accent)',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '0.1rem',
  },
  profileEmail: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },

  // Secciones
  section: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '0.875rem 1.25rem',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-faint)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.3rem',
  },
  fieldValue: {
    fontSize: '0.95rem',
    color: 'var(--text)',
  },
  fieldHint: {
    fontSize: '0.78rem',
    color: 'var(--text-faint)',
    marginTop: '0.15rem',
  },
  // Seguridad
  securityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  pwdBtn: {
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '0.45rem 0.875rem',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'opacity var(--transition)',
  },
  pwdBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  feedbackOk: {
    marginTop: '0.6rem',
    fontSize: '0.8rem',
    color: 'var(--income)',
    fontWeight: 500,
  },
  feedbackErr: {
    marginTop: '0.6rem',
    fontSize: '0.8rem',
    color: 'var(--expense)',
    fontWeight: 500,
  },

  // Grupo label
  groupLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-faint)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '1.25rem 0 0.5rem',
  },

  // Nav buttons
  navBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1rem 1.25rem',
    marginBottom: 8,
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'background var(--transition)',
  },
  chevron: {
    color: 'var(--text-faint)',
    fontSize: '1.1rem',
  },

  // Nombre editable
  fieldInput: {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '0.45rem 0.75rem', color: 'var(--text)', fontSize: '0.9rem',
    outline: 'none', fontFamily: 'inherit',
  },
  smallBtn: {
    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7,
    padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },
  smallBtnGhost: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)',
    borderRadius: 7, padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  editNameBtn: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)',
    borderRadius: 6, padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },

  // Demo data
  demoSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius)',
    padding: '0.875rem 1.25rem',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  demoLabel: {
    fontSize: '0.95rem',
    color: 'var(--text)',
    fontWeight: 500,
    marginBottom: '0.15rem',
  },
  demoHint: {
    fontSize: '0.78rem',
    color: 'var(--text-faint)',
  },
  demoClearBtn: {
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '0.45rem 0.875rem',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
    transition: 'opacity var(--transition)',
    flexShrink: 0,
  },
  demoClearBtnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },

  // Notificaciones
  notifRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  toggleBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '0.45rem 0.875rem',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'opacity var(--transition)',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  toggleBtnOn: {
    background: 'var(--income)',
    color: '#fff',
  },
  toggleBtnOff: {
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  },
  toggleBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  // Sign out
  signOutBtn: {
    marginTop: '1.5rem',
    width: '100%',
    padding: '0.75rem',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-faint)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    transition: 'color var(--transition), border-color var(--transition)',
  },
}
