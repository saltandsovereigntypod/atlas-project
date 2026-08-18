import { useMemo, useState } from 'react'
import { Database as DatabaseIcon, LayoutTemplate, Plus, Search, Sparkles } from 'lucide-react'
import { createDatabase, createField, createPageBlock, deletePageBlock, updatePage } from '../lib/data'
import { PAGE_TEMPLATES, resolveTemplateConfig, type TemplateCategory } from '../lib/templates'
import type { Database, FieldType, Page, PageBlock } from '../types'

type Props = { page:Page; blocks:PageBlock[]; databases:Database[]; database:Database|null }
const categories:Array<'All'|TemplateCategory>=['All','Witchy','Books','Budget','Podcast','Travel','Boards']

type SourcePreset={id:string;name:string;description:string;icon:string;fields:Array<{name:string;type:FieldType}>}
const SOURCE_PRESETS:SourcePreset[]=[
  {id:'blank',name:'Blank collection',icon:'✦',description:'Start simple and add only what you need.',fields:[]},
  {id:'books',name:'Books & reading',icon:'📚',description:'A flexible library for books, TBRs, ratings, covers, and reading status.',fields:[{name:'Author',type:'text'},{name:'Status',type:'select'},{name:'Rating',type:'number'},{name:'Genre',type:'multi_select'},{name:'Cover',type:'image'},{name:'Started',type:'date'},{name:'Finished',type:'date'},{name:'Notes',type:'long_text'}]},
  {id:'budget',name:'Budget & transactions',icon:'$',description:'Track spending, income, bills, categories, accounts, and notes.',fields:[{name:'Amount',type:'number'},{name:'Type',type:'select'},{name:'Category',type:'select'},{name:'Date',type:'date'},{name:'Account',type:'select'},{name:'Paid',type:'checkbox'},{name:'Notes',type:'long_text'}]},
  {id:'grimoire',name:'Grimoire',icon:'☾',description:'A home for rituals, spells, correspondences, results, and reflections.',fields:[{name:'Type',type:'select'},{name:'Date',type:'date'},{name:'Intent',type:'long_text'},{name:'Correspondences',type:'multi_select'},{name:'Result',type:'long_text'},{name:'Image',type:'image'}]},
  {id:'journal',name:'Journal',icon:'✎',description:'Entries with dates, moods, tags, images, and long-form reflection.',fields:[{name:'Date',type:'date'},{name:'Mood',type:'select'},{name:'Tags',type:'multi_select'},{name:'Entry',type:'long_text'},{name:'Image',type:'image'}]},
  {id:'podcast',name:'Podcast episodes',icon:'◉',description:'Manage episodes from idea through recording, editing, and publishing.',fields:[{name:'Status',type:'select'},{name:'Guest',type:'text'},{name:'Record date',type:'date'},{name:'Publish date',type:'date'},{name:'Episode number',type:'number'},{name:'Show notes',type:'long_text'},{name:'Published URL',type:'url'}]},
  {id:'tasks',name:'Tasks & projects',icon:'✓',description:'A useful task collection for any dashboard or project page.',fields:[{name:'Status',type:'select'},{name:'Due date',type:'date'},{name:'Priority',type:'select'},{name:'Project',type:'text'},{name:'Done',type:'checkbox'},{name:'Notes',type:'long_text'}]},
  {id:'travel',name:'Trips & travel',icon:'✈',description:'Track destinations, dates, bookings, budgets, places, and memories.',fields:[{name:'Destination',type:'text'},{name:'Start date',type:'date'},{name:'End date',type:'date'},{name:'Status',type:'select'},{name:'Budget',type:'number'},{name:'Booking URL',type:'url'},{name:'Cover',type:'image'},{name:'Notes',type:'long_text'}]},
]

