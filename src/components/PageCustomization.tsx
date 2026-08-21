import { useState } from 'react'
import { Palette, X } from 'lucide-react'
import TemplatePanel from './TemplatePanel'
import { STYLE_PACKS } from '../lib/creativePresets'
import { applyPageStylePack } from '../lib/pageStyling'
import type { Database, Page, PageBlock } from '../types'

export default function PageCustomization({page,blocks,databases,database,onSaveSettings,onRefresh,onClose}:{page:Page;blocks:PageBlock[];databases:Database[];database:Database|null;onSaveSettings:(patch:Record<string,unknown>)=>void;onRefresh:()=>Promise<void>|void;onClose:()=>void}){
 const[tab,setTab]=useState<'appearance'|'templates'>('appearance')
 const[busy,setBusy]=useState('')
 const[message,setMessage]=useState('')
 const applyStyle=async(styleId:string)=>{setBusy(styleId);setMessage('');try{const pack=await applyPageStylePack(page,blocks,styleId);await onRefresh();setMessage(`${pack.name} applied to the page and its visual elements.`)}catch(error){setMessage(error instanceof Error?error.message:'Atlas could not apply that theme.')}finally{setBusy('')}}
 return <aside data-workspace-interactive className="page-customization" aria-label="Page customization" onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}>
  <header><div><span>PAGE</span><strong>Customize</strong></div><button type="button" onClick={onClose} aria-label="Close page customization"><X/></button></header>
  <nav><button type="button" className={tab==='appearance'?'active':''} onClick={()=>setTab('appearance')}>Theme & appearance</button><button type="button" className={tab==='templates'?'active':''} onClick={()=>setTab('templates')}>Templates</button></nav>
  <div className="page-customization-scroll">{tab==='appearance'?<>
   <div className="page-panel-title">Theme</div>
   <p className="page-template-safety">Themes restyle the page and visual elements together. They do not change databases, record values, document IDs, or data connections.</p>
   <div className="page-theme-grid">{STYLE_PACKS.map(theme=><button type="button" key={theme.id} disabled={Boolean(busy)} className={String(page.settings.stylePackId||'')===theme.id?'active':''} style={{background:theme.page.background,color:theme.page.textColor}} onClick={()=>void applyStyle(theme.id)}><Palette/><span>{busy===theme.id?'Applying…':theme.name}</span><small>{theme.description}</small></button>)}</div>
   {message&&<p className="page-customization-message">{message}</p>}
   <div className="page-panel-title">Page appearance</div>
   <label>Background<input type="color" value={safeColor(page.settings.background,'#fbfaf7')} onChange={event=>void onSaveSettings({background:event.target.value,stylePackId:null})}/></label>
   <label>Default text<input type="color" value={safeColor(page.settings.textColor,'#211e1a')} onChange={event=>void onSaveSettings({textColor:event.target.value,stylePackId:null})}/></label>
   <label>Background image<input value={String(page.settings.backgroundImage||'')} placeholder="Image URL" onBlur={event=>void onSaveSettings({backgroundImage:event.target.value})}/></label>
   <label>Canvas height<input type="number" min="600" value={Number(page.settings.canvasHeight||1100)} onChange={event=>void onSaveSettings({canvasHeight:+event.target.value})}/></label>
  </>:<>
   <p className="page-template-safety">Templates are complete starting systems. Add keeps your current composition and places template content alongside it. Replace is always an explicit confirmed action. Databases and records are never silently deleted.</p>
   <TemplatePanel page={page} blocks={blocks} databases={databases} database={database} onRefresh={onRefresh}/>
  </>}</div>
 </aside>
}
function safeColor(value:unknown,fallback:string){const text=String(value||'');return /^#[0-9a-f]{6}$/i.test(text)?text:fallback}
