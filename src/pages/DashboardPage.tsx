import { useEffect, useState } from 'react'
import { ArrowRight, Database as DatabaseIcon, FileText, Plus, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { createDatabase, createPage, getDatabases, getPages } from '../lib/data'
import type { Database, Page } from '../types'
import { useAppContext } from '../App'

export default function DashboardPage() {
  const { workspace } = useAppContext()
  const [databases, setDatabases] = useState<Database[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    const dbs = await getDatabases(workspace.id)
    setDatabases(dbs)
    try {
      setPages(await getPages(workspace.id))
      setPageError(null)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load().catch(console.error) }, [workspace.id])

  const addPage = async () => {
    try {
      const page = await createPage(workspace.id, 'Untitled page', pages.length)
      navigate(`/page/${page.id}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not create page. Make sure 003_pages.sql has been run in Supabase.')
    }
  }

  const addDatabase = async () => {
    const name = window.prompt('Database name', 'Untitled database')?.trim()
    if (!name) return
    const db = await createDatabase(workspace.id, name)
    navigate(`/database/${db.id}`)
  }

  return (
    <div className="home-workspace">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">YOUR ATLAS</p>
          <h1>Make the page first.<br />Let the data power it.</h1>
          <p>Build a reading journal, trip hub, podcast HQ, writing dashboard, collection, planner, or something Atlas has never heard of. Pages are where you create. Databases stay underneath as the source of truth.</p>
          <div className="home-actions"><button className="primary-button" onClick={addPage}><Plus size={17} /> New page</button><button className="secondary-button" onClick={addDatabase}><DatabaseIcon size={16} /> New database</button></div>
        </div>
        <div className="home-philosophy"><Sparkles size={18} /><strong>Pages are the experience.</strong><span>Text, images, live database views, notes, and eventually every visual component share the same canvas.</span></div>
      </section>

      {pageError && <div className="migration-notice"><strong>Pages are waiting on Supabase.</strong><span>Run <code>supabase/003_pages.sql</code> once, then refresh Atlas.</span></div>}

      <section className="home-section">
        <div className="home-section-head"><div><p className="eyebrow">PAGES</p><h2>Your creative spaces</h2><span>These are the things you actually live in.</span></div><button className="secondary-button compact" onClick={addPage}><Plus size={15}/> Page</button></div>
        {loading ? <p>Loading…</p> : pages.length ? <div className="page-card-grid">{pages.map(page => <Link to={`/page/${page.id}`} className="page-home-card" key={page.id}><div className="page-home-icon">{page.icon || '✦'}</div><div><h3>{page.title}</h3><p>Open and build directly on the page.</p></div><ArrowRight size={18}/></Link>)}</div> : !pageError ? <button className="create-page-blank" onClick={addPage}><FileText size={28}/><strong>Start with a blank page</strong><span>Add writing, images, database views, and whatever your workspace needs.</span></button> : null}
      </section>

      <section className="home-section data-section">
        <div className="home-section-head"><div><p className="eyebrow">DATA</p><h2>Sources of truth</h2><span>Databases power pages, views, records, relations, and designs.</span></div><button className="secondary-button compact" onClick={addDatabase}><Plus size={15}/> Database</button></div>
        {databases.length ? <div className="data-source-list">{databases.map(db => <Link to={`/database/${db.id}`} key={db.id}><DatabaseIcon size={16}/><strong>{db.name}</strong><span>{db.description || 'Structured data source'}</span><ArrowRight size={15}/></Link>)}</div> : <p className="muted-home-copy">No databases yet. You can make one now or add a database view to a page after creating your first data source.</p>}
      </section>
    </div>
  )
}
