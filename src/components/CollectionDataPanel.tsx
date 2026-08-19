import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Database as DatabaseIcon, Plus, Sparkles, Trash2, WandSparkles } from 'lucide-react'
import FriendlyRecordForm from './FriendlyRecordForm'
import { createDatabase, createField, deleteField, getFields, updateField } from '../lib/data'
import type { Database, Field, FieldType, Page } from '../types'

type Props = { page:Page; database:Database|null; databases:Database[]; onOpenData:()=>void }
type Suggestion = { name:string; type:FieldType; note?:string }

const TYPES:Array<{value:FieldType;label:string;help:string}> = [
 {value:'text',label:'Short text',help:'Names, labels, authors, locations'},
 {value:'long_text',label:'Long text',help:'Descriptions, notes, journal entries'},
 {value:'number',label:'Number',help:'Money, ratings, counts, quantities'},
 {value:'date',label:'Date',help:'Release dates, deadlines, reading dates'},
 {value:'checkbox',label:'Checkbox',help:'Done, paid, reread, packed'},
 {value:'select',label:'Single choice',help:'Status, category, mood, type'},
 {value:'multi_select',label:'Multiple choices',help:'Genres, ingredients, tags, correspondences'},
 {value:'url',label:'Link',help:'Published links, bookings, references'},
 {value:'image',label:'Image',help:'Covers, artwork, receipts, photos'},
 {value:'relation',label:'Connection',help:'Connect this to records in another collection'},
]

const BASE:Suggestion[]=[
 {name:'Description',type:'long_text'},{name:'Date',type:'date'},{name:'Status',type:'select'},{name:'Category',type:'select'},
 {name:'Notes',type:'long_text'},{name:'Tags',type:'multi_select'},{name:'Image',type:'image'},{name:'URL',type:'url'},
]
const BOOKS:Suggestion[]=[
 {name:'Author',type:'text'},{name:'Reading status',type:'select'},{name:'Rating',type:'number'},{name:'Genre',type:'multi_select'},
 {name:'Cover',type:'image'},{name:'Release date',type:'date'},{name:'Started reading',type:'date'},{name:'Finished reading',type:'date'},
 {name:'Started rereading',type:'date'},{name:'Times read',type:'number'},{name:'Description',type:'long_text'},{name:'Favorite',type:'checkbox'},
]
const EPISODES:Suggestion[]=[
 {name:'Status',type:'select'},{name:'Guest',type:'text'},{name:'Episode number',type:'number'},{name:'Record date',type:'date'},
 {name:'Publish date',type:'date'},{name:'Show notes',type:'long_text'},{name:'Description',type:'long_text'},{name:'Published URL',type:'url'},
 {name:'Recorded',type:'checkbox'},{name:'Edited',type:'checkbox'},
]
const MONEY:Suggestion[]=[
 {name:'Amount',type:'number'},{name:'Type',type:'select'},{name:'Category',type:'select'},{name:'Date',type:'date'},
 {name:'Account',type:'select'},{name:'Paid',type:'checkbox'},{name:'Recurring',type:'checkbox'},{name:'Merchant',type:'text'},
 {name:'Notes',type:'long_text'},{name:'Receipt',type:'image'},
]
const WITCHY:Suggestion[]=[
 {name:'Type',type:'select'},{name:'Date',type:'date'},{name:'Moon cycle',type:'select'},{name:'Intent',type:'long_text'},
 {name:'Ingredients',type:'multi_select'},{name:'Correspondences',type:'multi_select'},{name:'Deity',type:'text'},{name:'Result',type:'long_text'},
 {name:'Money spent',type:'number'},{name:'Image',type:'image'},
]
const TRAVEL:Suggestion[]=[
 {name:'Destination',type:'text'},{name:'Start date',type:'date'},{name:'End date',type:'date'},{name:'Status',type:'select'},
 {name:'Budget',type:'number'},{name:'Money spent',type:'number'},{name:'Booking URL',type:'url'},{name:'Cover',type:'image'},
 {name:'Notes',type:'long_text'},{name:'Packed',type:'checkbox'},
]
const TASKS:Suggestion[]=[
 {name:'Status',type:'select'},{name:'Due date',type:'date'},{name:'Priority',type:'select'},{name:'Project',type:'text'},
 {name:'Done',type:'checkbox'},{name:'Notes',type:'long_text'},
]

