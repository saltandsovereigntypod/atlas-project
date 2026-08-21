import { useMemo, useState } from 'react'
import { Database as DatabaseIcon, Layers3, LayoutTemplate, Link2, Palette, Plus, Search, Sparkles, WandSparkles, X } from 'lucide-react'
import { createDatabase, createField, createPageBlock, deleteDatabase, deletePageBlock, getDatabases, updatePage, updatePageBlock } from '../lib/data'
import { DATA_KITS, SECTION_PRESETS, STYLE_PACKS, resolveCreativeConfig, type StylePack } from '../lib/creativePresets'
import { PAGE_TEMPLATES, resolveTemplateConfig, type TemplateCategory, type TemplateBlock } from '../lib/templates'
import type { Database, FieldType, Page, PageBlock } from '../types'
import FriendlyRecordForm from './FriendlyRecordForm'

type Props = { page: Page; blocks: PageBlock[]; databases: Database[]; database: Database | null; onRefresh?:()=>Promise<void>|void }
type LibraryMode = 'templates' | 'sections' | 'styles' | 'data'
type SourcePreset = { id: string; name: string; description: string; icon: string; fields: Array<{ name: string; type: FieldType }> }
type ConnectionRequirement = { key:string; name:string; description:string; powers:string[]; fields:Array<{name:string;type:FieldType}> }
type PendingTemplate = { templateId:string; applyMode:'replace'|'add'; requirements:ConnectionRequirement[] }

const categories: Array<'All' | TemplateCategory> = ['All', 'Witchy', 'Books', 'Budget', 'Podcast', 'Travel', 'Boards']
const SOURCE_PRESETS: SourcePreset[] = [
  { id:'blank', name:'Blank collection', icon:'✦', description:'Start simple and add only what you need.', fields:[] },
  { id:'books', name:'Books & reading', icon:'📚', description:'A flexible library for books, TBRs, ratings, covers, and reading status.', fields:[{name:'Author',type:'text'},{name:'Status',type:'status'},{name:'Rating',type:'number'},{name:'Genre',type:'multi_select'},{name:'Cover',type:'image'},{name:'Started',type:'date'},{name:'Finished',type:'date'},{name:'Notes',type:'long_text'}] },
  { id:'budget', name:'Budget & transactions', icon:'$', description:'Track spending, income, bills, categories, accounts, and notes.', fields:[{name:'Amount',type:'number'},{name:'Type',type:'select'},{name:'Category',type:'select'},{name:'Date',type:'date'},{name:'Account',type:'select'},{name:'Paid',type:'checkbox'},{name:'Notes',type:'long_text'}] },
  { id:'grimoire', name:'Grimoire', icon:'☾', description:'A home for rituals, spells, correspondences, results, and reflections.', fields:[{name:'Type',type:'select'},{name:'Date',type:'date'},{name:'Intent',type:'long_text'},{name:'Correspondences',type:'multi_select'},{name:'Result',type:'long_text'},{name:'Image',type:'image'}] },
  { id:'journal', name:'Journal', icon:'✎', description:'Entries with dates, moods, tags, images, and long-form reflection.', fields:[{name:'Date',type:'date'},{name:'Mood',type:'select'},{name:'Tags',type:'multi_select'},{name:'Entry',type:'long_text'},{name:'Image',type:'image'}] },
  { id:'podcast', name:'Podcast episodes', icon:'◉', description:'Manage episodes from idea through recording, editing, and publishing.', fields:[{name:'Status',type:'status'},{name:'Guest',type:'text'},{name:'Record date',type:'date'},{name:'Publish date',type:'date'},{name:'Episode number',type:'number'},{name:'Show notes',type:'long_text'},{name:'Published URL',type:'url'}] },
  { id:'tasks', name:'Tasks & projects', icon:'✓', description:'A useful task collection for any dashboard or project page.', fields:[{name:'Status',type:'status'},{name:'Due date',type:'date'},{name:'Priority',type:'select'},{name:'Project',type:'text'},{name:'Done',type:'checkbox'},{name:'Notes',type:'long_text'}] },
  { id:'travel', name:'Trips & travel', icon:'✈', description:'Track destinations, dates, bookings, budgets, places, and memories.', fields:[{name:'Destination',type:'text'},{name:'Start date',type:'date'},{name:'End date',type:'date'},{name:'Status',type:'status'},{name:'Budget',type:'number'},{name:'Booking URL',type:'url'},{name:'Cover',type:'image'},{name:'Notes',type:'long_text'}] }
]

