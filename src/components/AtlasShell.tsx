import { PropsWithChildren, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, FilePlus2, Heart, Home, LogOut, Menu, Plus, Search, Settings, X } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { createPage, getDatabases, getPages, updatePage } from '../lib/data'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../App'
import type { Database, Page } from '../types'

export default function AtlasShell({children}:PropsWithChildren){
 const{workspace}=useAppContext();const[pages,setPages]=useState<Page[]>([]),[databases,setDatabases]=useState<Database[]>([]),[collapsed,setCollapsed]=useState(false),[searching,setSearching]=useState(false),[query,setQuery]=useState(''),[openGroups,setOpenGroups]=useState<Record<string,boolean>>({favorites:true,pages:true,data:true}),[openNodes,setOpenNodes]=useState<Record<string,boolean>>({});const navigate=useNavigate(),location=useLocation()
 const refresh=async()=>{const[p,d]=await Promise.all([getPages(workspace.id),getDatabases(workspace.id)]);setPages(p);setDatabases(d)}
 useEffect(()=>{refresh().catch(console.error)},[workspace.id,location.pathname])
 const regularPages=useMemo(()=>pages.filter(p=>p.context_type==='page'),[pages]);const favorites=useMemo(()=>pages.filter(p=>p.favorite),[pages]);const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return regularPages;return regularPages.filter(p=>p.title.toLowerCase().includes(q))},[regularPages,query])
 const addPage=async(parent_id:string|null=null)=>{const siblings=regularPages.filter(p=>p.parent_id===parent_id);const p=await createPage(workspace.id,'Untitled page',siblings.length,parent_id);if(parent_id)setOpenNodes(x=>({...x,[parent_id]:true}));await refresh();navigate(`/page/${p.id}`)}
 const toggle=(key:string)=>setOpenGroups(x=>({...x,[key]:!x[key]}));const toggleNode=(id:string)=>setOpenNodes(x=>({...x,[id]:!x[id]}))
 return <div className={`atlas-shell ${collapsed?'nav-collapsed':''}`}>
  <aside className="atlas-sidebar">
   <div className="atlas-sidebar-top"><button className="atlas-brand" onClick={()=>navigate('/')}><span>A</span>{!collapsed&&<strong>Atlas</strong>}</button><button className="atlas-nav-collapse" onClick={()=>setCollapsed(v=>!v)}><Menu/></button></div>
   {!collapsed&&<div className="atlas-sidebar-actions">{searching?<div className="atlas-sidebar-search"><Search/><input autoFocus placeholder="Search pages" value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={()=>{setSearching(false);setQuery('')}}><X/></button></div>:<button onClick={()=>setSearching(true)}><Search/>Search</button>}<NavLink to="/"><Home/>Home</NavLink></div>}
   {!collapsed&&<div className="atlas-sidebar-scroll">
    {favorites.length>0&&!query&&<SidebarSection label="Favorites" icon={<Heart/>} open={openGroups.favorites} onToggle={()=>toggle('favorites')}><SimpleLinks pages={favorites}/></SidebarSection>}
    <SidebarSection label={query?'Search results':'Pages'} open={openGroups.pages} onToggle={()=>toggle('pages')} action={!query?<button onClick={()=>addPage()} title="New page"><Plus/></button>:undefined}>{query?<SimpleLinks pages={filtered}/>:<PageTree pages={regularPages} parentId={null} depth={0} openNodes={openNodes} onToggle={toggleNode} onAdd={addPage} onFavorite={async p=>{await updatePage(p.id,{favorite:!p.favorite});await refresh()}}/>}</SidebarSection>
    {!query&&<SidebarSection label="Data" open={openGroups.data} onToggle={()=>toggle('data')}><div className="atlas-data-links">{databases.map(d=><NavLink key={d.id} to={`/database/${d.id}`}><span className="atlas-dot">•</span>{d.name}</NavLink>)}</div></SidebarSection>}
   </div>}
   {collapsed&&<div className="atlas-collapsed-links"><NavLink to="/"><Home/></NavLink><button onClick={()=>addPage()}><FilePlus2/></button></div>}
   <div className="atlas-sidebar-footer">{!collapsed&&<button><Settings/>Settings</button>}<button onClick={()=>supabase.auth.signOut()}><LogOut/>{!collapsed&&'Sign out'}</button></div>
  </aside><section className="atlas-workspace">{children}</section>
 </div>
}
function SidebarSection({label,icon,open,onToggle,action,children}:{label:string;icon?:ReactNode;open:boolean;onToggle:()=>void;action?:ReactNode;children:ReactNode}){return <div className="atlas-sidebar-section"><div className="atlas-section-head"><button onClick={onToggle}>{open?<ChevronDown/>:<ChevronRight/>}{icon}{label}</button>{action}</div>{open&&<div className="atlas-section-body">{children}</div>}</div>}
function SimpleLinks({pages}:{pages:Page[]}){return <>{pages.map(p=><div className="atlas-page-link-row" key={p.id}><NavLink to={`/page/${p.id}`}><span>{p.icon||'•'}</span>{p.title}</NavLink></div>)}</>}
function PageTree({pages,parentId,depth,openNodes,onToggle,onAdd,onFavorite}:{pages:Page[];parentId:string|null;depth:number;openNodes:Record<string,boolean>;onToggle:(id:string)=>void;onAdd:(parent:string|null)=>void;onFavorite:(p:Page)=>void}){const children=pages.filter(p=>p.parent_id===parentId);return <>{children.map(p=>{const childPages=pages.filter(x=>x.parent_id===p.id);const hasChildren=childPages.length>0;const open=openNodes[p.id]??true;return <div className="atlas-tree-node" key={p.id}><div className="atlas-page-link-row" style={{paddingLeft:depth*12}}>{hasChildren?<button className="atlas-tree-toggle" onClick={()=>onToggle(p.id)}>{open?<ChevronDown/>:<ChevronRight/>}</button>:<span className="atlas-tree-spacer"/>}<NavLink to={`/page/${p.id}`}><span>{p.icon||'•'}</span>{p.title}</NavLink><div className="atlas-tree-actions"><button title="Add subpage" onClick={()=>onAdd(p.id)}><Plus/></button><button title={p.favorite?'Unfavorite':'Favorite'} onClick={()=>onFavorite(p)}><Heart fill={p.favorite?'currentColor':'none'}/></button></div></div>{hasChildren&&open&&<PageTree pages={pages} parentId={p.id} depth={depth+1} openNodes={openNodes} onToggle={onToggle} onAdd={onAdd} onFavorite={onFavorite}/>}</div>})}</>}
