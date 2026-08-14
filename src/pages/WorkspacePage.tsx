import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Columns2, Database, Heading, Image, LayoutGrid, List, Minus, PanelTop, Plus, Quote, Rows3, Trash2, Type } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAppContext } from '../App'
import { createPageBlock, deletePageBlock, getDatabases, getPage, getPageBlocks, getRecords, updatePage, updatePageBlock } from '../lib/data'
import type { Database as DatabaseType, Page, PageBlock, PageBlockType, RecordRow } from '../types'

type BlockWidth = 'full' | 'half' | 'third'
type EmbeddedMode = 'table' | 'gallery' | 'board'

export default function WorkspacePage(){
  const { pageId } = useParams()
  const { workspace } = useAppContext()
  const [page,setPage] = useState<Page|null>(null)
  const [blocks,setBlocks] = useState<PageBlock[]>([])
  const [databases,setDatabases] = useState<DatabaseType[]>([])
  const [adding,setAdding] = useState(false)
  const [showPageTools,setShowPageTools] = useState(false)

  const load = async()=>{
    if(!pageId) return
    const [p,b,d] = await Promise.all([getPage(pageId),getPageBlocks(pageId),getDatabases(workspace.id)])
    setPage(p); setBlocks(b); setDatabases(d)
  }
  useEffect(()=>{ load().catch(console.error) },[pageId,workspace.id])

  const add = async(type:PageBlockType)=>{
    if(!pageId) return
    let config:Record<string,unknown> = { width:'full' }
    if(type==='heading') config={...config,text:'New heading',level:2}
    if(type==='text') config={...config,text:'Start writing…'}
    if(type==='callout') config={...config,text:'Add a note…'}
    if(type==='image') config={...config,url:'',caption:'',fit:'cover'}
    if(type==='database_view') config={...config,databaseId:databases[0]?.id||'',mode:'gallery',title:'',limit:12,cardBackground:'#ffffff'}
    await createPageBlock(pageId,type,blocks.length,config)
    setAdding(false); await load()
  }

  const move = async(index:number,direction:-1|1)=>{
    const swap=index+direction
    if(swap<0||swap>=blocks.length) return
    const a=blocks[index], b=blocks[swap]
    const next=[...blocks]; next[index]=b; next[swap]=a; setBlocks(next)
    await Promise.all([updatePageBlock(a.id,{position:b.position}),updatePageBlock(b.id,{position:a.position})])
  }

  if(!page) return <div className="page-canvas"><p>Loading page…</p></div>
  return <div className="page-canvas">
    {page.cover&&<div className="page-cover" style={{backgroundImage:`url(${page.cover})`}}/>}
    <div className="page-inner">
      <div className="page-meta-row">
        <div className="page-icon" contentEditable suppressContentEditableWarning onBlur={e=>updatePage(page.id,{icon:e.currentTarget.textContent||null})}>{page.icon||'✦'}</div>
        <button className="page-tools-toggle" onClick={()=>setShowPageTools(v=>!v)}>Customize page</button>
      </div>
      {showPageTools&&<div className="page-tools-popover">
        <label>Icon<input value={page.icon||''} onChange={e=>setPage({...page,icon:e.target.value})} onBlur={()=>updatePage(page.id,{icon:page.icon})}/></label>
        <label>Cover image URL<input value={page.cover||''} placeholder="https://…" onChange={e=>setPage({...page,cover:e.target.value})} onBlur={()=>updatePage(page.id,{cover:page.cover})}/></label>
      </div>}
      <input className="page-title-input" value={page.title} onChange={e=>setPage({...page,title:e.target.value})} onBlur={()=>updatePage(page.id,{title:page.title})}/>
      <div className="page-blocks">
        {blocks.map((b,i)=><Block key={b.id} block={b} databases={databases} index={i} total={blocks.length} onMove={d=>move(i,d)} onChange={async config=>{const next=await updatePageBlock(b.id,{config});setBlocks(x=>x.map(y=>y.id===b.id?next:y))}} onDelete={async()=>{await deletePageBlock(b.id);setBlocks(x=>x.filter(y=>y.id!==b.id))}} />)}
      </div>
      <div className="page-add-wrap"><button className="page-add-button" onClick={()=>setAdding(!adding)}><Plus size={17}/> Add to page</button>{adding&&<div className="page-add-menu">
        <button onClick={()=>add('heading')}><Heading size={17}/>Heading</button><button onClick={()=>add('text')}><Type size={17}/>Text</button><button onClick={()=>add('database_view')}><Database size={17}/>Database view</button><button onClick={()=>add('image')}><Image size={17}/>Image</button><button onClick={()=>add('callout')}><Quote size={17}/>Callout</button><button onClick={()=>add('divider')}><Minus size={17}/>Divider</button>
      </div>}</div>
    </div>
  </div>
}

