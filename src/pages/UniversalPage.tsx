import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Layers, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAppContext } from '../App'
import DatabaseCanvasView from '../components/DatabaseCanvasView'
import EditorSidebar from '../components/EditorSidebar'
import FieldInput from '../components/FieldInput'
import { createField, createPageBlock, createRecord, deleteField, deletePageBlock, getDatabase, getDatabases, getFields, getOrCreateContextPage, getPage, getPageBlocks, getRecord, getRecords, updateField, updatePage, updatePageBlock, updateRecord } from '../lib/data'
import { displayValue } from '../lib/value'
import type { Database as DatabaseType, Field, FieldType, Page, PageBlock, PageBlockType, RecordRow } from '../types'

type Kind = 'home' | 'page' | 'database' | 'record'
type BlockPatch = Record<string, unknown>
const DEFAULT_CANVAS_HEIGHT = 1100

export default function UniversalPage({ kind }: { kind: Kind }) {
  const params = useParams()
  const { workspace, user } = useAppContext()
  const [page, setPage] = useState<Page | null>(null)
  const [blocks, setBlocks] = useState<PageBlock[]>([])
  const [databases, setDatabases] = useState<DatabaseType[]>([])
  const [database, setDatabase] = useState<DatabaseType | null>(null)
  const [record, setRecord] = useState<RecordRow | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [editing, setEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dataOpen, setDataOpen] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const all = await getDatabases(workspace.id)
      setDatabases(all)
      let p: Page
      let db: DatabaseType | null = null
      let rec: RecordRow | null = null
      if (kind === 'home') p = await getOrCreateContextPage(workspace.id, 'home', 'Home', { icon: '✦' })
      else if (kind === 'page') p = await getPage(params.pageId || '')
      else if (kind === 'database') { db = await getDatabase(params.databaseId || ''); p = await getOrCreateContextPage(workspace.id, 'database', db.name, { databaseId: db.id, icon: db.icon || '✦' }) }
      else { db = await getDatabase(params.databaseId || ''); rec = await getRecord(params.recordId || ''); p = await getOrCreateContextPage(workspace.id, 'record', rec.title, { databaseId: db.id, recordId: rec.id, icon: db.icon || '✦' }) }
      setDatabase(db); setRecord(rec); setFields(db ? await getFields(db.id) : []); setPage(p); setBlocks(await getPageBlocks(p.id))
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }
  useEffect(() => { void load() }, [workspace.id, kind, params.pageId, params.databaseId, params.recordId])
  useEffect(() => () => document.body.classList.remove('atlas-editing'), [])
  useEffect(() => { document.body.classList.toggle('atlas-editing', editing); return () => document.body.classList.remove('atlas-editing') }, [editing])

  const selected = useMemo(() => blocks.find(b => b.id === selectedId) || null, [blocks, selectedId])
  const canvasHeight = Math.max(600, Number(page?.settings?.canvasHeight || DEFAULT_CANVAS_HEIGHT))
  const showTitle = page?.settings?.showTitle !== false

  const savePagePatch = async (patch: Partial<Page>) => { if (!page) return; const next = { ...page, ...patch }; setPage(next); await updatePage(page.id, patch) }
  const savePageSettings = async (patch: BlockPatch) => { if (!page) return; const settings = { ...page.settings, ...patch }; setPage({ ...page, settings }); await updatePage(page.id, { settings }) }
  const saveBlockPatch = async (id: string, patch: BlockPatch) => {
    const current = blocks.find(b => b.id === id); if (!current) return
    const config = { ...current.config, ...patch }
    setBlocks(items => items.map(b => b.id === id ? { ...b, config } : b))
    const updated = await updatePageBlock(id, { config })
    setBlocks(items => items.map(b => b.id === id ? updated : b))
  }
  const deleteBlock = async (id: string) => { await deletePageBlock(id); setBlocks(items => items.filter(b => b.id !== id)); if (selectedId === id) setSelectedId(null) }

  const addBlock = async (type: PageBlockType) => {
    if (!page) return
    const offset = blocks.length % 8
    let config: BlockPatch = { x: 60 + offset * 30, y: 90 + offset * 30, width: type === 'database_view' || type === 'section' ? 700 : 320, height: type === 'image' ? 280 : type === 'database_view' ? 390 : type === 'section' ? 320 : 140, rotation: 0, zIndex: blocks.length + 1, background: 'transparent', textColor: '#211e1a', radius: 0, padding: 0 }
    if (type === 'heading') config = { ...config, text: 'New heading', fontSize: 42, fontWeight: 600, fontFamily: 'Georgia, serif', lineHeight: 1.1, letterSpacing: 0, textAlign: 'left' }
    if (type === 'text') config = { ...config, text: 'Start writing…', fontSize: 17, fontWeight: 400, fontFamily: 'Georgia, serif', lineHeight: 1.5, letterSpacing: 0, textAlign: 'left' }
    if (type === 'callout') config = { ...config, text: 'Add a note…', background: '#f0ebe3', padding: 18, radius: 14, fontSize: 17, fontFamily: 'Georgia, serif' }
    if (type === 'image') config = { ...config, url: '', fit: 'cover', radius: 14 }
    if (type === 'button') config = { ...config, label: 'Button', url: '', background: '#24211d', textColor: '#ffffff', width: 180, height: 60, radius: 12 }
    if (type === 'database_view') config = { ...config, databaseId: database?.id || databases[0]?.id || '', mode: 'gallery', recordLayoutMode: 'auto', title: '', limit: 12, padding: 0 }
    if (type === 'property') config = { ...config, fieldId: '__title__', label: '', display: 'default' }
    if (type === 'metric') config = { ...config, label: 'Total', databaseId: database?.id || databases[0]?.id || '', width: 220, height: 130 }
    if (type === 'progress') config = { ...config, label: 'Progress', fieldId: fields.find(f => f.type === 'number')?.id || '', value: 50, max: 100, width: 360, height: 100 }
    if (type === 'divider') config = { ...config, width: 420, height: 28 }
    if (type === 'section') config = { ...config, title: 'Structured section', background: '#ffffff', border: '#ded6cb', radius: 20, padding: 24 }
    const created = await createPageBlock(page.id, type, blocks.length, config)
    setBlocks(items => [...items, created]); setSelectedId(created.id)
  }

  if (error) return <div className="atlas-error"><h2>Atlas could not open this page</h2><p>{error}</p></div>
  if (!page) return <div className="atlas-loading"><div className="spinner"/><p>Opening page…</p></div>
  const host = typeof document !== 'undefined' ? document.getElementById('atlas-editor-sidebar-host') : null

  return <div className={`atlas-page canvas-first ${editing ? 'is-editing' : ''}`} style={{ background: String(page.settings?.background || '#fbfaf7'), color: String(page.settings?.textColor || '#211e1a') }}>
    <header className="canvas-topbar"><div className="canvas-breadcrumb">{kind === 'home' ? 'Dashboard' : kind === 'database' ? database?.name : kind === 'record' ? `${database?.name} / ${record?.title}` : page.title}</div><div className="canvas-topbar-actions"><button className={`canvas-toolbar-button ${editing ? 'done' : 'edit'}`} onClick={() => { setEditing(v => !v); setSelectedId(null) }}><Pencil/>{editing ? 'Done' : 'Edit'}</button></div></header>
    {page.cover && <div className="canvas-page-cover" style={{ backgroundImage: `url(${page.cover})` }}/>} 
    <main className="canvas-stage-wrap">
      {showTitle && <div className="canvas-page-meta"><button className="canvas-page-icon" disabled={!editing}>{page.icon || '✦'}</button><input className="canvas-page-title" value={page.title} readOnly={!editing} onChange={e => setPage({ ...page, title: e.target.value })} onBlur={() => updatePage(page.id, { title: page.title })}/></div>}
      <div className="true-canvas" style={{ height: canvasHeight }} onPointerDown={e => { if (e.currentTarget === e.target) setSelectedId(null) }}>
        {blocks.map(block => <CanvasBlock key={block.id} block={block} editing={editing} selected={selectedId === block.id} databases={databases} record={record} fields={fields} onSelect={() => setSelectedId(block.id)} onSave={patch => saveBlockPatch(block.id, patch)} onDelete={() => deleteBlock(block.id)} />)}
        {!blocks.length && !editing && <div className="canvas-empty-view"><span>This page is yours.</span><small>Click Edit to start creating.</small></div>}
        {!blocks.length && editing && <button className="canvas-empty-add" onClick={() => addBlock('heading')}><Plus/>Add your first element</button>}
      </div>
    </main>
    {editing && host && createPortal(<EditorSidebar workspaceId={workspace.id} userId={user.id} page={page} selected={selected} databases={databases} database={database} record={record} fields={fields} onAdd={addBlock} onSaveBlock={saveBlockPatch} onDeleteBlock={deleteBlock} onSavePage={savePagePatch} onSavePageSettings={savePageSettings} onOpenData={() => setDataOpen(true)} onDone={() => { setEditing(false); setSelectedId(null) }}/>, host)}
    {dataOpen && <DataDrawer database={database} record={record} databases={databases} fields={fields} onClose={() => setDataOpen(false)} onRecordChange={setRecord} onFieldsChange={setFields}/>} 
  </div>
}

