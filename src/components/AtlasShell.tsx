import { PropsWithChildren, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, FilePlus2, Heart, Home, LogOut, Menu, Plus, Search, Settings } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { createPage, getDatabases, getPages, updatePage } from '../lib/data'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../App'
import type { Database, Page } from '../types'

export default function AtlasShell({children}:PropsWithChildren){
 const {workspace}=useAppContext();const[pages,setPages]=useState<Page[]>([]);const[databases,setDatabases]=useState<Database[]>([]);const[collapsed,setCollapsed]=useState(false);const[openGroups,setOpenGroups]=useState<Record<string,boolean>>({favorites:true,pages:true,data:true});const navigate=useNavigate();const location=useLocation()
 const refresh=async()=>{const[p,d]=await Promise.all([getPages(workspace.id),getDatabases(workspace.id)]);setPages(p);setDatabases(d)}
 useEffect(()=>{refresh().catch(console.error)},[workspace.id,location.pathname])
 const regularPages=useMemo(()=>pages.filter(p=>p.context_type==='page'),[pages]);const favorites=useMemo(()=>pages.filter(p=>p.favorite),[pages])
 const addPage=async(parent_id:string|null=null)=>{const p=await createPage(workspace.id,'Untitled page',regularPages.length,parent_id);await refresh();navigate(`/page/${p.id}`)}
 const toggle=(key:string)=>setOpenGroups(x=>({...x,[key]:!x[key]}))
 return <div className={`atlas-shell ${collapsed?'nav-collapsed':''}`}>
  <aside className="atlas-sidebar">
   <div className="atlas-sidebar-top"><button className="atlas-brand" onClick={()=>navigate('/')}><span>A</span>{!collapsed&&<strong>Atlas</strong>}</button><button className="atlas-nav-collapse" onClick={()=>setCollapsed(v=>!v)}><Menu/></button></div>
   {!collapsed&&<div className="atlas-sidebar-actions"><button><Search/>Search</button><NavLink to="/"><Home/>Home</NavLink></div>}
   {!collapsed&&<div className="atlas-sidebar-scroll">
    {favorites.length>0&&<SidebarSection label="Favorites" icon={<Heart/>} open={openGroups.favorites} onToggle={()=>toggle('favorites')}><PageLinks pages={favorites}/></SidebarSection>}
    <SidebarSection label="Pages" open={openGroups.pages} onToggle={()=>toggle('pages')} action={<button onClick={()=>addPage()} title="New page"><Plus/></button>}><PageLinks pages={regularPages}/></SidebarSection>
    <SidebarSection label="Data" open={openGroups.data} onToggle={()=>toggle('data')}><div className="atlas-data-links">{databases.map(d=><NavLink key={d.id} to={`/database/${d.id}`}><span className="atlas-dot">•</span>{d.name}</NavLink>)}</div></SidebarSection>
   </div>}
   {collapsed&&<div className="atlas-collapsed-links"><NavLink to="/"><Home/></NavLink><button onClick={()=>addPage()}><FilePlus2/></button></div>}
   <div className="atlas-sidebar-footer">{!collapsed&&<button><Settings/>Settings</button>}<button onClick={()=>supabase.auth.signOut()}><LogOut/>{!collapsed&&'Sign out'}</button></div>
  </aside>
  <section className="atlas-workspace">{children}</section>
 </div>
}

function SidebarSection({label,icon,open,onToggle,action,children}:{label:string;icon?:ReactNode;open:boolean;onToggle:()=>void;action?:ReactNode;children:ReactNode}){return <div className="atlas-sidebar-section"><div className="atlas-section-head"><button onClick={onToggle}>{open?<ChevronDown/>:<ChevronRight/>}{icon}{label}</button>{action}</div>{open&&<div className="atlas-section-body">{children}</div>}</div>}
function PageLinks({pages}:{pages:Page[]}){return <>{pages.map(p=><div className="atlas-page-link-row" key={p.id}><NavLink to={`/page/${p.id}`}><span>{p.icon||'•'}</span>{p.title}</NavLink><button title={p.favorite?'Unfavorite':'Favorite'} onClick={()=>updatePage(p.id,{favorite:!p.favorite})}><Heart fill={p.favorite?'currentColor':'none'}/></button></div>)}</>}
