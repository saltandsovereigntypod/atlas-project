import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import { ensureWorkspace } from './lib/data'
import type { Workspace } from './types'
import AuthPage from './pages/AuthPage'
import UniversalPage from './pages/UniversalPage'
import DatabaseWorkspace from './pages/DatabaseWorkspace'
import DatabaseCanvasPage from './pages/DatabaseCanvasPage'
import AtlasShell from './components/AtlasShell'
import './workspace-content.css'

interface AppContextValue { user:User; workspace:Workspace; refreshWorkspace:()=>Promise<void> }
const AppContext=createContext<AppContextValue|null>(null)
export function useAppContext(){const value=useContext(AppContext);if(!value)throw new Error('useAppContext must be used inside AppContext');return value}

function ProtectedLayout(){
 const[session,setSession]=useState<Session|null>(null);const[workspace,setWorkspace]=useState<Workspace|null>(null);const[authReady,setAuthReady]=useState(false);const[workspaceLoading,setWorkspaceLoading]=useState(false);const[workspaceError,setWorkspaceError]=useState<string|null>(null);const location=useLocation()
 const loadWorkspace=async(user:User)=>setWorkspace(await ensureWorkspace(user.id,user.email))
 useEffect(()=>{let mounted=true;supabase.auth.getSession().then(({data,error})=>{if(!mounted)return;if(error)setWorkspaceError(error.message);setSession(data.session);setAuthReady(true)});const{data:listener}=supabase.auth.onAuthStateChange((_event,next)=>{if(mounted){setSession(next);setAuthReady(true)}});return()=>{mounted=false;listener.subscription.unsubscribe()}},[])
 useEffect(()=>{let cancelled=false;if(!authReady)return;if(!session?.user){setWorkspace(null);setWorkspaceLoading(false);return}setWorkspaceLoading(true);ensureWorkspace(session.user.id,session.user.email).then(found=>{if(!cancelled)setWorkspace(found)}).catch(e=>{if(!cancelled)setWorkspaceError(e instanceof Error?e.message:String(e))}).finally(()=>{if(!cancelled)setWorkspaceLoading(false)});return()=>{cancelled=true}},[authReady,session?.user?.id])
 if(!configured)return <MissingConfig/>;if(!authReady||workspaceLoading)return <div className="center-screen"><div className="spinner"/><p>Opening Atlas…</p></div>;if(!session?.user)return <Navigate to="/login" replace state={{from:location.pathname}}/>;if(workspaceError)return <div className="center-screen setup-card"><h1>Atlas could not open your workspace</h1><p>{workspaceError}</p></div>;if(!workspace)return null
 return <AppContext.Provider value={{user:session.user,workspace,refreshWorkspace:()=>loadWorkspace(session.user)}}><AtlasShell><Outlet/></AtlasShell></AppContext.Provider>
}
function MissingConfig(){return <div className="center-screen setup-card"><div className="brand-mark">A</div><h1>Atlas needs Supabase</h1><p>Add the Supabase URL and publishable key, then run migrations through <code>004_universal_pages.sql</code>.</p></div>}
export default function App(){return <Routes><Route path="/login" element={<AuthPage/>}/><Route element={<ProtectedLayout/>}><Route path="/" element={<UniversalPage kind="home"/>}/><Route path="/page/:pageId" element={<UniversalPage kind="page"/>}/><Route path="/database/:databaseId" element={<DatabaseWorkspace/>}/><Route path="/database/:databaseId/page" element={<DatabaseCanvasPage/>}/><Route path="/database/:databaseId/record/:recordId" element={<UniversalPage kind="record"/>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes>}
