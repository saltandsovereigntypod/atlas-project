import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, BarChart3, Columns2, Database, Heading, Image, LayoutGrid, List, Minus, MousePointer2, Pencil, Plus, Quote, Rows3, Settings2, Trash2, Type, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAppContext } from '../App'
import { createPageBlock, createRecord, deletePageBlock, getDatabase, getDatabases, getFields, getOrCreateContextPage, getPage, getPageBlocks, getRecord, getRecords, updatePage, updatePageBlock, updateRecord } from '../lib/data'
import { displayValue } from '../lib/value'
import type { Database as DatabaseType, Field, Page, PageBlock, PageBlockType, RecordRow } from '../types'

type Kind = 'home' | 'page' | 'database' | 'record'
type Width = 'full' | 'half' | 'third'
type Mode = 'table' | 'gallery' | 'board'

export default function UniversalPage({ kind }: { kind: Kind }) {
  const params = useParams()
  const { workspace } = useAppContext()
  const [page,setPage] = useState<Page|null>(null)
  const [blocks,setBlocks] = useState<PageBlock[]>([])
  const [databases,setDatabases] = useState<DatabaseType[]>([])
  const [database,setDatabase] = useState<DatabaseType|null>(null)
  const [record,setRecord] = useState<RecordRow|null>(null)
  const [fields,setFields] = useState<Field[]>([])
  const [editing,setEditing] = useState(false)
  const [adding,setAdding] = useState(false)
  const [dataOpen,setDataOpen] = useState(false)
  const [styleOpen,setStyleOpen] = useState(false)
  const [error,setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const all = await getDatabases(workspace.id)
      setDatabases(all)
      let p:Page
      let db:DatabaseType|null = null
      let rec:RecordRow|null = null
      if(kind==='page') p = await getPage(params.pageId || '')
      else if(kind==='home') p = await getOrCreateContextPage(workspace.id,'home','Home',{icon:'✦'})
      else if(kind==='database') {
        db = await getDatabase(params.databaseId || '')
        p = await getOrCreateContextPage(workspace.id,'database',db.name,{databaseId:db.id,icon:db.icon || '✦'})
      } else {
        db = await getDatabase(params.databaseId || '')
        rec = await getRecord(params.recordId || '')
        p = await getOrCreateContextPage(workspace.id,'record',rec.title,{databaseId:db.id,recordId:rec.id,icon:db.icon || '✦'})
      }
      setDatabase(db); setRecord(rec)
      const fs = db ? await getFields(db.id) : []
      setFields(fs); setPage(p)
      let loaded = await getPageBlocks(p.id)
      if(!loaded.length && kind==='database' && db){
        await createPageBlock(p.id,'database_view',0,{width:'full',databaseId:db.id,mode:'gallery',title:db.name,limit:24,cardBackground:'#ffffff'})
        loaded = await getPageBlocks(p.id)
      }
      if(!loaded.length && kind==='record' && rec){
        await createPageBlock(p.id,'property',0,{width:'full',fieldId:'__title__',label:'',display:'hero'})
        for(let i=0;i<Math.min(fs.length,6);i++) await createPageBlock(p.id,'property',i+1,{width:i<2?'half':'third',fieldId:fs[i].id,label:fs[i].name,display:'default'})
        loaded = await getPageBlocks(p.id)
      }
      setBlocks(loaded)
    } catch(e) { setError(e instanceof Error ? e.message : String(e)) }
  }
  useEffect(()=>{ void load() },[workspace.id,kind,params.pageId,params.databaseId,params.recordId])

  const add = async(type:PageBlockType) => {
    if(!page) return
    let config:Record<string,unknown>={width:'full'}
    if(type==='heading')config={...config,text:'New heading'}
    if(type==='text')config={...config,text:'Start writing…'}
    if(type==='callout')config={...config,text:'Add a note…'}
    if(type==='image')config={...config,url:'',fit:'cover'}
    if(type==='database_view')config={...config,databaseId:database?.id||databases[0]?.id||'',mode:'gallery',title:'',limit:12,cardBackground:'#ffffff'}
    if(type==='property')config={...config,fieldId:record?'__title__':fields[0]?.id||'',label:'',display:'default'}
    if(type==='metric')config={...config,label:'Total',databaseId:database?.id||databases[0]?.id||'',operation:'count'}
    if(type==='button')config={...config,label:'Button',url:''}
    await createPageBlock(page.id,type,blocks.length,config)
    setAdding(false);setBlocks(await getPageBlocks(page.id))
  }
  const move = async(index:number,direction:-1|1)=>{
    const other=index+direction;if(other<0||other>=blocks.length)return
    const a=blocks[index],b=blocks[other];const next=[...blocks];next[index]=b;next[other]=a;setBlocks(next)
    await Promise.all([updatePageBlock(a.id,{position:b.position}),updatePageBlock(b.id,{position:a.position})])
  }

  if(error)return <div className="atlas-error"><h2>Atlas could not open this page</h2><p>{error}</p><p>Run <code>supabase/004_universal_pages.sql</code> if you have not yet.</p></div>
  if(!page)return <div className="atlas-loading"><div className="spinner"/><p>Opening page…</p></div>

  return <div className={`atlas-page ${editing?'editing':''}`} style={{background:String(page.settings?.background||'#fbfaf7'),color:String(page.settings?.textColor||'#211e1a')}}>
    <header className="atlas-page-toolbar">
      <div className="atlas-context">{kind==='home'?'Home':kind==='database'?database?.name:kind==='record'?`${database?.name} / ${record?.title}`:'Page'}</div>
      <div className="atlas-toolbar-actions"><button onClick={()=>setDataOpen(true)}><Database size={15}/>Data</button><button onClick={()=>setStyleOpen(v=>!v)}><Settings2 size={15}/>Style</button><button className={editing?'active':''} onClick={()=>setEditing(v=>!v)}><Pencil size={15}/>{editing?'Done':'Edit page'}</button></div>
    </header>
    {page.cover&&<div className="atlas-page-cover" style={{backgroundImage:`url(${page.cover})`}}/>}
    <main className="atlas-page-canvas">
      <div className="atlas-page-heading"><div className="atlas-page-icon">{page.icon||'✦'}</div><input value={page.title} readOnly={!editing} onChange={e=>setPage({...page,title:e.target.value})} onBlur={()=>updatePage(page.id,{title:page.title})}/></div>
      {styleOpen&&<div className="atlas-style-strip"><label>Icon<input value={page.icon||''} onChange={e=>setPage({...page,icon:e.target.value})} onBlur={()=>updatePage(page.id,{icon:page.icon})}/></label><label>Cover<input value={page.cover||''} placeholder="Image URL" onChange={e=>setPage({...page,cover:e.target.value})} onBlur={()=>updatePage(page.id,{cover:page.cover})}/></label><label>Background<input type="color" value={String(page.settings?.background||'#fbfaf7')} onChange={async e=>{const settings={...page.settings,background:e.target.value};setPage({...page,settings});await updatePage(page.id,{settings})}}/></label><label>Text<input type="color" value={String(page.settings?.textColor||'#211e1a')} onChange={async e=>{const settings={...page.settings,textColor:e.target.value};setPage({...page,settings});await updatePage(page.id,{settings})}}/></label></div>}
      <div className="atlas-component-grid">{blocks.map((b,i)=><Block key={b.id} block={b} editing={editing} index={i} total={blocks.length} databases={databases} record={record} fields={fields} onMove={d=>move(i,d)} onChange={async config=>{const next=await updatePageBlock(b.id,{config});setBlocks(x=>x.map(y=>y.id===b.id?next:y))}} onDelete={async()=>{await deletePageBlock(b.id);setBlocks(x=>x.filter(y=>y.id!==b.id))}}/>)}</div>
      {editing&&<div className="atlas-add-wrap"><button className="atlas-add-button" onClick={()=>setAdding(v=>!v)}><Plus size={16}/>Add something</button>{adding&&<div className="atlas-add-menu"><Add icon={<Heading/>} label="Heading" onClick={()=>add('heading')}/><Add icon={<Type/>} label="Text" onClick={()=>add('text')}/><Add icon={<Image/>} label="Image" onClick={()=>add('image')}/><Add icon={<Database/>} label="Database view" onClick={()=>add('database_view')}/><Add icon={<MousePointer2/>} label="Button" onClick={()=>add('button')}/><Add icon={<BarChart3/>} label="Metric" onClick={()=>add('metric')}/><Add icon={<Quote/>} label="Callout" onClick={()=>add('callout')}/><Add icon={<Minus/>} label="Divider" onClick={()=>add('divider')}/>{record&&<Add icon={<Database/>} label="Property" onClick={()=>add('property')}/>}</div>}</div>}
    </main>
    {dataOpen&&<DataDrawer database={database} record={record} databases={databases} fields={fields} onClose={()=>setDataOpen(false)} onRecordChange={setRecord}/>} 
  </div>
}

