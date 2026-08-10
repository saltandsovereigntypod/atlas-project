import { PropsWithChildren, useEffect, useState } from 'react'
import { Database, Home, LogOut, Plus, Sparkles } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { createDatabase, getDatabases } from '../lib/data'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../App'
import type { Database as DatabaseType } from '../types'

export default function AppShell({ children }: PropsWithChildren) {
  const { workspace } = useAppContext()
  const [databases, setDatabases] = useState<DatabaseType[]>([])
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const refresh = async () => setDatabases(await getDatabases(workspace.id))
  useEffect(() => { refresh().catch(console.error) }, [workspace.id, location.pathname])

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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row"><div className="brand-mark small">A</div><div><strong>Atlas Studio</strong><span>{workspace.name}</span></div></div>
        <nav className="nav-stack">
          <NavLink to="/" end><Home size={17} /> Home</NavLink>
          <div className="nav-label"><span>Databases</span><button className="icon-button" onClick={addDatabase} disabled={creating} title="New database"><Plus size={16} /></button></div>
          {databases.map((db) => <NavLink key={db.id} to={`/database/${db.id}`}><Database size={16} /> <span className="truncate">{db.name}</span></NavLink>)}
          {!databases.length && <p className="sidebar-empty">Create your first database to start building.</p>}
        </nav>
        <div className="sidebar-footer">
          <div className="tiny-note"><Sparkles size={14} /> Build anything. Bind data to design.</div>
          <button className="ghost-button full" onClick={() => supabase.auth.signOut()}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <main className="main-area">{children}</main>
    </div>
  )
}