const episodeIdeaFields:Array<{name:string;type:FieldType}> = [
  {name:'Status',type:'status'},{name:'Hook',type:'long_text'},{name:'Guest idea',type:'text'},{name:'Notes',type:'long_text'},{name:'Captured',type:'date'}
]
const episodeFields = SOURCE_PRESETS.find(item => item.id === 'podcast')!.fields

export default function TemplatePanel({ page, blocks, databases, database, onRefresh }: Props) {
  const [mode, setMode] = useState<LibraryMode>('templates')
  const [category, setCategory] = useState<(typeof categories)[number]>('All')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sourceOpen, setSourceOpen] = useState(false)
  const [sourcePreset, setSourcePreset] = useState('budget')
  const [sourceName, setSourceName] = useState('Transactions')
  const [preferredDb, setPreferredDb] = useState(database?.id || databases[0]?.id || '')
  const [pendingTemplate, setPendingTemplate] = useState<PendingTemplate | null>(null)
  const [connections, setConnections] = useState<Record<string,string>>({})

  const databaseId = preferredDb || database?.id || databases[0]?.id || ''
  const selectedDatabase = databases.find(item => item.id === databaseId) || database || null
  const templateItems = useMemo(() => PAGE_TEMPLATES.filter(t => (category === 'All' || t.category === category) && (!query.trim() || `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(query.toLowerCase()))), [category, query])
  const sectionItems = useMemo(() => SECTION_PRESETS.filter(item => !query.trim() || `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [query])
  const styleItems = useMemo(() => STYLE_PACKS.filter(item => !query.trim() || `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [query])
  const kitItems = useMemo(() => DATA_KITS.filter(item => !query.trim() || `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [query])

  const refresh = async () => { await onRefresh?.() }
  const refreshWorkspace = () => window.dispatchEvent(new Event('atlas-workspace-changed'))
  const clearMessages = () => { setError(''); setNotice('') }

  const createCollection = async (name:string, fields:Array<{name:string;type:FieldType}>) => {
    const created = await createDatabase(page.workspace_id, name)
    try {
      for (let i=0;i<fields.length;i++) await createField(created.id,{name:fields[i].name,type:fields[i].type,required:false,config:{}},i+1)
      const visible = await getDatabases(page.workspace_id)
      const verified = visible.find(item => item.id === created.id)
      if (!verified) throw new Error(`Atlas created ${name}, but could not read it back from the workspace.`)
      refreshWorkspace()
      return verified
    } catch (error) {
      try { await deleteDatabase(created.id) } catch {}
      refreshWorkspace()
      throw error
    }
  }

  const createSource = async () => {
    const preset = SOURCE_PRESETS.find(item => item.id === sourcePreset) || SOURCE_PRESETS[0]
    if (!sourceName.trim()) return
    setBusy('source'); clearMessages()
    try {
      const created = await createCollection(sourceName.trim(), preset.fields)
      setPreferredDb(created.id); await refresh(); refreshWorkspace(); setNotice(`${created.name} is ready.`); setSourceOpen(false)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(null) }
  }

  const choosePreset = (id:string) => {
    setSourcePreset(id)
    const names:Record<string,string>={blank:'My collection',books:'Books',budget:'Transactions',grimoire:'Grimoire',journal:'Journal',podcast:'Episodes',tasks:'Tasks',travel:'Trips'}
    setSourceName(names[id] || 'My collection')
  }

  const ensureKit = async (kitId:string) => {
    const kit=DATA_KITS.find(item=>item.id===kitId)
    if(!kit)return {firstId:'',createdNames:[] as string[]}
    const existing=new Map(databases.map(item=>[item.name.toLowerCase(),item]))
    const createdNames:string[]=[];let firstId=''
    for(const collection of kit.collections){
      const found=existing.get(collection.name.toLowerCase())
      if(found){if(!firstId)firstId=found.id;continue}
      const created=await createCollection(collection.name,collection.fields);createdNames.push(collection.name);if(!firstId)firstId=created.id
    }
    return {firstId,createdNames}
  }

  const createKit = async (kitId:string) => {
    setBusy(`kit:${kitId}`);clearMessages()
    try{const result=await ensureKit(kitId);if(result.firstId)setPreferredDb(result.firstId);await refresh();refreshWorkspace();setNotice(result.createdNames.length?`Created ${result.createdNames.join(', ')}.`:'Those collections already exist. Atlas left them alone.')}
    catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(null)}
  }

  const startTemplate = (templateId:string, applyMode:'replace'|'add') => {
    const template=PAGE_TEMPLATES.find(item=>item.id===templateId);if(!template)return
    const requirements=getTemplateRequirements(template)
    if(!requirements.length){void applyResolvedTemplate(templateId,applyMode,{});return}
    const initial:Record<string,string>={}
    for(const req of requirements){const match=databases.find(db=>db.name.toLowerCase()===req.name.toLowerCase());initial[req.key]=match?.id || '__create__'}
    setConnections(initial);setPendingTemplate({templateId,applyMode,requirements});clearMessages()
  }

  const applyResolvedTemplate = async (templateId:string, applyMode:'replace'|'add', resolved:Record<string,string>) => {
    const template=PAGE_TEMPLATES.find(item=>item.id===templateId);if(!template)return
    if(applyMode==='replace' && blocks.length && !window.confirm(`Replace the current visual design with “${template.name}”? Your databases and records will stay intact.`))return
    setBusy(`${templateId}:${applyMode}`);clearMessages()
    try{
      if(applyMode==='replace'){await Promise.all(blocks.map(block=>deletePageBlock(block.id)));await updatePage(page.id,{settings:{...page.settings,...template.settings}})}
      else await updatePage(page.id,{settings:{...template.settings,...page.settings}})
      const zOffset=applyMode==='add'?Math.max(0,...blocks.map(b=>Number(b.config?.zIndex||0))):0
      for(let i=0;i<template.blocks.length;i++){
        const seed=template.blocks[i]
        const key=connectionKeyForBlock(template.category,seed)
        const sourceId=key?resolved[key]||'':''
        const config=resolveTemplateConfig(seed.config,sourceId)
        if(applyMode==='add')config.zIndex=Number(config.zIndex||1)+zOffset
        await createPageBlock(page.id,seed.type,(applyMode==='add'?blocks.length:0)+i,config)
      }
      await refresh();refreshWorkspace();setPendingTemplate(null)
      setNotice(`${template.name} applied. Every data connection can still be changed from the element itself.`)
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(null)}
  }

  const confirmTemplateConnections = async () => {
    if(!pendingTemplate)return
    setBusy(`connections:${pendingTemplate.templateId}`);clearMessages()
    try{
      const resolved:Record<string,string>={}
      const createdNames:string[]=[]
      for(const req of pendingTemplate.requirements){
        const choice=connections[req.key]||''
        if(choice==='__create__'){
          const created=await createCollection(req.name,req.fields)
          resolved[req.key]=created.id
          createdNames.push(created.name)
        } else resolved[req.key]=choice
      }
      const visible = await getDatabases(page.workspace_id)
      for (const [key,id] of Object.entries(resolved)) {
        if (id && !visible.some(item => item.id === id)) throw new Error(`The selected data source for ${key} is not available in this workspace.`)
      }
      refreshWorkspace()
      await refresh()
      if (createdNames.length) setNotice(`Created ${createdNames.join(' and ')}. Applying the template now…`)
      await applyResolvedTemplate(pendingTemplate.templateId,pendingTemplate.applyMode,resolved)
    }catch(e){setError(e instanceof Error?e.message:String(e));setBusy(null)}
  }

  const addSection = async (sectionId:string) => {
    const section=SECTION_PRESETS.find(item=>item.id===sectionId);if(!section)return
    setBusy(`section:${sectionId}`);clearMessages()
    try{
      const bottom=blocks.reduce((max,block)=>Math.max(max,Number(block.config.y||0)+Number(block.config.height||0)),40)
      const yOffset=Math.max(60,bottom+55),zOffset=Math.max(0,...blocks.map(block=>Number(block.config.zIndex||0)))
      for(let i=0;i<section.blocks.length;i++){const seed=section.blocks[i];await createPageBlock(page.id,seed.type,blocks.length+i,resolveCreativeConfig(seed.config,databaseId,55,yOffset,zOffset))}
      const neededHeight=yOffset+section.height+120;if(Number(page.settings?.canvasHeight||1100)<neededHeight)await updatePage(page.id,{settings:{...page.settings,canvasHeight:neededHeight}})
      await refresh();setNotice(`${section.name} added below your current design.`)
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(null)}
  }

  const applyStyle = async (styleId:string) => {
    const pack=STYLE_PACKS.find(item=>item.id===styleId);if(!pack)return
    setBusy(`style:${styleId}`);clearMessages()
    try{await updatePage(page.id,{settings:{...page.settings,background:pack.page.background,textColor:pack.page.textColor}});for(const block of blocks)await updatePageBlock(block.id,{config:restyleBlock(block,pack)});await refresh();setNotice(`${pack.name} applied without changing your data connections.`)}
    catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(null)}
  }

  const bindExisting = async () => {
    if(!databaseId)return
    setBusy('bind');clearMessages()
    try{let count=0;for(const block of blocks){if(block.type==='database_view'||block.type==='metric'||(block.type==='widget'&&needsDatabase(String(block.config.widgetType||'')))){await updatePageBlock(block.id,{config:{...block.config,databaseId}});count++}}await refresh();setNotice(count?`Connected ${count} data-aware element${count===1?'':'s'} to ${selectedDatabase?.name||'that collection'}.`:'There are no data-aware elements on this page yet.')}
    catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(null)}
  }

  return <div className="atlas-template-panel">
    <div className="atlas-template-intro"><Sparkles/><div><strong>Build something gorgeous</strong><span>Pages, sections, styles, and connected data. Nothing gets linked without you seeing it.</span></div></div>
    <div className="atlas-creative-mode-tabs"><button className={mode==='templates'?'active':''} onClick={()=>setMode('templates')}><LayoutTemplate/>Pages</button><button className={mode==='sections'?'active':''} onClick={()=>setMode('sections')}><Layers3/>Sections</button><button className={mode==='styles'?'active':''} onClick={()=>setMode('styles')}><Palette/>Styles</button><button className={mode==='data'?'active':''} onClick={()=>setMode('data')}><DatabaseIcon/>Data</button></div>
    {(mode==='templates'||mode==='sections'||mode==='styles')&&<div className="atlas-template-search"><Search/><input placeholder={`Search ${mode}`} value={query} onChange={e=>setQuery(e.target.value)}/></div>}
    {notice&&<p className="atlas-template-notice">{notice}</p>}{error&&<p className="atlas-asset-error">{error}</p>}

    {pendingTemplate&&<div className="atlas-template-connections">
      <div className="atlas-connection-head"><div><Link2/><span><strong>Connect {PAGE_TEMPLATES.find(t=>t.id===pendingTemplate.templateId)?.name}</strong><small>Atlas will only create or connect the sources you approve.</small></span></div><button onClick={()=>setPendingTemplate(null)}><X/></button></div>
      <div className="atlas-connection-list">{pendingTemplate.requirements.map(req=><label key={req.key} className="atlas-connection-row"><div><strong>{req.name}</strong><small>{req.description}</small><span>Used by: {req.powers.join(' · ')}</span></div><select value={connections[req.key]||''} onChange={e=>setConnections(current=>({...current,[req.key]:e.target.value}))}><option value="">Leave unconnected</option><option value="__create__">Create new {req.name}</option>{databases.map(db=><option key={db.id} value={db.id}>Use existing: {db.name}</option>)}</select></label>)}</div>
      <div className="atlas-connection-foot"><button onClick={()=>setPendingTemplate(null)}>Cancel</button><button className="primary" disabled={Boolean(busy)} onClick={()=>void confirmTemplateConnections()}>{busy?.startsWith('connections:')?'Connecting…':'Apply template'}</button></div>
    </div>}

    {mode==='templates'&&<><div className="atlas-template-categories">{categories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="atlas-template-list">{templateItems.map(template=>{const reqs=getTemplateRequirements(template);return <article key={template.id} className="atlas-template-card"><div className="atlas-template-preview"><span>{template.icon}</span><small>{template.category}</small></div><div className="atlas-template-copy"><strong>{template.name}</strong><p>{template.description}</p>{reqs.length>0&&<span className="atlas-template-system-badge"><Link2/>{reqs.length} data connection{reqs.length===1?'':'s'} to review</span>}</div><div className="atlas-template-actions"><button disabled={Boolean(busy)} onClick={()=>startTemplate(template.id,'replace')}><WandSparkles/>Use template</button><button disabled={Boolean(busy)} onClick={()=>startTemplate(template.id,'add')}><Plus/>Add to page</button></div></article>})}</div></>}

    {mode==='sections'&&<><DataBindingBar databases={databases} value={databaseId} onChange={setPreferredDb}/><div className="atlas-section-library">{sectionItems.map(section=><article key={section.id} className="atlas-section-card"><div className="atlas-section-card-head"><span>{section.icon}</span><div><strong>{section.name}</strong><small>{section.category}</small></div></div><p>{section.description}</p><button disabled={Boolean(busy)} onClick={()=>void addSection(section.id)}><Plus/>{busy===`section:${section.id}`?'Adding…':'Add section'}</button></article>)}</div></>}

    {mode==='styles'&&<div className="atlas-style-library">{styleItems.map(pack=><article key={pack.id} className="atlas-style-card"><div className="atlas-style-swatch" style={{background:`linear-gradient(135deg,${pack.page.background} 0 50%,${pack.surfaceAlt} 50% 75%,${pack.accent} 75%)`}}><span style={{color:pack.primary}}>{pack.icon}</span></div><div><strong>{pack.name}</strong><p>{pack.description}</p><div className="atlas-style-dots"><i style={{background:pack.page.background}}/><i style={{background:pack.surface}}/><i style={{background:pack.accent}}/><i style={{background:pack.dark}}/></div></div><button disabled={Boolean(busy)} onClick={()=>void applyStyle(pack.id)}><WandSparkles/>{busy===`style:${pack.id}`?'Styling…':'Apply style'}</button></article>)}</div>}

    {mode==='data'&&<><div className="atlas-source-starter"><div className="atlas-source-starter-copy"><DatabaseIcon/><div><strong>What should this page track?</strong><span>Create one collection without building a spreadsheet first.</span></div></div><button className="atlas-source-create" onClick={()=>setSourceOpen(value=>!value)}><Plus/>{sourceOpen?'Close setup':'Create one collection'}</button>{sourceOpen&&<div className="atlas-source-wizard"><div className="atlas-source-preset-grid">{SOURCE_PRESETS.map(preset=><button key={preset.id} className={sourcePreset===preset.id?'active':''} onClick={()=>choosePreset(preset.id)}><span>{preset.icon}</span><strong>{preset.name}</strong><small>{preset.description}</small></button>)}</div><label className="atlas-source-name">What do you want to call it?<input value={sourceName} onChange={e=>setSourceName(e.target.value)} placeholder="Transactions"/></label><button className="atlas-source-finish" disabled={busy==='source'||!sourceName.trim()} onClick={()=>void createSource()}>{busy==='source'?'Creating…':'Create & keep designing'}</button></div>}</div><div className="atlas-bind-card"><div><Link2/><span><strong>Connect existing page elements</strong><small>Use this only when you deliberately want several existing elements to share one source.</small></span></div><DataBindingBar databases={databases} value={databaseId} onChange={setPreferredDb}/><button disabled={!databaseId||Boolean(busy)} onClick={()=>void bindExisting()}>{busy==='bind'?'Connecting…':'Connect compatible elements'}</button></div><div className="atlas-friendly-entry"><div className="atlas-kit-heading"><Sparkles/><div><strong>Add real information</strong><span>Atlas builds the form from your selected collection.</span></div></div><FriendlyRecordForm database={selectedDatabase} onSaved={refresh}/></div><div className="atlas-kit-heading"><Sparkles/><div><strong>Or build a whole system</strong><span>Create related collections when you actually want them.</span></div></div><div className="atlas-data-kit-list">{kitItems.map(kit=><article key={kit.id} className="atlas-data-kit-card"><div><span>{kit.icon}</span><div><strong>{kit.name}</strong><p>{kit.description}</p></div></div><small>{kit.collections.map(collection=>collection.name).join(' · ')}</small><button disabled={Boolean(busy)} onClick={()=>void createKit(kit.id)}><Plus/>{busy===`kit:${kit.id}`?'Building…':'Create system'}</button></article>)}</div></>}
  </div>
}