function Add({icon,label,onClick}:{icon:ReactNode;label:string;onClick:()=>void}){return <button onClick={onClick}>{icon}<span>{label}</span></button>}

function Block({block,editing,index,total,databases,record,fields,onMove,onChange,onDelete}:{block:PageBlock;editing:boolean;index:number;total:number;databases:DatabaseType[];record:RecordRow|null;fields:Field[];onMove:(d:-1|1)=>void;onChange:(c:Record<string,unknown>)=>void;onDelete:()=>void}){
 const [config,setConfig]=useState(block.config);useEffect(()=>setConfig(block.config),[block.id,block.config]);const save=(patch:Record<string,unknown>)=>{const next={...config,...patch};setConfig(next);void onChange(next)};const width=(config.width||'full')as Width
 const tools=editing?<div className="atlas-block-tools"><button disabled={index===0} onClick={()=>onMove(-1)}><ArrowUp/></button><button disabled={index===total-1} onClick={()=>onMove(1)}><ArrowDown/></button><button onClick={()=>save({width:width==='full'?'half':width==='half'?'third':'full'})}><Columns2/></button><button onClick={onDelete}><Trash2/></button></div>:null
 if(block.type==='divider')return <section className={`atlas-block width-${width}`}>{tools}<hr/></section>
 if(block.type==='database_view')return <section className={`atlas-block width-${width}`}>{tools}<DatabaseView config={config} editing={editing} databases={databases} save={save}/></section>
 if(block.type==='property')return <section className={`atlas-block property-block width-${width}`}>{tools}<Property config={config} editing={editing} record={record} fields={fields} save={save}/></section>
 if(block.type==='metric')return <section className={`atlas-block metric-block width-${width}`}>{tools}<Metric config={config} editing={editing} databases={databases} save={save}/></section>
 if(block.type==='button')return <section className={`atlas-block button-block width-${width}`}>{tools}<Button config={config} editing={editing} save={save}/></section>
 if(block.type==='image')return <section className={`atlas-block image-block width-${width}`}>{tools}{config.url?<img src={String(config.url)} alt=""/>:<div className="atlas-image-placeholder">Image</div>}{editing&&<input value={String(config.url||'')} placeholder="Image URL" onChange={e=>save({url:e.target.value})}/>}</section>
 const Tag=(block.type==='heading'?'h2':'div')as 'h2'|'div'
 return <section className={`atlas-block ${block.type} width-${width}`}>{tools}<Tag contentEditable={editing} suppressContentEditableWarning className="atlas-editable" onBlur={e=>save({text:e.currentTarget.textContent||''})}>{String(config.text||'')}</Tag></section>
}

