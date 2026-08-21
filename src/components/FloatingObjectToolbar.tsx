import { Copy, Lock, MoreHorizontal, Palette, SlidersHorizontal, Unlock } from 'lucide-react'
import { positionAnchoredPopover, worldToScreen, type WorkspaceViewportState, type WorldRect } from '../lib/workspaceViewport'

export default function FloatingObjectToolbar({rect,viewport,viewportRect,locked,onDuplicate,onLock,onMore,onDesign}:{rect:WorldRect;viewport:WorkspaceViewportState;viewportRect:DOMRect|null;locked:boolean;onDuplicate:()=>void;onLock:()=>void;onMore:()=>void;onDesign?:()=>void}){
 if(!viewportRect)return null
 const anchor=worldToScreen({x:rect.x+rect.width/2,y:rect.y},viewport,{x:viewportRect.left,y:viewportRect.top})
 const width=onDesign?176:142,position=positionAnchoredPopover({x:anchor.x-rect.width*viewport.zoom/2,y:anchor.y,width:rect.width*viewport.zoom,height:rect.height*viewport.zoom},viewportRect,{width,height:34})
 return <div className="workspace-floating-toolbar" style={position} role="toolbar" aria-label="Selected object actions">{onDesign&&<button onClick={onDesign} title="Design card"><Palette/></button>}<button onClick={onMore} title="Style and advanced controls"><SlidersHorizontal/></button><button onClick={onLock} title={locked?'Unlock object':'Lock object'}>{locked?<Unlock/>:<Lock/>}</button><button onClick={onDuplicate} title="Duplicate"><Copy/></button><button onClick={onMore} title="More"><MoreHorizontal/></button></div>
}
