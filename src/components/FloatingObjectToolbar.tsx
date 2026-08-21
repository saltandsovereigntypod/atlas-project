import { Copy, Lock, MoreHorizontal, Palette, SlidersHorizontal, Unlock } from 'lucide-react'
import { useState } from 'react'
import { positionAnchoredPopover, worldToScreen, type WorkspaceViewportState, type WorldRect } from '../lib/workspaceViewport'

type Props={
  rect:WorldRect
  viewport:WorkspaceViewportState
  viewportRect:DOMRect|null
  locked:boolean
  onDuplicate:()=>void
  onLock:()=>void
  onMore:()=>void
  onDesign?:()=>void
}

export default function FloatingObjectToolbar({rect,viewport,viewportRect,locked,onDuplicate,onLock,onMore,onDesign}:Props){
  const[menuOpen,setMenuOpen]=useState(false)
  if(!viewportRect)return null
  const anchor=worldToScreen({x:rect.x+rect.width/2,y:rect.y},viewport,{x:viewportRect.left,y:viewportRect.top})
  const position=positionAnchoredPopover({x:anchor.x-rect.width*viewport.zoom/2,y:anchor.y,width:rect.width*viewport.zoom,height:rect.height*viewport.zoom},viewportRect,{width:150,height:38})
  const action=(callback:()=>void)=>(event:React.MouseEvent<HTMLButtonElement>)=>{event.preventDefault();event.stopPropagation();setMenuOpen(false);callback()}
  return <div data-workspace-interactive className="workspace-floating-toolbar-wrap" style={position} onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}>
    <div className="workspace-floating-toolbar" role="toolbar" aria-label="Selected object actions">
      <button type="button" className="toolbar-style-action" onClick={action(onMore)} title="Style"><SlidersHorizontal/><span>Style</span></button>
      <button type="button" onClick={action(onLock)} title={locked?'Unlock object':'Lock object'}>{locked?<Unlock/>:<Lock/>}</button>
      <button type="button" aria-expanded={menuOpen} onClick={event=>{event.preventDefault();event.stopPropagation();setMenuOpen(value=>!value)}} title="More actions"><MoreHorizontal/></button>
    </div>
    {menuOpen&&<div className="workspace-object-menu" role="menu">
      <button type="button" role="menuitem" onClick={action(onDuplicate)}><Copy/>Duplicate</button>
      {onDesign&&<button type="button" role="menuitem" onClick={action(onDesign)}><Palette/>Design card</button>}
      <button type="button" role="menuitem" onClick={action(onMore)}><SlidersHorizontal/>Open inspector</button>
    </div>}
  </div>
}
