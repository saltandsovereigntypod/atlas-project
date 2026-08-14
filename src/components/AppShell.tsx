import { PropsWithChildren, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Database, Home, LogOut, Plus, Sparkles } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { createDatabase, getDatabases } from '../lib/data'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../App'
import type { Database as DatabaseType } from '../types'

export default function AppShell({ children }: PropsWithChildren) {
  const { workspace } = useAppContext()
  const [databases, setDatabases] = useState<DatabaseType[]>([])
  const [creating, setCreating] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('atlas:sidebar-collapsed') === 'true')
  const navigate = useNavigate()
  const location = useLocation()

  const refresh = async () => setDatabases(await getDatabases(workspace.id))
  useEffect(() => { refresh().catch(console.error) }, [workspace.id, location.pathname])
  useEffect(() => { localStorage.setItem('atlas:sidebar-collapsed', String(collapsed)) }, [collapsed])

  const addDatabase = async () => {
    const name = window.prompt('What should this database be called?', 'Untitled database')?.trim()
    if (!name) return
    setCreating(true)
    try {
      const db = await createDatabase(workspace.id, name)
      await refresh()
      navigate(`/database/${db.id}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not create database')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-is-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-collapse-row">
          <button className="sidebar-collapse-button" onClick={() => setCollapsed((value) => !value)} title={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>
        <div className="brand-row"><div className="brand-mark small">A</div><div className="sidebar-copy"><strong>Atlas Studio</strong><span>{workspace.name}</span></div></div>
        <nav className="nav-stack">
          <NavLink to="/" end title="Home"><Home size={17} /><span className="sidebar-copy">Home</span></NavLink>
          <div className="nav-label"><span className="sidebar-copy">Databases</span><button className="icon-button" onClick={addDatabase} disabled={creating} title="New database"><Plus size={16} /></button></div>
          {databases.map((db) => <NavLink key={db.id} to={`/database/${db.id}`} title={db.name}><Database size={16} /><span className="truncate sidebar-copy">{db.name}</span></NavLink>)}
          {!databases.length && !collapsed && <p className="sidebar-empty">Create your first database to start building.</p>}
        </nav>
        <div className="sidebar-footer">
          {!collapsed && <div className="tiny-note"><Sparkles size={14} /> Build anything. Bind data to design.</div>}
          <button className="ghost-button full" onClick={() => supabase.auth.signOut()} title="Sign out"><LogOut size={16} /><span className="sidebar-copy">Sign out</span></button>
        </div>
      </aside>
      <main className="main-area">{children}</main>
    </div>
  )
}
