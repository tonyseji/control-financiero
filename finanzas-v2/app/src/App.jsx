import { useEffect, useState } from 'react'
import { supabase } from './services/supabase'
import { getProfile, signOut } from './services/auth'
import { generateDueRecurring } from './services/recurring'
import Auth from './views/Auth'
import Layout from './components/layout/Layout'
import Dashboard from './views/Dashboard'
import Transactions from './views/Transactions'
import AddTransaction from './views/AddTransaction'
import Accounts from './views/Accounts'
import Categories from './views/Categories'
import Budget from './views/Budget'
import Settings from './views/Settings'
import Recurring from './views/Recurring'
import Goals from './views/Goals'
import Analysis from './views/Analysis'
import FloatingChat from './components/FloatingChat'

const IS_STAGING = import.meta.env.VITE_APP_ENV === 'staging'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('dashboard')
  const [editTx, setEditTx] = useState(null)

  function navigate(v, tx = null) {
    setEditTx(tx)
    setView(v)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile()
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadProfile()
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile() {
    try {
      setProfile(await getProfile())
    } catch {
      setProfile(null)
    }
  }

  // Auto-generar recurrentes al arrancar (una vez por sesión, idempotente)
  useEffect(() => {
    if (profile) generateDueRecurring().catch(console.error)
  }, [profile?.prof_id])

  if (session === undefined || (session && !profile)) return null
  if (!session) return <Auth />

  if (IS_STAGING && profile?.prof_role !== 'admin') {
    signOut()
    return <StagingBlocked />
  }

  if (profile?.prof_is_active === false) {
    signOut()
    return <AccountDisabled />
  }

  function renderView() {
    switch (view) {
      case 'dashboard':    return <Dashboard onNavigate={navigate} />
      case 'transactions': return <Transactions onEdit={tx => navigate('add', tx)} />
      case 'add':          return <AddTransaction editTx={editTx} onSuccess={() => navigate('transactions')} />
      case 'accounts':     return <Accounts />
      case 'categories':   return <Categories />
      case 'budget':       return <Budget />
      case 'recurring':    return <Recurring />
      case 'goals':        return <Goals />
      case 'analysis':     return <Analysis />
      case 'settings':     return <Settings profile={profile} onProfileUpdate={loadProfile} onNavigate={navigate} />
      default:             return <Dashboard onNavigate={navigate} />
    }
  }

  return (
    <>
      <Layout view={view} onNavigate={navigate} profile={profile}>
        {renderView()}
      </Layout>
      <FloatingChat />
    </>
  )
}

function StagingBlocked() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Acceso restringido</h1>
        <p style={styles.text}>
          Este entorno es de pre-producción y solo está disponible para administradores.
        </p>
        <p style={styles.env}>STAGING</p>
      </div>
    </div>
  )
}

function AccountDisabled() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Cuenta desactivada</h1>
        <p style={styles.text}>
          Tu cuenta ha sido desactivada. Contacta con el administrador.
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f0f0f',
  },
  card: {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: 12,
    padding: '2rem 3rem',
    textAlign: 'center',
    maxWidth: 400,
  },
  title: { color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem' },
  text:  { color: '#aaa', lineHeight: 1.6 },
  env:   { marginTop: '1.5rem', fontSize: '0.75rem', color: '#f59e0b', letterSpacing: '0.1em', fontWeight: 600 },
}
