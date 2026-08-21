import { Copy, Lock, MoreHorizontal, Palette, SlidersHorizontal, Unlock } from 'lucide-react'
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
  if(!viewportRect)return null
  const anchor=worldToScreen({x:rect.x+rect.width/2,y:rect.y},viewport,{x:viewportRect.left,y:viewportRect.top})
  const width=onDesign?176:142
  const position=positionAnchoredPopover({x:anchor.x-rect.width*viewport.zoom/2,y:anchor.y,width:rect.width*viewport.zoom,height:rect.height*viewport.zoom},viewportRect,{width,height:34})
  const action=(callback:()=>void)=>(event:React.MouseEvent<HTMLButtonElement>)=>{event.preventDefault();event.stopPropagation();callback()}
  return <div data-workspace-interactive className="workspace-floating-toolbar" style={position} role="toolbar" aria-label="Selected object actions" onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}>
    {onDesign&&<button type="button" onClick={action(onDesign)} title="Design card"><Palette/></button>}
    <button type="button" onClick={action(onMore)} title="Style and advanced controls"><SlidersHorizontal/></button>
    <button type="button" onClick={action(onLock)} title={locked?'Unlock object':'Lock object'}>{locked?<Unlock/>:<Lock/>}</button>
    <button type="button" onClick={action(onDuplicate)} title="Duplicate"><Copy/></button>
    <button type="button" onClick={action(onMore)} title="More"><MoreHorizontal/></button>
  </div>
}
