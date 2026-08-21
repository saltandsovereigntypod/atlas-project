import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Check, ChevronDown, Droplet, Pipette, Plus, X } from 'lucide-react'
import { loadFontAsset, type AtlasAsset } from '../lib/assets'

export type ColorRole={key:string;label:string;value:unknown;fallback:string;allowGradient?:boolean}

type ColorPickerProps={label:string;value:unknown;fallback:string;allowGradient?:boolean;onChange:(value:string)=>void}

const RECENT_KEY='atlas:recent-design-colors'
const COMMON_FONTS=[
 'Arial, sans-serif','Arial Black, sans-serif','Avenir, sans-serif','Baskerville, serif','Courier New, monospace','Georgia, serif','Garamond, serif','Helvetica, sans-serif','Impact, sans-serif','Palatino, serif','Tahoma, sans-serif','Times New Roman, serif','Trebuchet MS, sans-serif','Verdana, sans-serif'
]

export function ColorRoleStrip({roles,onChange}:{roles:ColorRole[];onChange:(key:string,value:string)=>void}){
 return <div className="atlas-color-role-strip">{roles.map(role=><DesignColorPicker key={role.key} label={role.label} value={role.value} fallback={role.fallback} allowGradient={role.allowGradient} onChange={value=>onChange(role.key,value)}/>)}</div>
}

export function DesignColorPicker({label,value,fallback,allowGradient=false,onChange}:ColorPickerProps){
 const[open,setOpen]=useState(false),[pageColors,setPageColors]=useState<string[]>([]),[recent,setRecent]=useState<string[]>(()=>readRecent())
 const raw=String(value||fallback),gradient=isGradient(raw),initial=gradient?parseGradient(raw):null
 const[mode,setMode]=useState<'solid'|'gradient'>(gradient?'gradient':'solid')
 const[solid,setSolid]=useState(()=>safeHex(raw,fallback)),[from,setFrom]=useState(initial?.from||safeHex(raw,fallback)),[to,setTo]=useState(initial?.to||'#ffffff'),[angle,setAngle]=useState(initial?.angle||90),[gradientType,setGradientType]=useState<'linear'|'radial'>(initial?.type||'linear')
 const root=useRef<HTMLDivElement>(null)
 useEffect(()=>{if(!open)return;setPageColors(collectPageColors());const close=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)};window.addEventListener('pointerdown',close);return()=>window.removeEventListener('pointerdown',close)},[open])
 useEffect(()=>{const next=String(value||fallback);const parsed=parseGradient(next);if(parsed){setMode('gradient');setFrom(parsed.from);setTo(parsed.to);setAngle(parsed.angle);setGradientType(parsed.type)}else{setMode('solid');setSolid(safeHex(next,fallback))}},[value,fallback])
 const commitRecent=(hex:string)=>{const next=[hex.toUpperCase(),...readRecent().filter(item=>item.toUpperCase()!==hex.toUpperCase())].slice(0,10);localStorage.setItem(RECENT_KEY,JSON.stringify(next));setRecent(next)}
 const commitSolid=(hex:string)=>{const next=safeHex(hex,solid);setSolid(next);commitRecent(next);onChange(next)}
 const commitGradient=(a=from,b=to,deg=angle,type=gradientType)=>{commitRecent(a);commitRecent(b);onChange(type==='radial'?`radial-gradient(circle, ${a}, ${b})`:`linear-gradient(${deg}deg, ${a}, ${b})`)}
 const chooseMode=(next:'solid'|'gradient')=>{setMode(next);if(next==='gradient')commitGradient();else commitSolid(solid)}
 const eyedrop=async()=>{const EyeDropper=(window as unknown as {EyeDropper?:new()=>{open:()=>Promise<{sRGBHex:string}>}}).EyeDropper;if(!EyeDropper)return;try{const result=await new EyeDropper().open();commitSolid(result.sRGBHex)}catch{}}
 const preview=mode==='gradient'?(gradientType==='radial'?`radial-gradient(circle, ${from}, ${to})`:`linear-gradient(${angle}deg, ${from}, ${to})`):solid
 return <div className="atlas-color-control" ref={root}>
  <button type="button" className="atlas-color-role" title={`Change ${label}`} onClick={()=>setOpen(v=>!v)}><i style={{background:preview}}/><span>{label}</span></button>
  {open&&<div className="atlas-color-popover" onPointerDown={event=>event.stopPropagation()}>
   <div className="atlas-design-popover-head"><strong>{label}</strong><button type="button" onClick={()=>setOpen(false)}><X/></button></div>
   {allowGradient&&<div className="atlas-segmented"><button className={mode==='solid'?'active':''} onClick={()=>chooseMode('solid')}>Solid</button><button className={mode==='gradient'?'active':''} onClick={()=>chooseMode('gradient')}>Gradient</button></div>}
   {mode==='solid'?<>
    <div className="atlas-color-main-row"><label className="atlas-native-color"><input type="color" value={solid} onChange={event=>commitSolid(event.target.value)}/><span style={{background:solid}}><Droplet/></span></label><input className="atlas-color-hex" value={solid.toUpperCase()} onChange={event=>setSolid(event.target.value)} onBlur={event=>commitSolid(event.target.value)}/>{supportsEyeDropper()&&<button type="button" className="atlas-eyedropper" title="Eyedropper" onClick={()=>void eyedrop()}><Pipette/></button>}</div>
   </>:<div className="atlas-gradient-controls">
    <div className="atlas-segmented compact"><button className={gradientType==='linear'?'active':''} onClick={()=>{setGradientType('linear');commitGradient(from,to,angle,'linear')}}>Linear</button><button className={gradientType==='radial'?'active':''} onClick={()=>{setGradientType('radial');commitGradient(from,to,angle,'radial')}}>Radial</button></div>
    <div className="atlas-gradient-stop-row"><label><span>Start</span><input type="color" value={from} onChange={event=>{const next=event.target.value;setFrom(next);commitGradient(next,to,angle,gradientType)}}/></label><label><span>End</span><input type="color" value={to} onChange={event=>{const next=event.target.value;setTo(next);commitGradient(from,next,angle,gradientType)}}/></label>{gradientType==='linear'&&<label><span>Angle</span><input type="number" min="0" max="360" value={angle} onChange={event=>{const next=Number(event.target.value);setAngle(next);commitGradient(from,to,next,gradientType)}}/></label>}</div>
    <div className="atlas-gradient-preview" style={{background:preview}}/>
   </div>}
   {!!pageColors.length&&<Swatches title="Colors in this page" colors={pageColors} onPick={commitSolid}/>} 
   {!!recent.length&&<Swatches title="Recently used" colors={recent.slice(0,10)} onPick={commitSolid}/>} 
  </div>}
 </div>
}

