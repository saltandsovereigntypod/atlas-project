import { useMemo, useState } from 'react'
import { LayoutTemplate, Plus, Search, Sparkles } from 'lucide-react'
import { createPageBlock, deletePageBlock, updatePage } from '../lib/data'
import { PAGE_TEMPLATES, resolveTemplateConfig, type TemplateCategory } from '../lib/templates'
import type { Database, Page, PageBlock } from '../types'

type Props = { page:Page; blocks:PageBlock[]; databases:Database[]; database:Database|null }
const categories:Array<'All'|TemplateCategory>=['All','Witchy','Books','Budget','Podcast','Travel','Boards']

export default function TemplatePanel({page,blocks,databases,database}:Props){
  const[category,setCategory]=useState<(typeof categories)[number]>('All')
  const[query,setQuery]=useState('')
  const[busy,setBusy]=useState<string|null>(null)
  const[error,setError]=useState('')
  const[notice,setNotice]=useState('')
  const items=useMemo(()=>PAGE_TEMPLATES.filter(t=>(category==='All'||t.category===category)&&(!query.trim()||`${t.name} ${t.description} ${t.category}`.toLowerCase().includes(query.toLowerCase()))),[category,query])
  const databaseId=database?.id||databases[0]?.id||''

  const apply=async(templateId:string,mode:'replace'|'add')=>{
    const template=PAGE_TEMPLATES.find(t=>t.id===templateId)
    if(!template)return
    if(mode==='replace'&&!window.confirm(`Replace the current visual design with “${template.name}”? Your underlying page and database data will stay intact.`))return
    setBusy(`${templateId}:${mode}`);setError('');setNotice('')
    try{
      if(mode==='replace'){
        await Promise.all(blocks.map(block=>deletePageBlock(block.id)))
        await updatePage(page.id,{settings:{...page.settings,...template.settings}})
      }else{
        await updatePage(page.id,{settings:{...template.settings,...page.settings}})
      }
      const zOffset=mode==='add'?Math.max(0,...blocks.map(b=>Number(b.config?.zIndex||0))):0
      for(let i=0;i<template.blocks.length;i++){
        const seed=template.blocks[i]
        const config=resolveTemplateConfig(seed.config,databaseId)
        if(mode==='add') config.zIndex=Number(config.zIndex||1)+zOffset
        await createPageBlock(page.id,seed.type,(mode==='add'?blocks.length:0)+i,config)
      }
      const refresh=(window as typeof window & {__atlasRefreshPage?:()=>Promise<void>|void}).__atlasRefreshPage
      if(refresh) await refresh()
      setNotice(`${template.name} applied. Keep editing, move anything, or try another template.`)
    }catch(e){setError(e instanceof Error?e.message:String(e))}
    finally{setBusy(null)}
  }

  return <div className="atlas-template-panel">
    <div className="atlas-template-intro"><Sparkles/><div><strong>Templates</strong><span>Designed starting points made from normal Atlas elements. Apply one, then keep editing without leaving this panel.</span></div></div>
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