function DatabaseView({config,editing,databases,save}:{config:Record<string,unknown>;editing:boolean;databases:DatabaseType[];save:(p:Record<string,unknown>)=>void}){
 const id=String(config.databaseId||'');const [records,setRecords]=useState<RecordRow[]>([]);useEffect(()=>{if(!id){setRecords([]);return}getRecords(id).then(setRecords).catch(console.error)},[id]);const mode=(config.mode||'gallery')as Mode;const shown=records.slice(0,Number(config.limit||12))
 return <div className="atlas-data-view">{editing&&<div className="atlas-data-view-controls"><input value={String(config.title||'')} placeholder="View title" onChange={e=>save({title:e.target.value})}/><select value={id} onChange={e=>save({databaseId:e.target.value})}>{databases.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><div className="atlas-mode-buttons"><button className={mode==='table'?'active':''} onClick={()=>save({mode:'table'})}><List/></button><button className={mode==='gallery'?'active':''} onClick={()=>save({mode:'gallery'})}><LayoutGrid/></button><button className={mode==='board'?'active':''} onClick={()=>save({mode:'board'})}><Rows3/></button></div></div>}{config.title&&<h3>{String(config.title)}</h3>}<Records records={shown} databaseId={id} mode={mode}/></div>
}
function Records({records,databaseId,mode}:{records:RecordRow[];databaseId:string;mode:Mode}){if(!records.length)return <div className="atlas-empty-component">No records yet.</div>;if(mode==='gallery')return <div className="atlas-gallery">{records.map(r=><Link key={r.id} to={`/database/${databaseId}/record/${r.id}`} className="atlas-record-card"><strong>{r.title}</strong><span>Open</span></Link>)}</div>;if(mode==='board')return <div className="atlas-board"><div><b>Records</b>{records.map(r=><Link key={r.id} to={`/database/${databaseId}/record/${r.id}`}>{r.title}</Link>)}</div></div>;return <div className="atlas-table-list">{records.map(r=><Link key={r.id} to={`/database/${databaseId}/record/${r.id}`}><span>{r.title}</span><span>↗</span></Link>)}</div>}

function Property({config,editing,record,fields,save}:{config:Record<string,unknown>;editing:boolean;record:RecordRow|null;fields:Field[];save:(p:Record<string,unknown>)=>void}){
 const fieldId=String(config.fieldId||'');const field=fields.find(f=>f.id===fieldId);const value=fieldId==='__title__'?record?.title:field?record?.data?.[field.id]:'';const label=String(config.label||field?.name||'')
 return <div className={`atlas-property-display ${config.display==='hero'?'hero':''}`}>{editing&&<div className="atlas-inline-config"><select value={fieldId} onChange={e=>save({fieldId:e.target.value})}><option value="__title__">Record title</option>{fields.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><input value={label} placeholder="Label" onChange={e=>save({label:e.target.value})}/></div>}{label&&config.display!=='hero'&&<span>{label}</span>}<strong>{displayValue(value,field)||'Empty'}</strong></div>
}
function Metric({config,editing,databases,save}:{config:Record<string,unknown>;editing:boolean;databases:DatabaseType[];save:(p:Record<string,unknown>)=>void}){const id=String(config.databaseId||'');const[count,setCount]=useState(0);useEffect(()=>{if(id)getRecords(id).then(r=>setCount(r.length)).catch(console.error)},[id]);return <div className="atlas-metric">{editing&&<><input value={String(config.label||'')} onChange={e=>save({label:e.target.value})}/><select value={id} onChange={e=>save({databaseId:e.target.value})}>{databases.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></>}<strong>{count}</strong><span>{String(config.label||'records')}</span></div>}
function Button({config,editing,save}:{config:Record<string,unknown>;editing:boolean;save:(p:Record<string,unknown>)=>void}){return <div className="atlas-button-component">{editing&&<div className="atlas-inline-config"><input value={String(config.label||'')} onChange={e=>save({label:e.target.value})}/><input value={String(config.url||'')} placeholder="URL" onChange={e=>save({url:e.target.value})}/></div>}<a href={String(config.url||'#')} target={config.url?'_blank':undefined} rel="noreferrer">{String(config.label||'Button')}</a></div>}

function DataDrawer({database,record,databases,fields,onClose,onRecordChange}:{database:DatabaseType|null;record:RecordRow|null;databases:DatabaseType[];fields:Field[];onClose:()=>void;onRecordChange:(r:RecordRow)=>void}){
 const [activeDb,setActiveDb]=useState(database?.id||databases[0]?.id||'');const[records,setRecords]=useState<RecordRow[]>([]);const[drawerFields,setDrawerFields]=useState<Field[]>(fields);useEffect(()=>{if(!activeDb)return;Promise.all([getRecords(activeDb),getFields(activeDb)]).then(([r,f])=>{setRecords(r);setDrawerFields(f)}).catch(console.error)},[activeDb]);const saveRecord=async(patch:Partial<RecordRow>)=>{if(!record)return;const updated=await updateRecord(record.id,{title:patch.title??record.title,data:patch.data??record.data});onRecordChange(updated)}
 return <aside className="atlas-data-drawer"><div className="atlas-drawer-head"><div><span>Data</span><strong>{database?.name||'Workspace data'}</strong></div><button onClick={onClose}><X/></button></div>{record&&database?<div className="atlas-record-data"><label>Title<input value={record.title} onChange={e=>onRecordChange({...record,title:e.target.value})} onBlur={()=>saveRecord({title:record.title})}/></label>{fields.map(f=><label key={f.id}>{f.name}<input value={String(record.data?.[f.id]??'')} onChange={e=>onRecordChange({...record,data:{...record.data,[f.id]:e.target.value}})} onBlur={()=>saveRecord({data:record.data})}/></label>)}</div>:<><select value={activeDb} onChange={e=>setActiveDb(e.target.value)}>{databases.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><button className="atlas-new-record" onClick={async()=>{const r=await createRecord(activeDb,'Untitled');setRecords(x=>[r,...x])}}><Plus/>New record</button><div className="atlas-drawer-table">{records.map(r=><Link key={r.id} to={`/database/${activeDb}/record/${r.id}`}>{r.title}</Link>)}</div><div className="atlas-schema-summary"><h4>Properties</h4>{drawerFields.map(f=><div key={f.id}><span>{f.name}</span><small>{f.type}</small></div>)}</div></>}</aside>
}
