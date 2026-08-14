import { PropsWithChildren,useEffect,useState } from 'react'
import { ChevronLeft,ChevronRight,Database,FileText,Home,LogOut,Plus,Sparkles } from 'lucide-react'
import { NavLink,useLocation,useNavigate } from 'react-router-dom'
import { createDatabase,createPage,getDatabases,getPages } from '../lib/data'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../App'
import type { Database as DatabaseType,Page } from '../types'

export default function AppShell({children}:PropsWithChildren){
 const {workspace}=useAppContext();const[databases,setDatabases]=useState<DatabaseType[]>([]),[pages,setPages]=useState<Page[]>([]),[collapsed,setCollapsed]=useState(()=>localStorage.getItem('atlas:sidebar-collapsed')==='true');const navigate=useNavigate(),location=useLocation()
 const refresh=async()=>{const[d,p]=await Promise.all([getDatabases(workspace.id),getPages(workspace.id)]);setDatabases(d);setPages(p)}
 useEffect(()=>{refresh().catch(console.error)},[workspace.id,location.pathname]);useEffect(()=>localStorage.setItem('atlas:sidebar-collapsed',String(collapsed)),[collapsed])
 const addPage=async()=>{const p=await createPage(workspace.id,'Untitled page',pages.length);await refresh();navigate(`/page/${p.id}`)}
 const addDatabase=async()=>{const n=window.prompt('What should this database be called?','Untitled database')?.trim();if(!n)return;const d=await createDatabase(workspace.id,n);await refresh();navigate(`/database/${d.id}`)}
 return <div className={`app-shell ${collapsed?'sidebar-is-collapsed':''}`}>
  <aside className="sidebar">
   <button className="sidebar-edge-toggle" onClick={()=>setCollapsed(v=>!v)} title={collapsed?'Expand navigation':'Collapse navigation'} aria-label={collapsed?'Expand navigation':'Collapse navigation'}>{collapsed?<ChevronRight size={18}/>:<ChevronLeft size={18}/>}</button>
   <div className="brand-row"><div className="brand-mark small">A</div><div className="sidebar-copy"><strong>Atlas Studio</strong><span>{workspace.name}</span></div></div>
   <nav className="nav-stack">
    <NavLink to="/" end title="Home"><Home size={17}/><span className="sidebar-copy">Home</span></NavLink>
    <div className="nav-label"><span className="sidebar-copy">Pages</span><button className="icon-button" onClick={addPage} title="New page"><Plus size={16}/></button></div>
    {pages.map(p=><NavLink key={p.id} to={`/page/${p.id}`} title={p.title}><FileText size={16}/><span className="truncate sidebar-copy">{p.title}</span></NavLink>)}
    <div className="nav-label database-label"><span className="sidebar-copy">Data · {databases.length}</span></div>
    {!collapsed&&<button className="sidebar-create-database" onClick={addDatabase}><Plus size={15}/><span>New database</span></button>}
    {collapsed&&<button className="sidebar-create-database collapsed-add" onClick={addDatabase} title="New database"><Plus size={17}/></button>}
    {databases.map(d=><NavLink key={d.id} to={`/database/${d.id}`} title={d.name}><Database size={16}/><span className="truncate sidebar-copy">{d.name}</span></NavLink>)}
    {!databases.length&&!collapsed&&<p className="sidebar-empty">Databases are reusable data sources. Create Books, Trips, Reservations, Episodes, Guests, Characters, or anything else.</p>}
   </nav>
   <div className="sidebar-footer">{!collapsed&&<div className="tiny-note"><Sparkles size={14}/> Pages are the experience. Data powers them.</div>}<button className="ghost-button full" onClick={()=>supabase.auth.signOut()} title="Sign out"><LogOut size={16}/><span className="sidebar-copy">Sign out</span></button></div>
  </aside>
  <main className="main-area">{children}</main>
 </div>
}
