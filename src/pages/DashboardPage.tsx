import { useEffect, useState } from 'react'
import { ArrowRight, Database as DatabaseIcon, LayoutTemplate, Plus, Rows3 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { createDatabase, getDatabases } from '../lib/data'
import type { Database } from '../types'
import { useAppContext } from '../App'

export default function DashboardPage() {
  const { workspace } = useAppContext()
  const [databases, setDatabases] = useState<Database[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getDatabases(workspace.id).then(setDatabases).finally(() => setLoading(false))
  }, [workspace.id])

  const add = async () => {
    const name = window.prompt('Database name', 'Books')?.trim()
    if (!name) return
    const db = await createDatabase(workspace.id, name)
    navigate(`/database/${db.id}`)
  }

  return (
    <div className="page-wrap">
      <header className="page-header hero-header">
        <div><p className="eyebrow">YOUR WORKSPACE</p><h1>Build a home for anything.</h1><p className="page-subtitle">Create the structure first. Decide how it looks second. Change either whenever you want.</p></div>
        <button className="primary-button compact" onClick={add}><Plus size={17} /> New database</button>
      </header>

      <section className="metric-row">
        <div className="metric-card"><DatabaseIcon size={19} /><div><strong>{databases.length}</strong><span>databases</span></div></div>
        <div className="metric-card"><Rows3 size={19} /><div><strong>Any</strong><span>record type</span></div></div>
        <div className="metric-card"><LayoutTemplate size={19} /><div><strong>1 canvas</strong><span>per database, for now</span></div></div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>Databases</h2><p>Each database gets its own fields, records, and visual design.</p></div></div>
        {loading ? <p>Loading…</p> : databases.length ? (
          <div className="database-grid">
            {databases.map((db) => (
              <Link className="database-card" to={`/database/${db.id}`} key={db.id}>
                <div className="database-icon">{db.icon || '✦'}</div>
                <div><h3>{db.name}</h3><p>{db.description || 'A flexible collection waiting for your structure.'}</p></div>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <button className="empty-state" onClick={add}>
            <div className="database-icon large"><Plus /></div>
            <h3>Create your first database</h3>
            <p>Books, characters, dreams, recipes, episodes, rituals, projects. The app does not care what the records mean.</p>
          </button>
        )}
      </section>
    </div>
  )
}