export default function TemplatePanel({page,blocks,databases,database}:Props){
  const[category,setCategory]=useState<(typeof categories)[number]>('All')
  const[query,setQuery]=useState('')
  const[busy,setBusy]=useState<string|null>(null)
  const[error,setError]=useState('')
  const[notice,setNotice]=useState('')
  const[sourceOpen,setSourceOpen]=useState(false)
  const[sourcePreset,setSourcePreset]=useState('budget')
  const[sourceName,setSourceName]=useState('Transactions')
  const items=useMemo(()=>PAGE_TEMPLATES.filter(t=>(category==='All'||t.category===category)&&(!query.trim()||`${t.name} ${t.description} ${t.category}`.toLowerCase().includes(query.toLowerCase()))),[category,query])
  const databaseId=database?.id||databases[0]?.id||''

  const createSource=async()=>{
    const preset=SOURCE_PRESETS.find(item=>item.id===sourcePreset)||SOURCE_PRESETS[0]
    if(!sourceName.trim())return
    setBusy('source');setError('');setNotice('')
    try{
      const created=await createDatabase(page.workspace_id,sourceName.trim())
      for(let i=0;i<preset.fields.length;i++){
        const field=preset.fields[i]
        await createField(created.id,{name:field.name,type:field.type,required:false,config:{}},i+1)
      }
      const refresh=(window as typeof window & {__atlasRefreshPage?:()=>Promise<void>|void}).__atlasRefreshPage
      if(refresh)await refresh()
      setNotice(`${created.name} is ready. Atlas created the useful properties underneath, and you can now connect page elements to it.`)
      setSourceOpen(false)
    }catch(e){setError(e instanceof Error?e.message:String(e))}
    finally{setBusy(null)}
  }

  const choosePreset=(id:string)=>{
    setSourcePreset(id)
    const names:Record<string,string>={blank:'My collection',books:'Books',budget:'Transactions',grimoire:'Grimoire',journal:'Journal',podcast:'Episodes',tasks:'Tasks',travel:'Trips'}
    setSourceName(names[id]||'My collection')
  }

  const apply=async(templateId:string,mode:'replace'|'add')=>{
    const template=PAGE_TEMPLATES.find(t=>t.id===templateId)
    if(!template)return
    if(mode==='replace'&&!window.confirm(`Replace the current visual design with “${template.name}”? Your underlying page and database data will stay intact.`))return
    setBusy(`${templateId}:${mode}`);setError('');setNotice('')
    try{
      if(mode==='replace'){
        await Promise.all(blocks.map(block=>deletePageBlock(block.id)))
        await updatePage(page.id,{settings:{...page.settings,...template.settings}})
      }else await updatePage(page.id,{settings:{...template.settings,...page.settings}})
      const zOffset=mode==='add'?Math.max(0,...blocks.map(b=>Number(b.config?.zIndex||0))):0
      for(let i=0;i<template.blocks.length;i++){
        const seed=template.blocks[i]
        const config=resolveTemplateConfig(seed.config,databaseId)
        if(mode==='add')config.zIndex=Number(config.zIndex||1)+zOffset
        await createPageBlock(page.id,seed.type,(mode==='add'?blocks.length:0)+i,config)
      }
      const refresh=(window as typeof window & {__atlasRefreshPage?:()=>Promise<void>|void}).__atlasRefreshPage
      if(refresh)await refresh()
      setNotice(`${template.name} applied. Keep editing, move anything, or try another template.`)
    }catch(e){setError(e instanceof Error?e.message:String(e))}
    finally{setBusy(null)}
  }

  return <div className="atlas-template-panel">
    <div className="atlas-template-intro"><Sparkles/><div><strong>Build something gorgeous</strong><span>Templates are starting points. Your data stays yours, and every piece can still be moved, restyled, replaced, or deleted.</span></div></div>

    <div className="atlas-source-starter">
      <div className="atlas-source-starter-copy"><DatabaseIcon/><div><strong>What should this page track?</strong><span>Create useful data without building a spreadsheet first.</span></div></div>
      <button className="atlas-source-create" onClick={()=>setSourceOpen(value=>!value)}><Plus/>{sourceOpen?'Close setup':'Create data source'}</button>
      {sourceOpen&&<div className="atlas-source-wizard">
        <div className="atlas-source-preset-grid">{SOURCE_PRESETS.map(preset=><button key={preset.id} className={sourcePreset===preset.id?'active':''} onClick={()=>choosePreset(preset.id)}><span>{preset.icon}</span><strong>{preset.name}</strong><small>{preset.description}</small></button>)}</div>
        <label className="atlas-source-name">What do you want to call it?<input value={sourceName} onChange={e=>setSourceName(e.target.value)} placeholder="Transactions"/></label>
        <div className="atlas-source-summary"><strong>Atlas will handle the structure.</strong><span>{SOURCE_PRESETS.find(item=>item.id===sourcePreset)?.fields.length?`We’ll create ${SOURCE_PRESETS.find(item=>item.id===sourcePreset)?.fields.length} useful properties. You can change or delete any of them later.`:'We’ll create a clean collection with a Name field. Add more only when you want them.'}</span></div>
        <button className="atlas-source-finish" disabled={busy==='source'||!sourceName.trim()} onClick={()=>void createSource()}>{busy==='source'?'Creating…':'Create & keep designing'}</button>
      </div>}
    </div>

    <div className="atlas-template-search"><Search/><input placeholder="Search templates" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="atlas-template-categories">{categories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div>
    {notice&&<p className="atlas-template-notice">{notice}</p>}
    {error&&<p className="atlas-asset-error">{error}</p>}
    <div className="atlas-template-list">{items.map(template=><article key={template.id} className="atlas-template-card">
      <div className="atlas-template-preview"><span>{template.icon}</span><small>{template.category}</small></div>
      <div className="atlas-template-copy"><strong>{template.name}</strong><p>{template.description}</p></div>
      <div className="atlas-template-actions"><button disabled={Boolean(busy)} onClick={()=>void apply(template.id,'replace')}><LayoutTemplate/>{busy===`${template.id}:replace`?'Applying…':'Replace design'}</button><button disabled={Boolean(busy)} onClick={()=>void apply(template.id,'add')}><Plus/>{busy===`${template.id}:add`?'Adding…':'Add to page'}</button></div>
    </article>)}</div>
    {!items.length&&<p className="atlas-helper">No templates match that search.</p>}
  </div>
}
