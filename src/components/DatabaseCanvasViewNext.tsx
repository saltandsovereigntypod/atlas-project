import { useEffect, useMemo, useState } from 'react'
import { Database, LayoutGrid, List, PanelsTopLeft, Rows3, Sparkles } from 'lucide-react'
import LegacyDatabaseCanvasView from './DatabaseCanvasViewLegacy'
import CanvasCardView, { ensureCanvasCardTemplate } from './CanvasCardView'
import { createRecord, getFields, getRecords, updateRecord } from '../lib/data'
import type { Database as DatabaseType, Field, RecordRow } from '../types'

type Props={blockId:string;config:Record<string,unknown>;editing:boolean;databases:DatabaseType[];save:(patch:Record<string,unknown>)=>void}
type Mode='gallery'|'list'|'rail'|'board'|'table'|'canvas'
const MODES:Array<{id:Mode;label:string;icon:typeof LayoutGrid}>=[{id:'gallery',label:'Gallery',icon:LayoutGrid},{id:'list',label:'List',icon:List},{id:'rail',label:'Rail',icon:Rows3},{id:'board',label:'Board',icon:PanelsTopLeft},{id:'table',label:'Table',icon:Database},{id:'canvas',label:'Canvas Cards',icon:Sparkles}]

export default function DatabaseCanvasViewNext(props:Props){
 const mode=String(props.config.mode||'gallery') as Mode
 return <div className={`db-view-next mode-${mode}`}>
  {props.editing&&<div className="db-view-next-modes">{MODES.map(item=>{const Icon=item.icon;return <button key={item.id} className={mode===item.id?'active':''} onClick={()=>props.save({mode:item.id,recordLayoutMode:'auto'})}><Icon/>{item.label}</button>})}</div>}
  {mode==='canvas'?<CanvasMode {...props}/>:<LegacyDatabaseCanvasView {...props}/>} 
 </div>
}

function CanvasMode({config,editing,databases,save}:Props){
 const databaseId=String(config.databaseId||'')
 const[records,setRecords]=useState<RecordRow[]>([])
 const[fields,setFields]=useState<Field[]>([])
 const[creating,setCreating]=useState(false)
 const reload=async()=>{if(!databaseId){setRecords([]);setFields([]);return}const[r,f]=await Promise.all([getRecords(databaseId),getFields(databaseId)]);setRecords(r);setFields(f)}
 useEffect(()=>{void reload()},[databaseId])
 const filterFieldId=String(config.filterFieldId||''),filterValue=String(config.filterValue||''),sortFieldId=String(config.sortFieldId||''),sortDirection=String(config.sortDirection||'asc')
 const usableFields=fields.filter(field=>field.name.trim().toLowerCase()!=='name')
 const shown=useMemo(()=>{let next=[...records];const filter=usableFields.find(field=>field.id===filterFieldId);if(filter&&filterValue.trim())next=next.filter(record=>match(record.data?.[filter.id],filter.type,filterValue));const sort=usableFields.find(field=>field.id===sortFieldId);if(sort)next.sort((a,b)=>compare(a.data?.[sort.id],b.data?.[sort.id],sort.type)*(sortDirection==='desc'?-1:1));return next.slice(0,Number(config.limit||24))},[records,usableFields,filterFieldId,filterValue,sortFieldId,sortDirection,config.limit])
 const template=ensureCanvasCardTemplate(config.canvasCardTemplate,usableFields)
 const patchRecord=async(record:RecordRow,fieldId:string,value:unknown)=>{const next=await updateRecord(record.id,{data:{...record.data,[fieldId]:value}});setRecords(items=>items.map(item=>item.id===next.id?next:item))}
 const createHere=async()=>{if(!databaseId||creating)return;setCreating(true);try{await createRecord(databaseId,'Untitled');await reload()}finally{setCreating(false)}}
 return <div className="db-canvas-mode">
  {editing&&<div className="db-canvas-mode-settings"><div className="db-canvas-mode-intro"><Sparkles/><div><strong>Canvas Cards</strong><span>Design one freeform card template. Every matching record uses it.</span></div></div><label><span>Records from</span><select value={databaseId} onChange={e=>save({databaseId:e.target.value,filterFieldId:'',filterValue:'',sortFieldId:''})}><option value="">Choose a database…</option>{databases.map(db=><option key={db.id} value={db.id}>{db.name}</option>)}</select></label>{databaseId&&usableFields.length>0&&<><div className="db-inline-row"><label><span>Only show where</span><select value={filterFieldId} onChange={e=>save({filterFieldId:e.target.value,filterValue:''})}><option value="">No filter</option>{usableFields.map(field=><option key={field.id} value={field.id}>{field.name}</option>)}</select></label><label><span>Matches</span><input value={filterValue} disabled={!filterFieldId} onChange={e=>save({filterValue:e.target.value})}/></label></div><div className="db-inline-row"><label><span>Sort by</span><select value={sortFieldId} onChange={e=>save({sortFieldId:e.target.value})}><option value="">Default</option>{usableFields.map(field=><option key={field.id} value={field.id}>{field.name}</option>)}</select></label><label><span>Direction</span><select value={sortDirection} disabled={!sortFieldId} onChange={e=>save({sortDirection:e.target.value})}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label></div><div className="db-use-mode-options"><label><input type="checkbox" checked={Boolean(config.inlineEditing)} onChange={e=>save({inlineEditing:e.target.checked})}/><span><strong>Edit fields in Use mode</strong><small>Change database values directly on the designed card.</small></span></label><label><input type="checkbox" checked={config.allowCreate!==false} onChange={e=>save({allowCreate:e.target.checked})}/><span><strong>Allow quick add</strong><small>Show a New record action underneath this view.</small></span></label></div></>}</div>}
  {!databaseId?<div className="canvas-data-empty"><Database/><strong>Connect a database</strong><span>Canvas Cards stays separate from your data until you choose a source.</span></div>:<CanvasCardView records={shown} fields={usableFields} databaseId={databaseId} editing={editing} template={template} onChangeTemplate={next=>save({canvasCardTemplate:next})} inlineEditing={Boolean(config.inlineEditing)} onPatchField={patchRecord} showCreate={config.allowCreate!==false} onCreate={()=>void createHere()}/>} 
 </div>
}

function match(raw:unknown,type:string,needle:string){const q=needle.toLowerCase();if(Array.isArray(raw))return raw.map(String).some(value=>value.toLowerCase().includes(q));if(type==='checkbox')return (raw?'yes':'no').includes(q);return String(raw??'').toLowerCase().includes(q)}
function compare(a:unknown,b:unknown,type:string){if(type==='number')return Number(a||0)-Number(b||0);if(type==='date')return new Date(String(a||0)).getTime()-new Date(String(b||0)).getTime();if(type==='checkbox')return Number(Boolean(a))-Number(Boolean(b));return String(a??'').localeCompare(String(b??''),undefined,{numeric:true,sensitivity:'base'})}
