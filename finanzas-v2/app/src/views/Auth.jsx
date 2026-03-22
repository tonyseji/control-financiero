import { useState } from 'react'
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
} from '../services/auth'

export default function Auth() {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  async function handleGoogle() {
    setError(null)
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
      } else if (mode === 'register') {
        await signUpWithEmail(email, password)
        setSuccessMsg('Revisa tu email para confirmar el registro.')
      } else if (mode === 'reset') {
        await requestPasswordReset(email)
        setSuccessMsg('Si el email existe, recibirás un enlace de recuperación.')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) { setMode(m); setError(null); setSuccessMsg(null) }

  return (
    <div style={s.page}>
      {/* Background glow */}
      <div style={s.bgGlow} />

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoMark}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4f91ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={s.logoText}>Finanzas</span>
        </div>

        <h1 style={s.title}>
          {mode === 'login' && 'Bienvenido'}
          {mode === 'register' && 'Crear cuenta'}
          {mode === 'reset' && 'Recuperar acceso'}
        </h1>
        <p style={s.subtitle}>
          {mode === 'login' && 'Accede a tu gestor financiero personal'}
          {mode === 'register' && 'Empieza a controlar tus finanzas'}
          {mode === 'reset' && 'Te enviaremos un enlace de recuperación'}
        </p>

        {/* Google */}
        {mode !== 'reset' && (
          <>
            <button style={s.btnGoogle} onClick={handleGoogle} disabled={loading}>
              <GoogleIcon />
              Continuar con Google
            </button>
            <div style={s.divider}>
              <span style={s.dividerLine} />
              <span style={s.dividerText}>o continúa con email</span>
              <span style={s.dividerLine} />
            </div>
          </>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.inputWrap}>
            <span style={s.inputIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </span>
            <input
              style={s.input}
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {mode !== 'reset' && (
            <div style={s.inputWrap}>
              <span style={s.inputIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                style={s.input}
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          {error && (
            <div style={s.errorBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {successMsg && (
            <div style={s.successBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {successMsg}
            </div>
          )}

          <button style={s.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'Cargando…' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}
          </button>
        </form>

        {/* Nav links */}
        <div style={s.links}>
          {mode === 'login' && (
            <>
              <button style={s.link} onClick={() => switchMode('register')}>¿Sin cuenta? Regístrate</button>
              <button style={{ ...s.link, color: 'var(--text-faint)' }} onClick={() => switchMode('reset')}>¿Olvidaste tu contraseña?</button>
            </>
          )}
          {mode === 'register' && (
            <button style={s.link} onClick={() => switchMode('login')}>¿Ya tienes cuenta? Inicia sesión</button>
          )}
          {mode === 'reset' && (
            <button style={s.link} onClick={() => switchMode('login')}>Volver al inicio de sesión</button>
          )}
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: '1rem',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    top: '-30%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 600,
    height: 600,
    background: 'radial-gradient(circle, rgba(79,145,255,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px',
    width: '100%',
    maxWidth: 420,
    position: 'relative',
    boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
  },

  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginBottom: '1.5rem',
    justifyContent: 'center',
  },
  logoMark: {
    width: 36,
    height: 36,
    background: 'var(--accent-soft)',
    border: '1px solid rgba(79,145,255,0.25)',
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },

  title: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: 'var(--text)',
    textAlign: 'center',
    letterSpacing: '-0.03em',
    marginBottom: '0.3rem',
  },
  subtitle: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginBottom: '1.5rem',
  },

  btnGoogle: {
    width: '100%',
    padding: '0.7rem 1rem',
    borderRadius: 9,
    border: '1px solid var(--border)',
    background: 'var(--bg-hover)',
    color: 'var(--text)',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.6rem',
    fontFamily: 'inherit',
    transition: 'border-color var(--transition)',
    marginBottom: '1.25rem',
  },

  divider: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1.25rem',
    gap: '0.75rem',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--border)',
    display: 'block',
  },
  dividerText: {
    color: 'var(--text-faint)',
    fontSize: '0.72rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },

  form: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },

  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '0.9rem',
    color: 'var(--text-faint)',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  input: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 9,
    padding: '0.75rem 1rem 0.75rem 2.5rem',
    color: 'var(--text)',
    fontSize: '0.9rem',
    width: '100%',
  },

  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'var(--expense-soft)',
    border: '1px solid rgba(248,81,73,0.2)',
    borderRadius: 8,
    padding: '0.55rem 0.9rem',
    color: 'var(--expense)',
    fontSize: '0.82rem',
    fontWeight: 500,
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'var(--income-soft)',
    border: '1px solid rgba(63,185,80,0.2)',
    borderRadius: 8,
    padding: '0.55rem 0.9rem',
    color: 'var(--income)',
    fontSize: '0.82rem',
    fontWeight: 500,
  },

  btnPrimary: {
    width: '100%',
    padding: '0.8rem',
    borderRadius: 9,
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '0.25rem',
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px var(--accent-glow)',
    letterSpacing: '-0.01em',
  },

  links: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1.25rem',
  },
  link: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    fontSize: '0.82rem',
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit',
    fontWeight: 500,
  },
}