function getTemplateRequirements(template:(typeof PAGE_TEMPLATES)[number]):ConnectionRequirement[]{
  const dataBlocks=template.blocks.filter(seed=>String(seed.config.databaseId||'')==='$database')
  if(!dataBlocks.length)return []
  if(template.category==='Podcast'){
    const ideaBlocks=dataBlocks.filter(seed=>seed.type==='widget'&&String(seed.config.widgetType||'')==='quick_capture')
    const episodeBlocks=dataBlocks.filter(seed=>!ideaBlocks.includes(seed))
    const out:ConnectionRequirement[]=[]
    if(ideaBlocks.length)out.push({key:'episodeIdeas',name:'Episode Ideas',description:'Loose concepts before they become real episodes.',powers:ideaBlocks.map(blockLabel),fields:episodeIdeaFields})
    if(episodeBlocks.length)out.push({key:'episodes',name:'Episodes',description:'Actual episodes moving through production and publishing.',powers:episodeBlocks.map(blockLabel),fields:episodeFields})
    return out
  }
  const presets:Partial<Record<TemplateCategory,{key:string;name:string;description:string;preset:string}>>={
    Books:{key:'books',name:'Books',description:'Your library and reading records.',preset:'books'},
    Budget:{key:'transactions',name:'Transactions',description:'Money activity used by this page.',preset:'budget'},
    Travel:{key:'trips',name:'Trips',description:'Trips and travel records used by this page.',preset:'travel'},
    Witchy:{key:'grimoire',name:'Grimoire',description:'Structured magical or journal records used by this page.',preset:'grimoire'}
  }
  const meta=presets[template.category]||{key:'data',name:'Connected data',description:'Records used by this page.',preset:'blank'}
  const preset=SOURCE_PRESETS.find(item=>item.id===meta.preset)||SOURCE_PRESETS[0]
  return [{key:meta.key,name:meta.name,description:meta.description,powers:dataBlocks.map(blockLabel),fields:preset.fields}]
}