function Block({block,databases,index,total,onMove,onChange,onDelete}:{block:PageBlock;databases:DatabaseType[];index:number;total:number;onMove:(d:-1|1)=>void;onChange:(c:Record<string,unknown>)=>void;onDelete:()=>void}){
  const [config,setConfig]=useState(block.config)
  useEffect(()=>setConfig(block.config),[block.id,block.config])
  const save=(patch:Record<string,unknown>)=>{const n={...config,...patch};setConfig(n);void onChange(n)}
  const width=(config.width||'full') as BlockWidth
  const tools=<div className="block-tools"><button disabled={index===0} onClick={()=>onMove(-1)} title="Move up"><ArrowUp size={13}/></button><button disabled={index===total-1} onClick={()=>onMove(1)} title="Move down"><ArrowDown size={13}/></button><button onClick={()=>save({width:width==='full'?'half':width==='half'?'third':'full'})} title="Change width">{width==='full'?<PanelTop size={13}/>:<Columns2 size={13}/>}</button><button onClick={onDelete} title="Delete"><Trash2 size={13}/></button></div>
  if(block.type==='divider')return <div className={`live-block block-width-${width}`}>{tools}<hr/></div>
  if(block.type==='database_view')return <div className={`block-width-${width}`}><DatabaseViewBlock config={config} databases={databases} save={save} tools={tools}/></div>
  if(block.type==='image')return <div className={`live-block image-block block-width-${width}`}>{tools}{config.url?<img src={String(config.url)} alt="" style={{objectFit:String(config.fit||'cover') as 'cover'|'contain'}}/>:<div className="image-placeholder">Paste an image URL</div>}<div className="inline-edit-row"><input placeholder="Image URL" value={String(config.url||'')} onChange={e=>setConfig({...config,url:e.target.value})} onBlur={()=>onChange(config)}/><select value={String(config.fit||'cover')} onChange={e=>save({fit:e.target.value})}><option value="cover">Fill</option><option value="contain">Fit</option></select></div></div>
  const Tag=(block.type==='heading'?'h2':'div') as 'h2'|'div'
  return <div className={`live-block ${block.type} block-width-${width}`}>{tools}<Tag className="editable-content" contentEditable suppressContentEditableWarning onBlur={e=>save({text:e.currentTarget.textContent||''})}>{String(config.text||'')}</Tag></div>
}

function DatabaseViewBlock({config,databases,save,tools}:{config:Record<string,unknown>;databases:DatabaseType[];save:(p:Record<string,unknown>)=>void;tools:ReactNode}){
  const databaseId=String(config.databaseId||'')
  const [records,setRecords]=useState<RecordRow[]>([])
  useEffect(()=>{if(!databaseId){setRecords([]);return}getRecords(databaseId).then(setRecords).catch(console.error)},[databaseId])
  const mode=(config.mode||'gallery') as EmbeddedMode
  const limit=Math.max(1,Number(config.limit||12)); const shown=records.slice(0,limit)
  return <div className="live-block database-view-block">{tools}<div className="embedded-view-toolbar">
    <input className="embedded-title" placeholder="Optional view title" value={String(config.title||'')} onChange={e=>save({title:e.target.value})}/>
    <select value={databaseId} onChange={e=>save({databaseId:e.target.value})}><option value="">Choose database</option>{databases.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
    <div className="embedded-mode-switch"><button className={mode==='table'?'active':''} onClick={()=>save({mode:'table'})}><List size={14}/></button><button className={mode==='gallery'?'active':''} onClick={()=>save({mode:'gallery'})}><LayoutGrid size={14}/></button><button className={mode==='board'?'active':''} onClick={()=>save({mode:'board'})}><Rows3 size={14}/></button></div>
  </div>
  {databaseId?<><EmbeddedRecords records={shown} type={mode} databaseId={databaseId} cardBackground={String(config.cardBackground||'#ffffff')}/><div className="embedded-view-footer"><label>Show <input type="number" min="1" max="100" value={limit} onChange={e=>save({limit:Number(e.target.value)})}/></label>{mode!=='table'&&<label>Cards <input type="color" value={String(config.cardBackground||'#ffffff')} onChange={e=>save({cardBackground:e.target.value})}/></label>}</div></>:<div className="embedded-empty">Choose a database. Its live records will appear here.</div>}
  </div>
}

function EmbeddedRecords({records,type,databaseId,cardBackground}:{records:RecordRow[];type:EmbeddedMode;databaseId:string;cardBackground:string}){
  if(type==='gallery')return <div className="embedded-gallery">{records.map(r=><Link to={`/database/${databaseId}/record/${r.id}`} className="embedded-card" style={{background:cardBackground}} key={r.id}><strong>{r.title}</strong><span>Open record</span></Link>)}</div>
  if(type==='board')return <div className="embedded-board"><div><span>Records</span>{records.map(r=><Link to={`/database/${databaseId}/record/${r.id}`} className="embedded-card" style={{background:cardBackground}} key={r.id}>{r.title}</Link>)}</div></div>
  return <div className="embedded-table">{records.map(r=><Link to={`/database/${databaseId}/record/${r.id}`} key={r.id}>{r.title}<span>↗</span></Link>)}</div>
}
