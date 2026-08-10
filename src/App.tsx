import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { createContext, useContext, useEffect, useState } from 'react'
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
  const [authReady, setAuthReady] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const location = useLocation()

  const loadWorkspace = async (user: User) => {
    const found = await ensureWorkspace(user.id, user.email)
    setWorkspace(found)
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setWorkspaceError(error.message)
      setSession(data.session)
      setAuthReady(true)
    })

    // Keep this callback synchronous. Awaiting Supabase requests inside
    // onAuthStateChange can block on the auth client's internal lock.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setAuthReady(true)
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!authReady) return
    if (!session?.user) {
      setWorkspace(null)
      setWorkspaceLoading(false)
      setWorkspaceError(null)
      return
    }

    setWorkspaceLoading(true)
    setWorkspaceError(null)

    ensureWorkspace(session.user.id, session.user.email)
      .then((found) => {
        if (!cancelled) setWorkspace(found)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        console.error('Failed to load workspace:', error)
        setWorkspace(null)
        setWorkspaceError(message)
      })
      .finally(() => {
        if (!cancelled) setWorkspaceLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authReady, session?.user?.id])

  if (!configured) return <MissingConfig />
  if (!authReady || workspaceLoading) return <div className="center-screen"><div className="spinner" /><p>Opening your workspace…</p></div>
  if (!session?.user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (workspaceError) {
    return (
      <div className="center-screen setup-card">
        <div className="brand-mark">!</div>
        <h1>Atlas could not open your workspace</h1>
        <p>{workspaceError}</p>
        <p>Check that <code>supabase/schema.sql</code> has been run in your Supabase SQL Editor, then refresh this page.</p>
      </div>
    )
  }
  if (!workspace) return <div className="center-screen"><p>Could not load a workspace. Check the Supabase SQL and browser console.</p></div>

  const value: AppContextValue = {
    user: session.user,
    workspace,
    refreshWorkspace: () => loadWorkspace(session.user),
  }

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
