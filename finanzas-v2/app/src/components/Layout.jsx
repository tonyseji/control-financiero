import { useState } from 'react'
import { signOut } from '../services/auth'
import SearchModal from './SearchModal'

const NAV_ITEMS = [
  { key: 'dashboard',    label: 'Inicio',       icon: IconHome },
  { key: 'transactions', label: 'Movimientos',  icon: IconList },
  { key: 'add',          label: 'Añadir',        icon: IconPlus },
  { key: 'budget',       label: 'Presupuesto',  icon: IconChart },
  { key: 'settings',     label: 'Ajustes',      icon: IconGear },
]

export default function Layout({ view, onNavigate, children }) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div style={s.root}>
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      {/* ── Sidebar — solo desktop ──────────────────────────────────────── */}
      <aside style={s.sidebar}>
        {/* Logo */}
        <div style={s.logo}>
          <div style={s.logoMark}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4f91ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={s.logoText}>Finanzas</span>
        </div>

        {/* Navegación */}
        <nav style={s.nav}>
          <p style={s.navLabel}>MENÚ</p>
          {NAV_ITEMS.map(item => {
            const active = view === item.key
            return (
              <button
                key={item.key}
                style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}
                onClick={() => onNavigate(item.key)}
              >
                {active && <span style={s.navActiveBar} />}
                <span style={{ ...s.navIcon, ...(active ? s.navIconActive : {}) }}>
                  <item.icon size={18} />
                </span>
                <span style={{ ...s.navText, ...(active ? s.navTextActive : {}) }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Divider */}
        <div style={s.divider} />

        {/* Buscar */}
        <button style={s.searchBtn} onClick={() => setSearchOpen(true)}>
          <span style={s.navIcon}>
            <IconSearch size={18} />
          </span>
          <span style={s.navText}>Buscar</span>
        </button>

        {/* Cerrar sesión */}
        <button style={s.signOutBtn} onClick={() => signOut()}>
          <IconLogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      {/* ── Contenido principal ─────────────────────────────────────────── */}
      <main data-main style={s.main}>
        {/* Header móvil */}
        <div style={s.mobileHeader}>
          <div style={s.mobileLogo}>
            <div style={s.logoMark}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4f91ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={s.logoText}>Finanzas</span>
          </div>
          <button style={s.searchTopBtn} onClick={() => setSearchOpen(true)} title="Buscar">
            <IconSearch size={18} />
          </button>
        </div>

        {children}
      </main>

      {/* ── Bottom nav — solo móvil ─────────────────────────────────────── */}
      <nav data-bottom-nav style={s.bottomNav}>
        {NAV_ITEMS.map(item => {
          const active = view === item.key
          return (
            <button
              key={item.key}
              style={{ ...s.bottomItem, ...(active ? s.bottomItemActive : {}) }}
              onClick={() => onNavigate(item.key)}
            >
              {item.key === 'add'
                ? <span style={s.addFab}><item.icon size={20} /></span>
                : <item.icon size={20} />
              }
              <span style={s.bottomLabel}>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// ── Iconos ──────────────────────────────────────────────────────────────────────

function IconSearch({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function IconHome({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function IconList({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function IconPlus({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function IconChart({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

function IconGear({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function IconLogOut({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

// ── Estilos ─────────────────────────────────────────────────────────────────────

const s = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--bg)',
    color: 'var(--text)',
  },

  // Sidebar
  sidebar: {
    width: 'var(--sidebar-w)',
    background: 'rgba(22,27,46,0.97)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 0 1rem',
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    zIndex: 50,
  },

  // Logo
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0 1.25rem',
    marginBottom: '1.75rem',
  },
  logoMark: {
    width: 34,
    height: 34,
    background: 'var(--accent-soft)',
    border: '1px solid var(--accent-glow)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },

  // Nav
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '0 0.75rem',
    gap: 2,
  },
  navLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--text-faint)',
    letterSpacing: '0.08em',
    padding: '0 0.75rem',
    marginBottom: '0.5rem',
  },
  navItem: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.6rem 0.875rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    textAlign: 'left',
    width: '100%',
    transition: 'background var(--transition), color var(--transition)',
  },
  navItemActive: {
    background: 'var(--bg-hover)',
    color: 'var(--text)',
  },
  navActiveBar: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    background: 'var(--accent)',
    borderRadius: '0 99px 99px 0',
  },
  navIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    color: 'inherit',
    flexShrink: 0,
  },
  navIconActive: { color: 'var(--accent)' },
  navText: {
    fontSize: '0.875rem',
    color: 'inherit',
  },
  navTextActive: { color: 'var(--text)', fontWeight: 700 },

  // Divider
  divider: {
    height: 1,
    background: 'var(--border)',
    margin: '0.75rem 1.25rem',
  },

  // Search button (same style as nav item)
  searchBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.55rem 0.75rem',
    margin: '0 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    width: 'calc(100% - 1.5rem)',
    textAlign: 'left',
  },

  // Sign out
  signOutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    margin: '0.5rem 1.25rem 0',
    padding: '0.5rem 0.75rem',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-faint)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 500,
    transition: 'border-color var(--transition), color var(--transition)',
  },

  // Main content
  main: {
    flex: 1,
    marginLeft: 'var(--sidebar-w)',
    padding: '1.5rem 2rem',
    maxWidth: '100%',
    overflowX: 'hidden',
    minHeight: '100vh',
  },

  // Mobile header
  mobileHeader: {
    display: 'none',
  },
  mobileLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },

  // Search top button (desktop)
  searchTopBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0.4rem 0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color var(--transition), color var(--transition)',
  },

  // Bottom nav
  bottomNav: {
    display: 'none',
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(22,27,46,0.97)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderTop: '1px solid var(--border)',
    flexDirection: 'row',
    zIndex: 100,
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  bottomItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '0.6rem 0.25rem',
    background: 'none',
    border: 'none',
    color: 'var(--text-faint)',
    cursor: 'pointer',
    fontSize: '0.62rem',
    fontWeight: 500,
    transition: 'color var(--transition)',
  },
  bottomItemActive: {
    color: 'var(--accent)',
  },
  bottomLabel: {
    fontSize: '0.62rem',
    letterSpacing: '0.01em',
  },
  addFab: {
    width: 40,
    height: 40,
    background: 'var(--accent)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    marginBottom: 2,
    boxShadow: '0 2px 12px var(--accent-glow)',
  },
}

// ── Mobile header visibility via CSS ────────────────────────────────────────────
// Inject style once
if (typeof document !== 'undefined') {
  const id = '__layout-mobile-css'
  if (!document.getElementById(id)) {
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      @media (max-width: 768px) {
        [data-main] > div:first-child { display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
      }
      @media (min-width: 769px) {
        [data-main] > div:first-child { display: none !important; }
      }
      .nav-item:hover { background: var(--bg-hover) !important; color: var(--text) !important; }
      .sign-out-btn:hover { border-color: var(--text-faint) !important; color: var(--text-muted) !important; }
    `
    document.head.appendChild(style)
  }
}
