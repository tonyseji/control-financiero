import { useState, useEffect } from 'react'
import { signOut, requestPasswordReset } from '../services/auth'
import { supabase } from '../services/supabase'

const CURRENCIES = ['EUR', 'USD', 'GBP']

export default function Settings({ profile, onProfileUpdate, onNavigate }) {
  const [email,          setEmail]          = useState(null)
  const [currency,       setCurrency]       = useState(profile?.prof_currency ?? 'EUR')
  const [pwdStatus,      setPwdStatus]      = useState(null) // null | 'sending' | 'ok' | 'error'
  const [pwdError,       setPwdError]       = useState('')

  // Cargar email desde la sesión de Supabase
  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data?.user?.email) setEmail(data.user.email)
    })
    return () => { cancelled = true }
  }, [])

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

      {/* ── Info (solo admin ve el rol) ────────────────────────────────── */}
      <div style={s.section}>
        <p style={s.fieldLabel}>Nombre</p>
        <p style={s.fieldValue}>{profile?.prof_full_name ?? '—'}</p>
      </div>

      {isAdmin && (
        <div style={s.section}>
          <p style={s.fieldLabel}>Rol</p>
          <p style={s.fieldValue}>
            <span style={s.roleBadge}>Admin</span>
          </p>
        </div>
      )}

      {/* ── Preferencias ──────────────────────────────────────────────── */}
      <p style={s.groupLabel}>Preferencias</p>

      <div style={s.section}>
        <p style={s.fieldLabel}>Moneda</p>
        <div style={s.currencyRow}>
          {CURRENCIES.map(c => (
            <button
              key={c}
              style={{ ...s.currencyBtn, ...(currency === c ? s.currencyBtnActive : {}) }}
              onClick={() => setCurrency(c)}
            >
              {c}
            </button>
          ))}
        </div>
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

      {/* ── Gestión ───────────────────────────────────────────────────── */}
      <p style={s.groupLabel}>Gestión</p>

      <button style={s.navBtn} onClick={() => onNavigate('accounts')}>
        <span>Cuentas bancarias</span>
        <span style={s.chevron}>›</span>
      </button>

      <button style={s.navBtn} onClick={() => onNavigate('categories')}>
        <span>Categorías</span>
        <span style={s.chevron}>›</span>
      </button>

      <button style={s.navBtn} onClick={() => onNavigate('recurring')}>
        <span>Recurrentes</span>
        <span style={s.chevron}>›</span>
      </button>

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
  roleBadge: {
    display: 'inline-block',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 99,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },

  // Moneda
  currencyRow: {
    display: 'flex',
    gap: '0.4rem',
    marginTop: '0.35rem',
  },
  currencyBtn: {
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '0.35rem 0.75rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'background var(--transition), color var(--transition)',
  },
  currencyBtnActive: {
    background: 'var(--accent-soft)',
    border: '1px solid var(--accent)',
    color: 'var(--accent)',
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
