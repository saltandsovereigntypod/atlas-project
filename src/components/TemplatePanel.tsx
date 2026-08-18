import { useMemo, useState } from 'react'
import { Database as DatabaseIcon, Layers3, LayoutTemplate, Palette, Plus, Search, Sparkles, WandSparkles } from 'lucide-react'
import { createDatabase, createField, createPageBlock, deletePageBlock, updatePage, updatePageBlock } from '../lib/data'
import { DATA_KITS, SECTION_PRESETS, STYLE_PACKS, resolveCreativeConfig, type StylePack } from '../lib/creativePresets'
import { PAGE_TEMPLATES, resolveTemplateConfig, type TemplateCategory } from '../lib/templates'
import type { Database, FieldType, Page, PageBlock } from '../types'

type Props = { page:Page; blocks:PageBlock[]; databases:Database[]; database:Database|null }
type LibraryMode='templates'|'sections'|'styles'|'data'
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
  const[mode,setMode]=useState<LibraryMode>('templates')
  const[category,setCategory]=useState<(typeof categories)[number]>('All')
  const[query,setQuery]=useState('')
  const[busy,setBusy]=useState<string|null>(null)
  const[error,setError]=useState('')
  const[notice,setNotice]=useState('')
  const[sourceOpen,setSourceOpen]=useState(false)
  const[sourcePreset,setSourcePreset]=useState('budget')
  const[sourceName,setSourceName]=useState('Transactions')
  const databaseId=database?.id||databases[0]?.id||''

  const templateItems=useMemo(()=>PAGE_TEMPLATES.filter(t=>(category==='All'||t.category===category)&&(!query.trim()||`${t.name} ${t.description} ${t.category}`.toLowerCase().includes(query.toLowerCase()))),[category,query])
  const sectionItems=useMemo(()=>SECTION_PRESETS.filter(item=>!query.trim()||`${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase())),[query])
  const styleItems=useMemo(()=>STYLE_PACKS.filter(item=>!query.trim()||`${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())),[query])
  const kitItems=useMemo(()=>DATA_KITS.filter(item=>!query.trim()||`${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())),[query])

  const refresh=async()=>{const fn=(window as typeof window & {__atlasRefreshPage?:()=>Promise<void>|void}).__atlasRefreshPage;if(fn)await fn()}
  const clearMessages=()=>{setError('');setNotice('')}

  const createSource=async()=>{
    const preset=SOURCE_PRESETS.find(item=>item.id===sourcePreset)||SOURCE_PRESETS[0]
    if(!sourceName.trim())return
    setBusy('source');clearMessages()
    try{
      const created=await createDatabase(page.workspace_id,sourceName.trim())
      for(let i=0;i<preset.fields.length;i++){const field=preset.fields[i];await createField(created.id,{name:field.name,type:field.type,required:false,config:{}},i+1)}
      await refresh()
      setNotice(`${created.name} is ready. Atlas handled the structure, and you can now connect widgets, forms, or database views to it.`)
      setSourceOpen(false)
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(null)}
  }

  const createKit=async(kitId:string)=>{
    const kit=DATA_KITS.find(item=>item.id===kitId);if(!kit)return
    setBusy(`kit:${kitId}`);clearMessages()
    try{
      const existing=new Set(databases.map(item=>item.name.toLowerCase()))
      const createdNames:string[]=[]
      for(const collection of kit.collections){
        if(existing.has(collection.name.toLowerCase()))continue
        const created=await createDatabase(page.workspace_id,collection.name)
        for(let i=0;i<collection.fields.length;i++){const field=collection.fields[i];await createField(created.id,{name:field.name,type:field.type,required:false,config:{}},i+1)}
        createdNames.push(collection.name)
      }
      await refresh()
      setNotice(createdNames.length?`${kit.name} created: ${createdNames.join(', ')}. Existing collections with matching names were left alone.`:`Your ${kit.name} collections already exist, so Atlas did not duplicate them.`)
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(null)}
  }

  const choosePreset=(id:string)=>{
    setSourcePreset(id)
    const names:Record<string,string>={blank:'My collection',books:'Books',budget:'Transactions',grimoire:'Grimoire',journal:'Journal',podcast:'Episodes',tasks:'Tasks',travel:'Trips'}
    setSourceName(names[id]||'My collection')
  }

  const applyTemplate=async(templateId:string,applyMode:'replace'|'add')=>{
    const template=PAGE_TEMPLATES.find(t=>t.id===templateId);if(!template)return
    if(applyMode==='replace'&&!window.confirm(`Replace the current visual design with “${template.name}”? Your underlying page and database data will stay intact.`))return
    setBusy(`${templateId}:${applyMode}`);clearMessages()
    try{
      if(applyMode==='replace'){await Promise.all(blocks.map(block=>deletePageBlock(block.id)));await updatePage(page.id,{settings:{...page.settings,...template.settings}})}
      else await updatePage(page.id,{settings:{...template.settings,...page.settings}})
      const zOffset=applyMode==='add'?Math.max(0,...blocks.map(b=>Number(b.config?.zIndex||0))):0
      for(let i=0;i<template.blocks.length;i++){const seed=template.blocks[i];const config=resolveTemplateConfig(seed.config,databaseId);if(applyMode==='add')config.zIndex=Number(config.zIndex||1)+zOffset;await createPageBlock(page.id,seed.type,(applyMode==='add'?blocks.length:0)+i,config)}
      await refresh();setNotice(`${template.name} applied. You are still in Edit, so keep moving, restyling, or swapping pieces.`)
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(null)}
  }

  const addSection=async(sectionId:string)=>{
    const section=SECTION_PRESETS.find(item=>item.id===sectionId);if(!section)return
    setBusy(`section:${sectionId}`);clearMessages()
    try{
      const bottom=blocks.reduce((max,block)=>Math.max(max,Number(block.config.y||0)+Number(block.config.height||0)),40)
      const yOffset=Math.max(60,bottom+55)
      const zOffset=Math.max(0,...blocks.map(block=>Number(block.config.zIndex||0)))
      for(let i=0;i<section.blocks.length;i++){const seed=section.blocks[i];const config=resolveCreativeConfig(seed.config,databaseId,55,yOffset,zOffset);await createPageBlock(page.id,seed.type,blocks.length+i,config)}
      const neededHeight=yOffset+section.height+120
      if(Number(page.settings?.canvasHeight||1100)<neededHeight)await updatePage(page.id,{settings:{...page.settings,canvasHeight:neededHeight}})
      await refresh();setNotice(`${section.name} added below your current design. Move it anywhere or break it apart into individual pieces.`)
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(null)}
  }

  const applyStyle=async(styleId:string)=>{
    const pack=STYLE_PACKS.find(item=>item.id===styleId);if(!pack)return
    setBusy(`style:${styleId}`);clearMessages()
    try{
      await updatePage(page.id,{settings:{...page.settings,background:pack.page.background,textColor:pack.page.textColor}})
      for(const block of blocks)await updatePageBlock(block.id,{config:restyleBlock(block,pack)})
      await refresh();setNotice(`${pack.name} applied without changing your layout or data bindings. Fine-tune any individual element from Design.`)
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(null)}
  }

  return <div className="atlas-template-panel">
    <div className="atlas-template-intro"><Sparkles/><div><strong>Build something gorgeous</strong><span>Use full-page templates, drop-in sections, visual styles, or friendly data kits. Everything remains editable.</span></div></div>
    <div className="atlas-creative-mode-tabs">
      <button className={mode==='templates'?'active':''} onClick={()=>setMode('templates')}><LayoutTemplate/>Pages</button>
      <button className={mode==='sections'?'active':''} onClick={()=>setMode('sections')}><Layers3/>Sections</button>
      <button className={mode==='styles'?'active':''} onClick={()=>setMode('styles')}><Palette/>Styles</button>
      <button className={mode==='data'?'active':''} onClick={()=>setMode('data')}><DatabaseIcon/>Data</button>
    </div>

    {(mode==='templates'||mode==='sections'||mode==='styles')&&<div className="atlas-template-search"><Search/><input placeholder={`Search ${mode}`} value={query} onChange={e=>setQuery(e.target.value)}/></div>}
    {notice&&<p className="atlas-template-notice">{notice}</p>}
    {error&&<p className="atlas-asset-error">{error}</p>}

    {mode==='templates'&&<>
      <div className="atlas-template-categories">{categories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div>
      <div className="atlas-template-list">{templateItems.map(template=><article key={template.id} className="atlas-template-card"><div className="atlas-template-preview"><span>{template.icon}</span><small>{template.category}</small></div><div className="atlas-template-copy"><strong>{template.name}</strong><p>{template.description}</p></div><div className="atlas-template-actions"><button disabled={Boolean(busy)} onClick={()=>void applyTemplate(template.id,'replace')}><LayoutTemplate/>{busy===`${template.id}:replace`?'Applying…':'Replace design'}</button><button disabled={Boolean(busy)} onClick={()=>void applyTemplate(template.id,'add')}><Plus/>{busy===`${template.id}:add`?'Adding…':'Add to page'}</button></div></article>)}</div>
    </>}

    {mode==='sections'&&<div className="atlas-section-library">{sectionItems.map(section=><article key={section.id} className="atlas-section-card"><div className="atlas-section-card-head"><span>{section.icon}</span><div><strong>{section.name}</strong><small>{section.category}</small></div></div><p>{section.description}</p><button disabled={Boolean(busy)} onClick={()=>void addSection(section.id)}><Plus/>{busy===`section:${section.id}`?'Adding…':'Add section'}</button></article>)}</div>}

    {mode==='styles'&&<div className="atlas-style-library">{styleItems.map(pack=><article key={pack.id} className="atlas-style-card"><div className="atlas-style-swatch" style={{background:`linear-gradient(135deg,${pack.page.background} 0 50%,${pack.surfaceAlt} 50% 75%,${pack.accent} 75%)`}}><span style={{color:pack.primary}}>{pack.icon}</span></div><div><strong>{pack.name}</strong><p>{pack.description}</p><div className="atlas-style-dots"><i style={{background:pack.page.background}}/><i style={{background:pack.surface}}/><i style={{background:pack.accent}}/><i style={{background:pack.dark}}/></div></div><button disabled={Boolean(busy)} onClick={()=>void applyStyle(pack.id)}><WandSparkles/>{busy===`style:${pack.id}`?'Styling…':'Apply style'}</button></article>)}</div>}

    {mode==='data'&&<>
      <div className="atlas-source-starter"><div className="atlas-source-starter-copy"><DatabaseIcon/><div><strong>What should this page track?</strong><span>Create one collection without building a spreadsheet first.</span></div></div><button className="atlas-source-create" onClick={()=>setSourceOpen(value=>!value)}><Plus/>{sourceOpen?'Close setup':'Create one collection'}</button>{sourceOpen&&<div className="atlas-source-wizard"><div className="atlas-source-preset-grid">{SOURCE_PRESETS.map(preset=><button key={preset.id} className={sourcePreset===preset.id?'active':''} onClick={()=>choosePreset(preset.id)}><span>{preset.icon}</span><strong>{preset.name}</strong><small>{preset.description}</small></button>)}</div><label className="atlas-source-name">What do you want to call it?<input value={sourceName} onChange={e=>setSourceName(e.target.value)} placeholder="Transactions"/></label><div className="atlas-source-summary"><strong>Atlas will handle the structure.</strong><span>{SOURCE_PRESETS.find(item=>item.id===sourcePreset)?.fields.length?`We’ll create ${SOURCE_PRESETS.find(item=>item.id===sourcePreset)?.fields.length} useful properties. You can change or delete any of them later.`:'We’ll create a clean collection with a Name field. Add more only when you want them.'}</span></div><button className="atlas-source-finish" disabled={busy==='source'||!sourceName.trim()} onClick={()=>void createSource()}>{busy==='source'?'Creating…':'Create & keep designing'}</button></div>}</div>
      <div className="atlas-kit-heading"><Sparkles/><div><strong>Or build a whole system</strong><span>Atlas can create the related collections that make a template actually useful.</span></div></div>
      <div className="atlas-data-kit-list">{kitItems.map(kit=><article key={kit.id} className="atlas-data-kit-card"><div><span>{kit.icon}</span><div><strong>{kit.name}</strong><p>{kit.description}</p></div></div><small>{kit.collections.map(collection=>collection.name).join(' · ')}</small><button disabled={Boolean(busy)} onClick={()=>void createKit(kit.id)}><Plus/>{busy===`kit:${kit.id}`?'Building…':'Create system'}</button></article>)}</div>
    </>}
  </div>
}

function restyleBlock(block:PageBlock,pack:StylePack){
  const config={...block.config,fontFamily:block.type==='heading'?pack.headingFont:pack.fontFamily,textColor:pack.primary}
  if(block.type==='widget')return {...config,background:'transparent',primaryColor:pack.primary,secondaryColor:pack.secondary,accentColor:pack.accent,surfaceColor:pack.surface,borderColor:pack.border,fontFamily:pack.fontFamily}
  if(block.type==='section')return {...config,background:pack.surfaceAlt,border:pack.border}
  if(block.type==='callout')return {...config,background:pack.surfaceAlt,textColor:pack.primary}
  if(block.type==='button')return {...config,background:pack.dark,textColor:pack.surface,border:pack.dark}
  if(block.type==='database_view')return {...config,background:'transparent',textColor:pack.primary}
  if(block.type==='image'||block.type==='divider')return config
  return {...config,background:String(block.config.background||'transparent')==='transparent'?'transparent':pack.surface}
}
