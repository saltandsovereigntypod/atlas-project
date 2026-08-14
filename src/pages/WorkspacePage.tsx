import { useEffect, useState } from 'react'
import { Database, Heading, Image, Minus, Plus, Quote, Trash2, Type } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useAppContext } from '../App'
import { createPageBlock, deletePageBlock, getDatabases, getPage, getPageBlocks, getRecords, getViews, updatePage, updatePageBlock } from '../lib/data'
import type { Database as DatabaseType, DatabaseView, Page, PageBlock, PageBlockType, RecordRow } from '../types'

export default function WorkspacePage(){
 const {pageId}=useParams(); const {workspace}=useAppContext(); const [page,setPage]=useState<Page|null>(null); const [blocks,setBlocks]=useState<PageBlock[]>([]); const [databases,setDatabases]=useState<DatabaseType[]>([]); const [adding,setAdding]=useState(false)
 const load=async()=>{if(!pageId)return;const[p,b,d]=await Promise.all([getPage(pageId),getPageBlocks(pageId),getDatabases(workspace.id)]);setPage(p);setBlocks(b);setDatabases(d)}
 useEffect(()=>{load().catch(console.error)},[pageId,workspace.id])
 const add=async(type:PageBlockType)=>{if(!pageId)return;let config:Record<string,unknown>={};if(type==='heading')config={text:'New heading',level:2};if(type==='text')config={text:'Start writing…'};if(type==='callout')config={text:'Add a note…'};if(type==='image')config={url:'',caption:''};if(type==='database_view')config={databaseId:databases[0]?.id||'',viewId:''};await createPageBlock(pageId,type,blocks.length,config);setAdding(false);await load()}
 if(!page)return <div className="page-canvas"><p>Loading page…</p></div>
 return <div className="page-canvas">
   {page.cover&&<div className="page-cover" style={{backgroundImage:`url(${page.cover})`}}/>}
   <div className="page-inner">
    <div className="page-icon" contentEditable suppressContentEditableWarning onBlur={e=>updatePage(page.id,{icon:e.currentTarget.textContent||null})}>{page.icon||'✦'}</div>
    <input className="page-title-input" value={page.title} onChange={e=>setPage({...page,title:e.target.value})} onBlur={()=>updatePage(page.id,{title:page.title})}/>
    <div className="page-blocks">
      {blocks.map((b,i)=><Block key={b.id} block={b} databases={databases} onChange={async config=>{const next=await updatePageBlock(b.id,{config});setBlocks(x=>x.map(y=>y.id===b.id?next:y))}} onDelete={async()=>{await deletePageBlock(b.id);setBlocks(x=>x.filter(y=>y.id!==b.id))}} />)}
    </div>
    <div className="page-add-wrap"><button className="page-add-button" onClick={()=>setAdding(!adding)}><Plus size={17}/> Add to page</button>{adding&&<div className="page-add-menu">
      <button onClick={()=>add('heading')}><Heading size={17}/>Heading</button><button onClick={()=>add('text')}><Type size={17}/>Text</button><button onClick={()=>add('database_view')}><Database size={17}/>Database view</button><button onClick={()=>add('image')}><Image size={17}/>Image</button><button onClick={()=>add('callout')}><Quote size={17}/>Callout</button><button onClick={()=>add('divider')}><Minus size={17}/>Divider</button>
    </div>}</div>
   </div>
 </div>
}

function Block({block,databases,onChange,onDelete}:{block:PageBlock;databases:DatabaseType[];onChange:(c:Record<string,unknown>)=>void;onDelete:()=>void}){
 const [config,setConfig]=useState(block.config); useEffect(()=>setConfig(block.config),[block.id,block.config]); const save=(patch:Record<string,unknown>)=>{const n={...config,...patch};setConfig(n);onChange(n)}
 if(block.type==='divider')return <div className="live-block"><hr/><button className="block-delete" onClick={onDelete}><Trash2 size={14}/></button></div>
 if(block.type==='database_view')return <DatabaseViewBlock config={config} databases={databases} save={save} onDelete={onDelete}/>
 if(block.type==='image')return <div className="live-block image-block">{config.url?<img src={String(config.url)} alt=""/>:<div className="image-placeholder">Paste an image URL below</div>}<input placeholder="Image URL" value={String(config.url||'')} onChange={e=>setConfig({...config,url:e.target.value})} onBlur={()=>onChange(config)}/><button className="block-delete" onClick={onDelete}><Trash2 size={14}/></button></div>
 const tag=block.type==='heading'?'h2':'div'; const Tag=tag as 'h2'|'div'; return <div className={`live-block ${block.type}`}><Tag className="editable-content" contentEditable suppressContentEditableWarning onBlur={e=>save({text:e.currentTarget.textContent||''})}>{String(config.text||'')}</Tag><button className="block-delete" onClick={onDelete}><Trash2 size={14}/></button></div>
}

function DatabaseViewBlock({config,databases,save,onDelete}:{config:Record<string,unknown>;databases:DatabaseType[];save:(p:Record<string,unknown>)=>void;onDelete:()=>void}){
 const databaseId=String(config.databaseId||''); const [views,setViews]=useState<DatabaseView[]>([]); const [records,setRecords]=useState<RecordRow[]>([])
 useEffect(()=>{if(!databaseId){setViews([]);setRecords([]);return}Promise.all([getViews(databaseId),getRecords(databaseId)]).then(([v,r])=>{setViews(v);setRecords(r);if(!config.viewId&&v[0])save({viewId:v[0].id})}).catch(console.error)},[databaseId])
 const view=views.find(v=>v.id===config.viewId)||views[0]
 return <div className="live-block database-view-block"><div className="embedded-view-toolbar"><select value={databaseId} onChange={e=>save({databaseId:e.target.value,viewId:''})}><option value="">Choose database</option>{databases.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>{databaseId&&<select value={String(config.viewId||view?.id||'')} onChange={e=>save({viewId:e.target.value})}>{views.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select>}<button className="block-delete static" onClick={onDelete}><Trash2 size={14}/></button></div>{databaseId&&<EmbeddedRecords records={records} type={view?.type||'table'}/>}</div>
}
function EmbeddedRecords({records,type}:{records:RecordRow[];type:string}){if(type==='gallery')return <div className="embedded-gallery">{records.map(r=><div className="embedded-card" key={r.id}><strong>{r.title}</strong></div>)}</div>;if(type==='board')return <div className="embedded-board"><div><span>Records</span>{records.map(r=><div className="embedded-card" key={r.id}>{r.title}</div>)}</div></div>;return <div className="embedded-table">{records.map(r=><div key={r.id}>{r.title}</div>)}</div>}
