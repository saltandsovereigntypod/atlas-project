import type { Page, PageBlock } from '../types'
import { STYLE_PACKS, type StylePack } from './creativePresets'
import { updatePage, updatePageBlock } from './data'

export function styleBlockConfig(block:PageBlock,pack:StylePack){
  const config={...block.config,fontFamily:block.type==='heading'?pack.headingFont:pack.fontFamily,textColor:pack.primary}
  if(block.type==='widget')return {...config,background:'transparent',primaryColor:pack.primary,secondaryColor:pack.secondary,accentColor:pack.accent,surfaceColor:pack.surface,borderColor:pack.border,fontFamily:pack.fontFamily}
  if(block.type==='section')return {...config,background:pack.surfaceAlt,border:pack.border}
  if(block.type==='callout')return {...config,background:pack.surfaceAlt,textColor:pack.primary}
  if(block.type==='button')return {...config,background:pack.dark,textColor:pack.surface,border:pack.dark}
  if(block.type==='database_view')return {...config,background:'transparent',textColor:pack.primary}
  if(block.type==='image'||block.type==='divider')return config
  return {...config,background:String(block.config.background||'transparent')==='transparent'?'transparent':pack.surface}
}

export async function applyPageStylePack(page:Page,blocks:PageBlock[],styleId:string){
  const pack=STYLE_PACKS.find(item=>item.id===styleId)
  if(!pack)throw new Error('Atlas could not find that page style.')
  await updatePage(page.id,{settings:{...page.settings,background:pack.page.background,textColor:pack.page.textColor,stylePackId:pack.id}})
  await Promise.all(blocks.map(block=>updatePageBlock(block.id,{config:styleBlockConfig(block,pack)})))
  return pack
}
