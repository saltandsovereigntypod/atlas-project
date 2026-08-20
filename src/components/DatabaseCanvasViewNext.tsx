import { useEffect, useMemo, useState } from 'react'
import { Database } from 'lucide-react'
import LegacyDatabaseCanvasView from './DatabaseCanvasViewLegacy'
import CanvasCardView, { ensureCanvasCardTemplate } from './CanvasCardView'
import { createRecord, getFields, getRecords, updateRecord } from '../lib/data'
import type { Database as DatabaseType, Field, RecordRow } from '../types'

type Props={blockId:string;config:Record<string,unknown>;editing:boolean;databases:DatabaseType[];save:(patch:Record<string,unknown>)=>void}
type Mode='gallery'|'list'|'rail'|'board'|'table'|'canvas'

export default function DatabaseCanvasViewNext(props:Props){
 const mode=String(props.config.mode||'gallery') as Mode
 return <div className={`db-view-next mode-${mode}`}>
  {mode==='canvas'?<CanvasMode {...props}/>:<LegacyDatabaseCanvasView {...props}/>} 
 </div>
}

function CanvasMode({config,editing,save}:Props){
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
  {!databaseId?<div className="canvas-data-empty"><Database/><strong>Connect a database</strong><span>Select this view and choose a collection from the editor sidebar.</span></div>:<CanvasCardView records={shown} fields={usableFields} databaseId={databaseId} editing={editing} template={template} onChangeTemplate={next=>save({canvasCardTemplate:next})} inlineEditing={Boolean(config.inlineEditing)} onPatchField={patchRecord} showCreate={config.allowCreate!==false} onCreate={()=>void createHere()} selectedElementId={String(config.canvasCardSelectedElementId||'__card__')} onSelectElement={id=>save({canvasCardSelectedElementId:id})}/>} 
 </div>
}

function match(raw:unknown,type:string,needle:string){const q=needle.toLowerCase();if(Array.isArray(raw))return raw.map(String).some(value=>value.toLowerCase().includes(q));if(type==='checkbox')return (raw?'yes':'no').includes(q);return String(raw??'').toLowerCase().includes(q)}
function compare(a:unknown,b:unknown,type:string){if(type==='number')return Number(a||0)-Number(b||0);if(type==='date')return new Date(String(a||0)).getTime()-new Date(String(b||0)).getTime();if(type==='checkbox')return Number(Boolean(a))-Number(Boolean(b));return String(a??'').localeCompare(String(b??''),undefined,{numeric:true,sensitivity:'base'})}
