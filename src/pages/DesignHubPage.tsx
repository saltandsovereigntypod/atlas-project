import { ArrowLeft, Columns3, GalleryVerticalEnd, LayoutTemplate, Table2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

const surfaces = [
  { key: 'record', title: 'Record page', description: 'Design the full inside page for every record, with optional per-record overrides.', icon: LayoutTemplate },
  { key: 'gallery', title: 'Gallery card', description: 'Design how records appear as visual cards in gallery views.', icon: GalleryVerticalEnd },
  { key: 'board', title: 'Board card', description: 'Design the cards that appear inside grouped board columns.', icon: Columns3 },
] as const

export default function DesignHubPage() {
  const { databaseId = '' } = useParams()
  return (
    <div className="page-wrap">
      <Link className="back-link" to={`/database/${databaseId}`}><ArrowLeft size={17} /> Back to database</Link>
      <header className="design-hub-header">
        <p className="eyebrow">DESIGN SYSTEM</p>
        <h1>Choose what you want to design</h1>
        <p>Each database owns its own visual language. Set defaults here, then override any individual record when you want it to break the rules.</p>
      </header>
      <div className="design-target-grid">
        {surfaces.map(({ key, title, description, icon: Icon }) => (
          <Link className="design-target-card" to={`/database/${databaseId}/design/${key}`} key={key}>
            <Icon size={24} />
            <div><h2>{title}</h2><p>{description}</p></div>
          </Link>
        ))}
        <div className="design-target-card muted-card">
          <Table2 size={24} />
          <div><h2>Table appearance</h2><p>Table styling stays structured and is controlled from each saved table view's View settings.</p></div>
        </div>
      </div>
    </div>
  )
}
