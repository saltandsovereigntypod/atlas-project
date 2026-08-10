import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import { ensureWorkspace } from './lib/data'
import type { Workspace } from './types'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import DatabasePage from './pages/DatabasePage'
import RecordPage from './pages/RecordPage'
import DesignerPage from './pages/DesignerPage'
import AppShell from './components/AppShell'

interface AppContextValue {
  user: User
  workspace: Workspace
  refreshWorkspace: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useAppContext must be used inside AppContext')
  return value
}

function ProtectedLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  const loadWorkspace = async (user: User) => {
    const found = await ensureWorkspace(user.id, user.email)
    setWorkspace(found)
  }

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        try {
          await loadWorkspace(data.session.user)
        } finally {
          if (mounted) setLoading(false)
        }
      } else {
        setLoading(false)
      }
    })
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) await loadWorkspace(nextSession.user)
      else setWorkspace(null)
      setLoading(false)
    })
    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (!configured) return <MissingConfig />
  if (loading) return <div className="center-screen"><div className="spinner" /><p>Opening your workspace…</p></div>
  if (!session?.user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!workspace) return <div className="center-screen"><p>Could not load a workspace. Check the Supabase SQL and browser console.</p></div>

  const value = useMemo<AppContextValue>(() => ({
    user: session.user,
    workspace,
    refreshWorkspace: () => loadWorkspace(session.user),
  }), [session.user, workspace])

  return (
    <AppContext.Provider value={value}>
      <AppShell>
        <Outlet />
      </AppShell>
    </AppContext.Provider>
  )
}

function MissingConfig() {
  return (
    <div className="center-screen setup-card">
      <div className="brand-mark">A</div>
      <h1>Atlas Studio needs Supabase</h1>
      <p>Copy <code>.env.example</code> to <code>.env</code>, add your project URL and anon key, then restart the dev server.</p>
      <p>The included <code>supabase/schema.sql</code> creates the database, security policies, and storage bucket.</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/database/:databaseId" element={<DatabasePage />} />
        <Route path="/database/:databaseId/record/:recordId" element={<RecordPage />} />
        <Route path="/database/:databaseId/design" element={<DesignerPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