function connectionKeyForBlock(category:TemplateCategory,seed:TemplateBlock){
  if(String(seed.config.databaseId||'')!=='$database')return ''
  if(category==='Podcast')return seed.type==='widget'&&String(seed.config.widgetType||'')==='quick_capture'?'episodeIdeas':'episodes'
  if(category==='Books')return 'books';if(category==='Budget')return 'transactions';if(category==='Travel')return 'trips';if(category==='Witchy')return 'grimoire';return 'data'
}

function blockLabel(seed:TemplateBlock){
  if(seed.type==='database_view')return 'Database view'
  if(seed.type!=='widget')return 'Connected element'
  const names:Record<string,string>={quick_capture:'Idea capture',database_count:'Record count',mini_kanban:'Production pipeline',recent_records:'Recent records',upcoming_records:'Upcoming records',timeline:'Timeline',gallery_strip:'Gallery',random_record:'Random record',featured_record:'Featured record',goal:'Goal tracker',progress_ring:'Progress',mini_table:'Table',form:'Form',search:'Search'}
  return names[String(seed.config.widgetType||'')]||String(seed.config.label||seed.config.widgetType||'Connected widget')
}

function DataBindingBar({databases,value,onChange}:{databases:Database[];value:string;onChange:(id:string)=>void}){return <div className="atlas-binding-bar"><Link2/><div><strong>Data source</strong><small>{databases.length?'Choose which collection these elements should use.':'No collections yet.'}</small></div><select value={value} disabled={!databases.length} onChange={e=>onChange(e.target.value)}><option value="">No data</option>{databases.map(db=><option key={db.id} value={db.id}>{db.name}</option>)}</select></div>}

function needsDatabase(type:string){return new Set(['todo','progress_ring','goal','quote','database_count','database_aggregate','random_record','featured_record','recent_records','upcoming_records','timeline','mini_kanban','mini_table','gallery_strip','quick_add','quick_capture','form','search','dynamic_text','conditional_text']).has(type)}

function restyleBlock(block:PageBlock,pack:StylePack){const config={...block.config,fontFamily:block.type==='heading'?pack.headingFont:pack.fontFamily,textColor:pack.primary};if(block.type==='widget')return {...config,background:'transparent',primaryColor:pack.primary,secondaryColor:pack.secondary,accentColor:pack.accent,surfaceColor:pack.surface,borderColor:pack.border,fontFamily:pack.fontFamily};if(block.type==='section')return {...config,background:pack.surfaceAlt,border:pack.border};if(block.type==='callout')return {...config,background:pack.surfaceAlt,textColor:pack.primary};if(block.type==='button')return {...config,background:pack.dark,textColor:pack.surface,border:pack.dark};if(block.type==='database_view')return {...config,background:'transparent',textColor:pack.primary};if(block.type==='image'||block.type==='divider')return config;return {...config,background:String(block.config.background||'transparent')==='transparent'?'transparent':pack.surface}}
