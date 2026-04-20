import { useState, useEffect } from 'react'
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])


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
      {/* Ambient background blobs */}
      <div style={s.blob1} />
      <div style={s.blob2} />

      <div style={{ ...s.layout, flexDirection: isMobile ? 'column' : 'row' }}>

        {/* ── LEFT HERO ───────────────────────────────────────────────── */}
        {!isMobile && (
          <div style={s.hero}>
            {/* Subtle grid overlay */}
            <div style={s.heroGrid} />

            {/* Logo */}
            <div style={s.heroLogo}>
              <div style={s.heroLogoMark}>
                <LogoIcon />
              </div>
              <span style={s.heroLogoText}>Finanzas V2</span>
            </div>

            {/* Headline */}
            <div style={s.heroHeadline}>
              <h1 style={s.heroH1}>Tu control<br />financiero,<br />sin fricción.</h1>
              <p style={s.heroSub}>
                Gestiona transacciones, presupuestos y metas con inteligencia artificial integrada.
              </p>
            </div>

            {/* Features */}
            <div style={s.features}>
              {FEATURES.map(f => (
                <div key={f.label} style={s.featureRow}>
                  <div style={{ ...s.featureIcon, background: f.bg }}>
                    {f.icon}
                  </div>
                  <div>
                    <div style={s.featureLabel}>{f.label}</div>
                    <div style={s.featureDesc}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dashboard mockup */}
            <DashboardMockup />

            {/* Bottom badge */}
            <div style={s.heroBadge}>
              <div style={s.heroBadgeDot} />
              Staging — acceso solo para administradores
            </div>
          </div>
        )}

        {/* ── RIGHT FORM ──────────────────────────────────────────────── */}
        <div className="auth-form-panel" style={{ ...s.formPanel, padding: isMobile ? '1.5rem 1.25rem' : '3rem 2.5rem' }}>
          <div className="auth-form-inner" style={s.formInner}>
          {/* Mobile logo */}
          {isMobile && (
            <div style={{ ...s.heroLogo, justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={s.heroLogoMark}><LogoIcon /></div>
              <span style={s.heroLogoText}>Finanzas V2</span>
            </div>
          )}
            {/* Mode heading */}
            <div style={s.formHeader}>
              <h2 className="auth-form-title" style={s.formTitle}>
                {mode === 'login'    && 'Bienvenido'}
                {mode === 'register' && 'Crear cuenta'}
                {mode === 'reset'    && 'Recuperar acceso'}
              </h2>
              <p style={s.formSubtitle}>
                {mode === 'login'    && 'Accede a tu gestor financiero personal'}
                {mode === 'register' && 'Empieza a controlar tus finanzas hoy'}
                {mode === 'reset'    && 'Te enviaremos un enlace de recuperación'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Correo electrónico</label>
                <div style={s.inputWrap}>
                  <span style={s.inputIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input
                    className="auth-input"
                    style={s.input}
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div style={s.fieldGroup}>
                  <label style={s.fieldLabel}>Contraseña</label>
                  <div style={s.inputWrap}>
                    <span style={s.inputIcon}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>
                    <input
                      className="auth-input"
                      style={s.input}
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                  </div>
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

              <button className="auth-btn-primary" style={s.btnPrimary} type="submit" disabled={loading}>
                {loading
                  ? <LoadingDots />
                  : mode === 'login'    ? 'Entrar'
                  : mode === 'register' ? 'Crear cuenta'
                  : 'Enviar enlace'}
              </button>
            </form>

            {/* Google */}
            {mode !== 'reset' && (
              <>
                <div style={s.divider}>
                  <span style={s.dividerLine} />
                  <span style={s.dividerText}>o continúa con Google</span>
                  <span style={s.dividerLine} />
                </div>
                <button className="auth-btn-google" style={s.btnGoogle} onClick={handleGoogle} disabled={loading}>
                  <GoogleIcon />
                  Continuar con Google
                </button>
              </>
            )}

            {/* Nav links */}
            <div style={s.links}>
              {mode === 'login' && (
                <>
                  <button style={s.link} onClick={() => switchMode('register')}>¿Sin cuenta? Regístrate</button>
                  <button style={{ ...s.link, color: 'var(--text-faint)', fontSize: '0.78rem' }} onClick={() => switchMode('reset')}>¿Olvidaste tu contraseña?</button>
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

      </div>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 17l10 5 10-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12l10 5 10-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
    </svg>
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

function LoadingDots() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 5, height: 5,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.8)',
            animation: `authDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes authDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </span>
  )
}

function DashboardMockup() {
  const bars = [65, 45, 80, 55, 70, 40, 90, 60, 75, 50, 85, 68]
  const expBars = [30, 25, 35, 28, 40, 20, 45, 32, 38, 22, 42, 35]

  return (
    <div style={s.mockup}>
      {/* Top stat cards */}
      <div style={s.mockupStats}>
        <div style={s.mockupStatCard}>
          <div style={s.mockupStatLabel}>Saldo total</div>
          <div style={{ ...s.mockupStatValue, color: 'var(--income)' }}>€4.280</div>
        </div>
        <div style={s.mockupStatCard}>
          <div style={s.mockupStatLabel}>Gastos mes</div>
          <div style={{ ...s.mockupStatValue, color: 'var(--expense)' }}>€1.340</div>
        </div>
        <div style={s.mockupStatCard}>
          <div style={s.mockupStatLabel}>Ahorro</div>
          <div style={{ ...s.mockupStatValue, color: 'var(--accent)' }}>€640</div>
        </div>
      </div>

      {/* Mini bar chart */}
      <div style={s.mockupChart}>
        <div style={s.mockupChartLabel}>Ingresos vs Gastos — últimos 12 meses</div>
        <div style={s.mockupBars}>
          {bars.map((h, i) => (
            <div key={i} style={s.mockupBarGroup}>
              <div style={{ ...s.mockupBarIncome, height: `${h * 0.6}px` }} />
              <div style={{ ...s.mockupBarExpense, height: `${expBars[i] * 0.6}px` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent tx rows */}
      <div style={s.mockupTxList}>
        {MOCK_TXS.map((tx, i) => (
          <div key={i} style={s.mockupTxRow}>
            <div style={{ ...s.mockupTxDot, background: tx.color }} />
            <div style={s.mockupTxName}>{tx.name}</div>
            <div style={{ ...s.mockupTxAmt, color: tx.color }}>{tx.amt}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Data ────────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    label: 'Control total',
    desc:  'Transacciones, presupuestos y cuentas en un lugar',
    bg:    'var(--accent-soft)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    label: 'IA integrada',
    desc:  'Asesor financiero personal con inteligencia artificial',
    bg:    'var(--purple-soft)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a8 8 0 0 1 8 8c0 3-1.5 5.5-4 7l-1 3H9l-1-3C5.5 15.5 4 13 4 10a8 8 0 0 1 8-8z"/>
        <line x1="9" y1="21" x2="15" y2="21"/>
      </svg>
    ),
  },
  {
    label: 'Seguro y privado',
    desc:  'Tus datos protegidos con autenticación y cifrado real',
    bg:    'var(--income-soft)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--income)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
]

const MOCK_TXS = [
  { name: 'Nómina enero',   amt: '+€2.100', color: 'var(--income)'  },
  { name: 'Alquiler',       amt: '-€750',   color: 'var(--expense)' },
  { name: 'Fondo de ahorro',amt: '-€315',   color: 'var(--accent)'  },
  { name: 'Supermercado',   amt: '-€89',    color: 'var(--expense)' },
]

/* ── Styles ──────────────────────────────────────────────────────────────────── */

const s = {
  /* Page shell */
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'stretch',
    background: 'var(--bg)',
    position: 'relative',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  blob1: {
    position: 'fixed',
    top: '-20%',
    left: '-10%',
    width: 700,
    height: 700,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79,145,255,0.07) 0%, transparent 65%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  blob2: {
    position: 'fixed',
    bottom: '-25%',
    right: '-10%',
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(147,51,234,0.06) 0%, transparent 65%)',
    pointerEvents: 'none',
    zIndex: 0,
  },

  layout: {
    display: 'flex',
    flex: 1,
    minHeight: '100vh',
    position: 'relative',
    zIndex: 1,
  },

  /* ── Hero ── */
  hero: {
    flex: '0 0 52%',
    background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg) 100%)',
    borderRight: '1px solid var(--border)',
    padding: '3rem 3rem 2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    position: 'relative',
    overflow: 'hidden',
  },
  heroGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(var(--border-soft) 1px, transparent 1px),
      linear-gradient(90deg, var(--border-soft) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    opacity: 0.5,
    pointerEvents: 'none',
  },

  heroLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    position: 'relative',
  },
  heroLogoMark: {
    width: 38,
    height: 38,
    background: 'var(--accent-soft)',
    border: '1px solid rgba(79,145,255,0.25)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoText: {
    fontSize: '1.05rem',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
  },

  heroHeadline: {
    position: 'relative',
  },
  heroH1: {
    fontSize: '2.6rem',
    fontWeight: 800,
    color: 'var(--text)',
    lineHeight: 1.1,
    letterSpacing: '-0.04em',
    marginBottom: '0.85rem',
    margin: 0,
  },
  heroSub: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    lineHeight: 1.6,
    maxWidth: 340,
    marginTop: '0.85rem',
  },

  /* Features */
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
    position: 'relative',
  },
  featureRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.9rem',
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid var(--border)',
  },
  featureLabel: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  featureDesc: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginTop: '0.15rem',
    lineHeight: 1.4,
  },

  /* Mockup */
  mockup: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem 1.1rem',
    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
    position: 'relative',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  mockupStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    marginBottom: '0.9rem',
  },
  mockupStatCard: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '0.5rem 0.6rem',
  },
  mockupStatLabel: {
    fontSize: '0.65rem',
    color: 'var(--text-faint)',
    fontWeight: 500,
    marginBottom: '0.2rem',
  },
  mockupStatValue: {
    fontSize: '0.88rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  mockupChart: {
    marginBottom: '0.8rem',
  },
  mockupChartLabel: {
    fontSize: '0.63rem',
    color: 'var(--text-faint)',
    marginBottom: '0.5rem',
    fontWeight: 500,
  },
  mockupBars: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 3,
    height: 54,
  },
  mockupBarGroup: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-end',
    gap: 1,
  },
  mockupBarIncome: {
    flex: 1,
    background: 'var(--income)',
    borderRadius: '2px 2px 0 0',
    opacity: 0.75,
    minHeight: 3,
  },
  mockupBarExpense: {
    flex: 1,
    background: 'var(--expense)',
    borderRadius: '2px 2px 0 0',
    opacity: 0.6,
    minHeight: 3,
  },
  mockupTxList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  mockupTxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.3rem 0',
    borderBottom: '1px solid var(--border-soft)',
  },
  mockupTxDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
    opacity: 0.85,
  },
  mockupTxName: {
    flex: 1,
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  mockupTxAmt: {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },

  heroBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    fontSize: '0.7rem',
    color: 'var(--text-faint)',
    fontWeight: 500,
    position: 'relative',
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--income)',
    boxShadow: '0 0 6px var(--income)',
  },

  /* ── Form panel ── */
  formPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '100vh',
  },
  formInner: {
    width: '100%',
    maxWidth: 400,
  },

  formHeader: {
    marginBottom: '1.75rem',
  },
  formTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '-0.04em',
    marginBottom: '0.35rem',
  },
  formSubtitle: {
    fontSize: '0.83rem',
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },

  /* Google btn */
  btnGoogle: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.72rem 1rem',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text)',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.6rem',
    fontFamily: 'inherit',
    transition: 'border-color var(--transition), box-shadow var(--transition)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },

  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '1.25rem 0',
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

  /* Email form */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  fieldLabel: {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.01em',
  },
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
    borderRadius: 10,
    padding: '0.78rem 1rem 0.78rem 2.5rem',
    color: 'var(--text)',
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color var(--transition)',
  },

  /* Feedback */
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'var(--expense-soft)',
    border: '1px solid rgba(220,38,38,0.2)',
    borderRadius: 8,
    padding: '0.6rem 0.9rem',
    color: 'var(--expense)',
    fontSize: '0.82rem',
    fontWeight: 500,
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'var(--income-soft)',
    border: '1px solid rgba(22,163,74,0.2)',
    borderRadius: 8,
    padding: '0.6rem 0.9rem',
    color: 'var(--income)',
    fontSize: '0.82rem',
    fontWeight: 500,
  },

  /* Primary btn */
  btnPrimary: {
    width: '100%',
    padding: '0.85rem',
    borderRadius: 10,
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '0.92rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '0.15rem',
    fontFamily: 'inherit',
    boxShadow: '0 4px 20px var(--accent-glow)',
    letterSpacing: '-0.01em',
    transition: 'opacity var(--transition), box-shadow var(--transition)',
    minHeight: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Nav links */
  links: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1.4rem',
  },
  link: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    fontSize: '0.83rem',
    cursor: 'pointer',
    padding: '0.25rem 0',
    fontFamily: 'inherit',
    fontWeight: 500,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
  },
}