function CanvasBlock({ block, editing, selected, databases, record, fields, onSelect, onSave, onDelete }: { block: PageBlock; editing: boolean; selected: boolean; databases: DatabaseType[]; record: RecordRow | null; fields: Field[]; onSelect: () => void; onSave: (patch: BlockPatch) => void; onDelete: () => void }) {
  const [config, setConfig] = useState<BlockPatch>(block.config)
  useEffect(() => setConfig(block.config), [block.config])
  const commit = (patch: BlockPatch) => { const next = { ...config, ...patch }; setConfig(next); onSave(patch) }
  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editing || (event.target as HTMLElement).closest('button,input,textarea,select,a,.resize-handle,.db-canvas-view')) return
    event.preventDefault(); onSelect()
    const startX=event.clientX,startY=event.clientY,originX=Number(config.x||0),originY=Number(config.y||0),target=event.currentTarget;target.setPointerCapture(event.pointerId)
    const move=(e:PointerEvent)=>setConfig(c=>({...c,x:Math.max(0,originX+e.clientX-startX),y:Math.max(0,originY+e.clientY-startY)}))
    const up=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',up);setConfig(c=>{onSave({x:c.x,y:c.y});return c})};target.addEventListener('pointermove',move);target.addEventListener('pointerup',up)
  }
  const resize=(event:ReactPointerEvent<HTMLButtonElement>)=>{event.preventDefault();event.stopPropagation();onSelect();const sx=event.clientX,sy=event.clientY,ow=Number(config.width||320),oh=Number(config.height||140),target=event.currentTarget;target.setPointerCapture(event.pointerId);const move=(e:PointerEvent)=>setConfig(c=>({...c,width:Math.max(70,ow+e.clientX-sx),height:Math.max(35,oh+e.clientY-sy)}));const up=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',up);setConfig(c=>{onSave({width:c.width,height:c.height});return c})};target.addEventListener('pointermove',move);target.addEventListener('pointerup',up)}
  const rotation=Number(config.rotation||0)
  const style:CSSProperties={left:Number(config.x||0),top:Number(config.y||0),width:Number(config.width||320),height:Number(config.height||140),zIndex:Number(config.zIndex||1),transform:rotation?`rotate(${rotation}deg)`:undefined,background:String(config.background||'transparent'),color:String(config.textColor||'inherit'),borderRadius:Number(config.radius||0),padding:Number(config.padding||0),border:config.border?`1px solid ${String(config.border)}`:undefined}
  return <div className={`canvas-element ${selected?'selected':''} type-${block.type}`} style={style} onPointerDown={drag} onClick={e=>{if(editing){e.stopPropagation();onSelect()}}}>
    {editing&&selected&&<><div className="canvas-drag-cue"><Layers/></div><button className="canvas-delete-cue" onClick={e=>{e.stopPropagation();void onDelete()}}><Trash2/></button></>}
    <BlockContent block={block} config={config} editing={editing} databases={databases} record={record} fields={fields} save={commit}/>
    {editing&&selected&&<button className="resize-handle" onPointerDown={resize} aria-label="Resize"/>}
  </div>
}

