import { Copy, EyeOff, Lock, MoreHorizontal, Palette, Trash2, Unlock } from 'lucide-react'
import { worldToScreen, type WorkspaceViewportState, type WorldRect } from '../lib/workspaceViewport'

export default function FloatingObjectToolbar({rect,viewport,viewportRect,locked,onDuplicate,onDelete,onLock,onMore,onDesign}:{rect:WorldRect;viewport:WorkspaceViewportState;viewportRect:DOMRect|null;locked:boolean;onDuplicate:()=>void;onDelete:()=>void;onLock:()=>void;onMore:()=>void;onDesign?:()=>void}){
 if(!viewportRect)return null
 const anchor=worldToScreen({x:rect.x+rect.width/2,y:rect.y},viewport,{x:viewportRect.left,y:viewportRect.top})
 const width=onDesign?220:184,left=Math.max(viewportRect.left+8,Math.min(viewportRect.right-width-8,anchor.x-width/2)),above=anchor.y-46,top=above>viewportRect.top+8?above:Math.min(viewportRect.bottom-44,anchor.y+rect.height*viewport.zoom+10)
 return <div className="workspace-floating-toolbar" style={{left,top}} role="toolbar" aria-label="Selected object actions">{onDesign&&<button onClick={onDesign} title="Design card"><Palette/></button>}<button onClick={onLock} title={locked?'Unlock object':'Lock object'}>{locked?<Unlock/>:<Lock/>}</button><button onClick={onDuplicate} title="Duplicate"><Copy/></button><button onClick={onMore} title="Advanced inspector"><MoreHorizontal/></button><button onClick={onDelete} title="Delete"><Trash2/></button><span hidden><EyeOff/></span></div>
}
