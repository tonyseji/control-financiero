import { useState } from 'react'
import { signOut } from '../../services/auth'
import SearchModal from '../modals/SearchModal'
import ChatPanel from '../ChatPanel'

const THEME_KEY = 'cf_v2_theme'
function getTheme() {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}
function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.classList.add('dark')
  else                  document.documentElement.classList.remove('dark')
  localStorage.setItem(THEME_KEY, theme)
}

const NAV_ITEMS = [
  { key: 'dashboard',    label: 'Inicio',       icon: IconHome },
  { key: 'transactions', label: 'Movimientos',  icon: IconList },
  { key: 'analysis',     label: 'Análisis',     icon: IconLineChart },
  { key: 'add',          label: 'Añadir',        icon: IconPlus },
  { key: 'budget',       label: 'Presupuesto',  icon: IconChart },
  { key: 'goals',        label: 'Objetivos',    icon: IconTarget },
  { key: 'accounts',     label: 'Cuentas',      icon: IconCreditCard },
]

export default function Layout({ view, onNavigate, children, profile }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [theme, setTheme] = useState(getTheme)
  const [chatOpen, setChatOpen] = useState(false)

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  const initials = profile?.prof_full_name
    ? profile.prof_full_name.split(' ').map(n => n[0]).slice(0, 2).join('')
    : '?'

  return (
    <div className="app-root">
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      {/* ── Sidebar — solo desktop ──────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <img src="/logo/bilans-logo-positive.svg" alt="Bilans" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span className="sidebar-logo-text">Bilans</span>
        </div>

        {/* Navegación */}
        <nav className="sidebar-nav">
          <p className="sidebar-nav-label">MENÚ</p>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`sidebar-nav-item${view === item.key ? ' active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="nav-active-bar" />
              <span className="nav-icon"><item.icon size={18} /></span>
              <span className="nav-text">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Divider + buscar + tema */}
        <div className="sidebar-divider" />
        <div className="sidebar-bottom">
          <button className="sidebar-nav-item" onClick={() => setSearchOpen(true)}>
            <span className="nav-icon"><IconSearch size={18} /></span>
            <span className="nav-text">Buscar</span>
          </button>
          <button className="sidebar-nav-item" onClick={toggleTheme} title={theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}>
            <span className="nav-icon">
              {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </span>
            <span className="nav-text">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
          </button>
        </div>

        {/* Usuario + ajustes */}
        {profile && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{profile.prof_full_name ?? profile.prof_email}</p>
              <p className="sidebar-user-role">{profile.prof_role ?? 'Personal'}</p>
            </div>
            <button
              className={`sidebar-settings-btn${view === 'settings' ? ' active' : ''}`}
              onClick={() => onNavigate('settings')}
              title="Ajustes"
            >
              <IconGear size={16} />
            </button>
          </div>
        )}
        <div className="sidebar-bottom">
          <button className="sidebar-sign-out" onClick={() => signOut()}>
            <IconLogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ─────────────────────────────────────────── */}
      <main className="app-main">
        {/* Header móvil */}
        <div className="mobile-header">
          <div className="mobile-logo">
            <div className="sidebar-logo-mark" style={{ width: 32, height: 32 }}>
              <img src="/logo/bilans-logo-positive.svg" alt="Bilans" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span className="sidebar-logo-text">Bilans</span>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button className="search-top-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}>
              {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
            <button className="search-top-btn" onClick={() => setSearchOpen(true)} title="Buscar">
              <IconSearch size={18} />
            </button>
            <button
              className={`search-top-btn${chatOpen ? ' active' : ''}`}
              onClick={() => setChatOpen(o => !o)}
              title="Asesor Financiero IA"
              aria-label={chatOpen ? 'Cerrar asesor' : 'Abrir asesor financiero'}
            >
              <IconChat size={18} />
            </button>
            <button className="search-top-btn" onClick={() => onNavigate('settings')} title="Ajustes">
              <IconGear size={18} />
            </button>
          </div>
        </div>

        {/* Chat overlay — solo móvil */}
        {chatOpen && (
          <div className="mobile-chat-overlay" role="dialog" aria-modal="true" aria-label="Asesor Financiero">
            <ChatPanel onClose={() => setChatOpen(false)} />
          </div>
        )}

        {children}
      </main>

      {/* ── Bottom nav — solo móvil ─────────────────────────────────────── */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={`bottom-nav-item${view === item.key ? ' active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.key === 'add'
              ? <span className="bottom-nav-add-fab"><item.icon size={20} /></span>
              : <item.icon size={20} />
            }
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        ))}
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

function IconCreditCard({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )
}

function IconTarget({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  )
}

function IconLineChart({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

function IconSun({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function IconMoon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function IconChat({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