function BlockContent({ block, config, editing, databases, record, fields, save }: { block: PageBlock; config: BlockPatch; editing: boolean; databases: DatabaseType[]; record: RecordRow | null; fields: Field[]; save: (patch: BlockPatch) => void }) {
  if (block.type === 'heading' || block.type === 'text' || block.type === 'callout') { const Tag=block.type==='heading'?'h2':'div'; return <Tag className="canvas-editable-text" contentEditable={editing} suppressContentEditableWarning style={{fontSize:Number(config.fontSize||17),fontWeight:Number(config.fontWeight||400),fontFamily:String(config.fontFamily||'Georgia, serif'),lineHeight:Number(config.lineHeight||1.2),letterSpacing:Number(config.letterSpacing||0),textAlign:String(config.textAlign||'left') as CSSProperties['textAlign']}} onBlur={e=>save({text:e.currentTarget.textContent||''})}>{String(config.text||'')}</Tag> }
  if (block.type === 'image') return config.url?<img className="canvas-image" src={String(config.url)} alt="" style={{objectFit:String(config.fit||'cover') as CSSProperties['objectFit']}}/>:<div className="canvas-image-placeholder"><span>Add an image from the Assets panel</span></div>
  if (block.type === 'button') return <a className="canvas-action-button" href={editing?undefined:String(config.url||'#')} onClick={editing?e=>e.preventDefault():undefined}>{String(config.label||'Button')}</a>
  if (block.type === 'divider') return <div className="canvas-divider"/>
  if (block.type === 'database_view') return <DatabaseCanvasView blockId={block.id} config={config} editing={editing} databases={databases} save={save}/>
  if (block.type === 'property') return <PropertyDisplay config={config} record={record} fields={fields}/>
  if (block.type === 'metric') return <MetricDisplay config={config}/>
  if (block.type === 'progress') return <ProgressDisplay config={config} record={record} fields={fields}/>
  if (block.type === 'section') return <div className="structured-section"><span className="structured-kicker">SECTION</span><strong>{String(config.title||'Structured section')}</strong><p>Responsive content can live here while the rest of the page stays freeform.</p></div>
  return null
}

