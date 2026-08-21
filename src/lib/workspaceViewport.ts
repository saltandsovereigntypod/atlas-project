import type { PointerEvent as ReactPointerEvent } from 'react'

export type WorkspaceViewportState={zoom:number;panX:number;panY:number}
export type ScreenPoint={x:number;y:number}
export type WorldRect={x:number;y:number;width:number;height:number}
export type ResizeEdge='n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw'
export type PointerOwner='workspace'|'object'|'interactive'|'resize'
export const MIN_ZOOM=.25,MAX_ZOOM=2
export const clampZoom=(zoom:number)=>Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,zoom))
export const worldToScreen=(point:ScreenPoint,viewport:WorkspaceViewportState,origin:ScreenPoint={x:0,y:0}):ScreenPoint=>({x:origin.x+viewport.panX+point.x*viewport.zoom,y:origin.y+viewport.panY+point.y*viewport.zoom})
export const screenToWorld=(point:ScreenPoint,viewport:WorkspaceViewportState,origin:ScreenPoint={x:0,y:0}):ScreenPoint=>({x:(point.x-origin.x-viewport.panX)/viewport.zoom,y:(point.y-origin.y-viewport.panY)/viewport.zoom})
export function zoomAt(viewport:WorkspaceViewportState,nextZoom:number,pointer:ScreenPoint,origin:ScreenPoint={x:0,y:0}):WorkspaceViewportState{const zoom=clampZoom(nextZoom),world=screenToWorld(pointer,viewport,origin);return{zoom,panX:pointer.x-origin.x-world.x*zoom,panY:pointer.y-origin.y-world.y*zoom}}
export function fitRect(rect:WorldRect,viewportSize:{width:number;height:number},padding=64):WorkspaceViewportState{const zoom=clampZoom(Math.min((viewportSize.width-padding*2)/Math.max(1,rect.width),(viewportSize.height-padding*2)/Math.max(1,rect.height)));return{zoom,panX:padding-rect.x*zoom,panY:padding-rect.y*zoom}}

/**
 * Mouse-wheel and trackpad navigation is intentionally bounded to meaningful
 * content. Direct canvas dragging remains free and does not use this helper.
 * If a user has manually panned beyond the content bounds, wheel input may move
 * back toward the content but will not push the viewport farther into empty space.
 */
export function panViewportByWheel(viewport:WorkspaceViewportState,delta:{x:number;y:number},content:WorldRect,viewportSize:{width:number;height:number},margin=120):WorkspaceViewportState{
 const x=boundedWheelAxis(viewport.panX,delta.x,content.x,content.x+content.width,viewport.zoom,viewportSize.width,margin)
 const y=boundedWheelAxis(viewport.panY,delta.y,content.y,content.y+content.height,viewport.zoom,viewportSize.height,margin)
 return {...viewport,panX:x,panY:y}
}

function boundedWheelAxis(current:number,wheelDelta:number,worldStart:number,worldEnd:number,zoom:number,viewportLength:number,margin:number){
 const startAligned=margin-worldStart*zoom
 const endAligned=viewportLength-margin-worldEnd*zoom
 const min=Math.min(startAligned,endAligned)
 const max=Math.max(startAligned,endAligned)
 const target=current-wheelDelta
 if(current<min){
  if(target<=current)return current
  return Math.min(target,max)
 }
 if(current>max){
  if(target>=current)return current
  return Math.max(target,min)
 }
 return Math.max(min,Math.min(max,target))
}

type Transaction={event:ReactPointerEvent<HTMLElement>;zoom:number;threshold?:number;onStart?:()=>void;onMove:(dx:number,dy:number)=>void;onCommit:()=>void}
export function beginWorkspacePointerTransaction({event,zoom,threshold=5,onStart,onMove,onCommit}:Transaction){
 const target=event.currentTarget,startX=event.clientX,startY=event.clientY;let active=false
 target.setPointerCapture(event.pointerId)
 const move=(next:PointerEvent)=>{const sx=next.clientX-startX,sy=next.clientY-startY;if(!active&&Math.hypot(sx,sy)<threshold)return;if(!active){active=true;onStart?.()}onMove(sx/zoom,sy/zoom)}
 const finish=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',finish);target.removeEventListener('pointercancel',finish);if(active)onCommit()}
 target.addEventListener('pointermove',move);target.addEventListener('pointerup',finish);target.addEventListener('pointercancel',finish)
}

export function resizeRect(origin:WorldRect,edge:ResizeEdge,dx:number,dy:number,minWidth=70,minHeight=35):WorldRect{let{x,y,width,height}=origin;if(edge.includes('e'))width=Math.max(minWidth,width+dx);if(edge.includes('s'))height=Math.max(minHeight,height+dy);if(edge.includes('w')){const next=Math.min(origin.x+origin.width-minWidth,origin.x+dx);width=origin.width+(origin.x-next);x=Math.max(0,next)}if(edge.includes('n')){const next=Math.min(origin.y+origin.height-minHeight,origin.y+dy);height=origin.height+(origin.y-next);y=Math.max(0,next)}return{x,y,width,height}}

export function pointerOwner(event:{composedPath():EventTarget[]}):PointerOwner{for(const node of event.composedPath()){if(!(node instanceof HTMLElement))continue;if(node.dataset.workspaceResize!==undefined)return'resize';if(node.dataset.workspaceInteractive!==undefined||node.isContentEditable||/^(A|BUTTON|INPUT|SELECT|TEXTAREA|AUDIO|VIDEO)$/.test(node.tagName))return'interactive';if(node.dataset.workspaceObject!==undefined)return'object';if(node.dataset.workspacePan!==undefined)return'workspace'}return'workspace'}
export function positionAnchoredPopover(anchor:{x:number;y:number;width:number;height:number},viewport:{left:number;top:number;right:number;bottom:number},size:{width:number;height:number},gap=10){const centered=anchor.x+anchor.width/2-size.width/2,left=Math.max(viewport.left+8,Math.min(viewport.right-size.width-8,centered));const above=anchor.y-size.height-gap,below=anchor.y+anchor.height+gap;const top=above>=viewport.top+8?above:Math.min(viewport.bottom-size.height-8,below);return{left,top}}