export function FontPicker({value,fonts=[],onChange}:{value:unknown;fonts?:AtlasAsset[];onChange:(font:string)=>void}){
 const[open,setOpen]=useState(false),[search,setSearch]=useState(''),[custom,setCustom]=useState('')
 const root=useRef<HTMLDivElement>(null),current=String(value||'Georgia, serif')
 useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)};window.addEventListener('pointerdown',close);return()=>window.removeEventListener('pointerdown',close)},[open])
 const options=useMemo(()=>{
  const uploaded=fonts.map(asset=>({label:asset.name,value:String(asset.metadata?.family||asset.name),asset}))
  const common=COMMON_FONTS.map(font=>({label:font.split(',')[0],value:font,asset:undefined as AtlasAsset|undefined}))
  return [...uploaded,...common].filter((item,index,array)=>array.findIndex(other=>other.value===item.value)===index).filter(item=>!search||`${item.label} ${item.value}`.toLowerCase().includes(search.toLowerCase()))
 },[fonts,search])
 const choose=async(item:{value:string;asset?:AtlasAsset})=>{if(item.asset)await loadFontAsset(item.asset);onChange(item.value);setOpen(false)}
 return <div className="atlas-font-picker" ref={root}><button type="button" className="atlas-font-trigger" onClick={()=>setOpen(v=>!v)}><span style={{fontFamily:current}}>{fontLabel(current)}</span><ChevronDown/></button>{open&&<div className="atlas-font-popover" onPointerDown={event=>event.stopPropagation()}><div className="atlas-design-popover-head"><strong>Font</strong><button onClick={()=>setOpen(false)}><X/></button></div><input className="atlas-font-search" autoFocus placeholder="Search fonts" value={search} onChange={event=>setSearch(event.target.value)}/><div className="atlas-font-options">{options.map(item=><button type="button" key={item.value} onClick={()=>void choose(item)} style={{fontFamily:item.value}}><span>{item.label}</span>{item.value===current&&<Check/>}</button>)}</div><div className="atlas-custom-font-row"><input placeholder="Use any installed font name" value={custom} onChange={event=>setCustom(event.target.value)}/><button type="button" disabled={!custom.trim()} onClick={()=>{onChange(custom.trim());setOpen(false);setCustom('')}}><Plus/>Use</button></div></div>}</div>
}

function Swatches({title,colors,onPick}:{title:string;colors:string[];onPick:(hex:string)=>void}){return <div className="atlas-color-swatches"><span>{title}</span><div>{colors.slice(0,14).map(color=><button type="button" key={color} title={color} onClick={()=>onPick(color)} style={{background:color}}/>)}</div></div>}
function readRecent(){try{const value=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');return Array.isArray(value)?value.filter(item=>typeof item==='string'&&/^#[0-9a-f]{6}$/i.test(item)).slice(0,10):[]}catch{return[]}}
function supportsEyeDropper(){return typeof window!=='undefined'&&'EyeDropper'in window}
function safeHex(value:unknown,fallback:string){const text=String(value||'');return /^#[0-9a-f]{6}$/i.test(text)?text:safeHexFallback(fallback)}
function safeHexFallback(value:string){return /^#[0-9a-f]{6}$/i.test(value)?value:'#000000'}
function isGradient(value:string){return /gradient\(/i.test(value)}
function parseGradient(value:string):{type:'linear'|'radial';from:string;to:string;angle:number}|null{const colors=value.match(/#[0-9a-f]{6}/ig);if(!colors||colors.length<2)return null;return{type:/radial-gradient/i.test(value)?'radial':'linear',from:colors[0],to:colors[1],angle:Number(value.match(/(-?\d+(?:\.\d+)?)deg/i)?.[1]||90)}}
function fontLabel(value:string){return value.split(',')[0].replace(/["']/g,'')}
function collectPageColors(){
 if(typeof document==='undefined')return[]
 const colors:string[]=[]
 const push=(value:string)=>{const hex=cssColorToHex(value);if(hex&&!colors.includes(hex))colors.push(hex)}
 const page=document.querySelector('.atlas-page')
 if(!page)return[]
 const nodes=[page,...Array.from(page.querySelectorAll<HTMLElement>('*')).slice(0,650)]
 for(const node of nodes){const style=getComputedStyle(node as Element);push(style.color);push(style.backgroundColor);push(style.borderTopColor);if(colors.length>=24)break}
 return colors
}
function cssColorToHex(value:string){if(/^#[0-9a-f]{6}$/i.test(value))return value.toUpperCase();const match=value.match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);if(!match)return'';return`#${[match[1],match[2],match[3]].map(part=>Math.max(0,Math.min(255,Number(part))).toString(16).padStart(2,'0')).join('').toUpperCase()}`}