function PropertyDisplay({config,record,fields}:{config:BlockPatch;record:RecordRow|null;fields:Field[]}){if(!record)return <div className="canvas-data-empty">This element needs a record page.</div>;const id=String(config.fieldId||'__title__'),field=fields.find(f=>f.id===id),value=id==='__title__'?record.title:field?record.data?.[field.id]:'',label=String(config.label||field?.name||'');return <div className="canvas-property">{label&&<span>{label}</span>}<strong>{displayValue(value,field)||'Empty'}</strong></div>}
function MetricDisplay({config}:{config:BlockPatch}){const databaseId=String(config.databaseId||'');const[count,setCount]=useState(0);useEffect(()=>{if(!databaseId){setCount(0);return}getRecords(databaseId).then(r=>setCount(r.length)).catch(console.error)},[databaseId]);return <div className="canvas-metric"><strong>{count}</strong><span>{String(config.label||'records')}</span></div>}
function ProgressDisplay({config,record,fields}:{config:BlockPatch;record:RecordRow|null;fields:Field[]}){const field=fields.find(f=>f.id===String(config.fieldId||'')),raw=field&&record?Number(record.data?.[field.id]||0):Number(config.value||0),max=Math.max(1,Number(config.max||100)),percent=Math.max(0,Math.min(100,(raw/max)*100));return <div className="canvas-progress"><div><span>{String(config.label||'Progress')}</span><strong>{Math.round(raw)} / {max}</strong></div><div className="canvas-progress-track"><div style={{width:`${percent}%`}}/></div></div>}

