import { Database, Sparkles } from 'lucide-react'
import { NavLink, useParams } from 'react-router-dom'
import UniversalPage from './UniversalPage'

export default function DatabaseCanvasPage(){const{databaseId=''}=useParams();return <div className="database-canvas-page-shell"><nav className="database-context-switch" aria-label="Database or designed page"><NavLink to={`/database/${databaseId}`} end><Database/>Data</NavLink><NavLink to={`/database/${databaseId}/page`}><Sparkles/>Page</NavLink></nav><UniversalPage kind="database"/></div>}