function suggestionsFor(name:string){const n=name.toLowerCase();if(/book|read|library|tbr/.test(n))return BOOKS;if(/episode|podcast/.test(n))return EPISODES;if(/transaction|budget|expense|bill|saving|money|finance/.test(n))return MONEY;if(/grimoire|spell|ritual|witch|altar|divination/.test(n))return WITCHY;if(/trip|travel|itinerary/.test(n))return TRAVEL;if(/task|project|todo|to-do/.test(n))return TASKS;return BASE}
function typeLabel(type:FieldType){return TYPES.find(item=>item.value===type)?.label||type}

export default function CollectionDataPanel({page,database,databases,onOpenData}:Props){
 const [activeId,setActiveId]=useState(database?.id||databases[0]?.id||''),[fields,setFields]=useState<Field[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[newName,setNewName]=useState(''),[newType,setNewType]=useState<FieldType>('text'),[showBuilder,setShowBuilder]=useState(false),[newCollection,setNewCollection]=useState('')
 useEffect(()=>{if(database?.id)setActiveId(database.id)},[database?.id])
 const active=databases.find(item=>item.id===activeId)||database||null
 const refreshFields=async()=>{if(!active?.id){setFields([]);return}try{setFields(await getFields(active.id))}catch(e){setError(e instanceof Error?e.message:String(e))}}
 useEffect(()=>{void refreshFields()},[active?.id])
 const editableFields=useMemo(()=>fields.filter(field=>field.name.trim().toLowerCase()!=='name'),[fields])
 const suggestions=useMemo(()=>suggestionsFor(active?.name||''),[active?.name])
 const existing=useMemo(()=>new Set(editableFields.map(f=>f.name.trim().toLowerCase())),[editableFields])
 const missing=suggestions.filter(item=>!existing.has(item.name.toLowerCase()))
 const refreshPage=async()=>{const fn=(window as typeof window&{__atlasRefreshPage?:()=>Promise<void>|void}).__atlasRefreshPage;if(fn)await fn()}
 const addField=async(name:string,type:FieldType)=>{if(!active||!name.trim())return;setBusy(true);setError('');setNotice('');try{await createField(active.id,{name:name.trim(),type,required:false,config:{}},fields.length);setNewName('');await refreshFields();setNotice(`${name.trim()} added to ${active.name}.`) }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 const createSuggested=async()=>{if(!active||!missing.length)return;setBusy(true);setError('');try{let position=fields.length;for(const field of missing){await createField(active.id,{name:field.name,type:field.type,required:false,config:{}},position++);}await refreshFields();setNotice(`Added ${missing.length} suggested field${missing.length===1?'':'s'}. You can rename, change, or delete any of them.`)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 const createCollection=async()=>{if(!newCollection.trim())return;setBusy(true);setError('');try{const created=await createDatabase(page.workspace_id,newCollection.trim());setActiveId(created.id);setNewCollection('');await refreshPage();setNotice(`${created.name} is ready. Choose what it should track below.`)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 return <div className="collection-data-panel">
  <div className="atlas-binding-identity"><small>{database?'COLLECTION DATA':'WORKSPACE DATA'}</small><strong>{active?.name||'Your collections'}</strong><span>{active?`Anything entered in this panel becomes real ${active.name} data. Canvas text and decoration do not.`:'Create or choose a collection to start tracking reusable information.'}</span></div>
  <label className="collection-picker"><span>Working with</span><select value={activeId} onChange={e=>setActiveId(e.target.value)}><option value="">Choose a collection</option>{databases.map(db=><option key={db.id} value={db.id}>{db.name}</option>)}</select></label>
  {!active&&<div className="collection-create-inline"><input value={newCollection} onChange={e=>setNewCollection(e.target.value)} placeholder="What do you want to track?"/><button disabled={busy||!newCollection.trim()} onClick={()=>void createCollection()}><Plus/>Create collection</button></div>}
  {active&&<>
   <section className="data-panel-section quick-add-section"><div className="data-panel-heading"><Sparkles/><div><strong>Quick add</strong><span>Atlas reads the fields in {active.name} and builds this form automatically.</span></div></div><FriendlyRecordForm database={active} compact onSaved={refreshPage}/></section>
   <section className="data-panel-section schema-section"><div className="data-panel-heading"><DatabaseIcon/><div><strong>What does {active.name} track?</strong><span>Every record has one built-in title/name. Add any other information you want below.</span></div></div>
    <div className="schema-built-in"><span><strong>Title / Name</strong><small>Built in · required</small></span></div>
    {missing.length>0&&<div className="schema-suggestions"><div><WandSparkles/><span><strong>Suggested for {active.name}</strong><small>Use all of these, pick a few, or ignore them completely.</small></span></div><div className="schema-chip-list">{missing.map(item=><button key={item.name} disabled={busy} onClick={()=>void addField(item.name,item.type)}><Plus/>{item.name}<small>{typeLabel(item.type)}</small></button>)}</div><button className="schema-add-all" disabled={busy} onClick={()=>void createSuggested()}><WandSparkles/>Add all suggestions</button></div>}
    <div className="schema-existing">{editableFields.map(field=><FieldRow key={field.id} field={field} onChanged={refreshFields}/>)}</div>
    <button className="schema-builder-toggle" onClick={()=>setShowBuilder(v=>!v)}><Plus/>Add your own field<ChevronDown className={showBuilder?'open':''}/></button>
    {showBuilder&&<div className="schema-builder"><label><span>Field name</span><input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Started rereading, Moon cycle, Money spent…"/></label><label><span>What kind of information?</span><select value={newType} onChange={e=>setNewType(e.target.value as FieldType)}>{TYPES.map(type=><option key={type.value} value={type.value}>{type.label} · {type.help}</option>)}</select></label><button disabled={busy||!newName.trim()} onClick={()=>void addField(newName,newType)}><Plus/>Add field</button></div>}
    <button className="open-raw-data" onClick={onOpenData}><DatabaseIcon/>Open all {active.name} records</button>
   </section>
  </>}
  {notice&&<p className="data-panel-notice"><Check/>{notice}</p>}{error&&<p className="atlas-asset-error">{error}</p>}
 </div>
}

function FieldRow({field,onChanged}:{field:Field;onChanged:()=>Promise<void>}){const [name,setName]=useState(field.name),[type,setType]=useState<FieldType>(field.type),[busy,setBusy]=useState(false);useEffect(()=>{setName(field.name);setType(field.type)},[field.id,field.name,field.type]);const saveName=async()=>{const next=name.trim();if(!next||next===field.name)return;setBusy(true);try{await updateField(field.id,{name:next});await onChanged()}finally{setBusy(false)}};const changeType=async(next:FieldType)=>{setType(next);setBusy(true);try{await updateField(field.id,{type:next});await onChanged()}finally{setBusy(false)}};return <div className="schema-field-row"><div className="schema-field-main"><input value={name} disabled={busy} onChange={e=>setName(e.target.value)} onBlur={()=>void saveName()} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/><select value={type} disabled={busy} onChange={e=>void changeType(e.target.value as FieldType)}>{TYPES.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></div><label className="schema-required"><input type="checkbox" checked={field.required} disabled={busy} onChange={async e=>{setBusy(true);try{await updateField(field.id,{required:e.target.checked});await onChanged()}finally{setBusy(false)}}}/>Required</label><button className="schema-delete" title={`Delete ${field.name}`} disabled={busy} onClick={async()=>{if(!window.confirm(`Delete “${field.name}”? Existing values for this field will no longer be shown.`))return;setBusy(true);try{await deleteField(field.id);await onChanged()}finally{setBusy(false)}}}><Trash2/></button></div>}