function DataDrawer({ database, record, databases, fields, onClose, onRecordChange, onFieldsChange }: { database: DatabaseType | null; record: RecordRow | null; databases: DatabaseType[]; fields: Field[]; onClose: () => void; onRecordChange: (record: RecordRow) => void; onFieldsChange: (fields: Field[]) => void }) {
  const [activeDb,setActiveDb]=useState(database?.id||databases[0]?.id||'');const[records,setRecords]=useState<RecordRow[]>([]);const[drawerFields,setDrawerFields]=useState<Field[]>(fields);const[tab,setTab]=useState<'records'|'properties'>('records');const[newFieldName,setNewFieldName]=useState('');const[newFieldType,setNewFieldType]=useState<FieldType>('text')
  const refresh=async()=>{if(!activeDb)return;const[nextRecords,nextFields]=await Promise.all([getRecords(activeDb),getFields(activeDb)]);setRecords(nextRecords);setDrawerFields(nextFields);if(database?.id===activeDb)onFieldsChange(nextFields)};useEffect(()=>{void refresh()},[activeDb])
  const saveCurrentRecord=async(patch:Partial<RecordRow>)=>{if(!record)return;onRecordChange(await updateRecord(record.id,{title:patch.title??record.title,data:patch.data??record.data}))}
  return <aside className="canvas-data-drawer"><div className="data-drawer-head"><div><span>DATA</span><strong>{record?record.title:databases.find(d=>d.id===activeDb)?.name||'Workspace data'}</strong></div><button onClick={onClose}><X/></button></div>{record&&database?<div className="record-data-editor"><label>Title<input value={record.title} onChange={e=>onRecordChange({...record,title:e.target.value})} onBlur={()=>saveCurrentRecord({title:record.title})}/></label>{fields.map(field=><label key={field.id}>{field.name}<FieldInput field={field} value={record.data?.[field.id]} onChange={value=>onRecordChange({...record,data:{...record.data,[field.id]:value}})}/><button className="save-field-value" onClick={()=>saveCurrentRecord({data:record.data})}>Save</button></label>)}</div>:<><select className="data-source-select" value={activeDb} onChange={e=>setActiveDb(e.target.value)}>{databases.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><div className="data-tabs"><button className={tab==='records'?'active':''} onClick={()=>setTab('records')}>Records</button><button className={tab==='properties'?'active':''} onClick={()=>setTab('properties')}>Properties</button></div>{tab==='records'?<div className="data-records-panel"><button className="data-primary-button" onClick={async()=>{const created=await createRecord(activeDb,'Untitled');setRecords(c=>[created,...c])}}><Plus/>New record</button>{records.map(item=><Link key={item.id} to={`/database/${activeDb}/record/${item.id}`}>{item.title}<span>Open</span></Link>)}</div>:<div className="data-properties-panel"><div className="new-property-row"><input placeholder="Property name" value={newFieldName} onChange={e=>setNewFieldName(e.target.value)}/><select value={newFieldType} onChange={e=>setNewFieldType(e.target.value as FieldType)}>{fieldTypes.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}</select><button onClick={async()=>{if(!newFieldName.trim())return;await createField(activeDb,{name:newFieldName.trim(),type:newFieldType,required:false,config:{}},drawerFields.length);setNewFieldName('');await refresh()}}><Plus/></button></div>{drawerFields.map(field=><div className="property-row" key={field.id}><input value={field.name} onChange={e=>setDrawerFields(c=>c.map(i=>i.id===field.id?{...i,name:e.target.value}:i))} onBlur={async e=>{await updateField(field.id,{name:e.target.value});await refresh()}}/><select value={field.type} onChange={async e=>{await updateField(field.id,{type:e.target.value as FieldType});await refresh()}}>{fieldTypes.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}</select><button className="danger" onClick={async()=>{await deleteField(field.id);await refresh()}}><Trash2/></button></div>)}</div>}</>}</aside>
}
const fieldTypes:FieldType[]=['text','long_text','number','date','checkbox','select','multi_select','url','image','relation']
