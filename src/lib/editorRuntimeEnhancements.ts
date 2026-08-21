let installed=false

export function installEditorRuntimeEnhancements(){
 if(installed||typeof document==='undefined')return
 installed=true
 let delay:number|undefined
 let repeat:number|undefined
 const stop=()=>{if(delay!==undefined)window.clearTimeout(delay);if(repeat!==undefined)window.clearInterval(repeat);delay=undefined;repeat=undefined}
 document.addEventListener('pointerdown',event=>{
  const target=event.target as HTMLElement|null
  const button=target?.closest<HTMLButtonElement>('.workspace-zoom-controls > button[aria-label="Zoom out"], .workspace-zoom-controls > button[aria-label="Zoom in"]')
  if(!button||button.disabled)return
  stop()
  delay=window.setTimeout(()=>{
   button.click()
   repeat=window.setInterval(()=>button.click(),70)
  },260)
 },true)
 window.addEventListener('pointerup',stop,true)
 window.addEventListener('pointercancel',stop,true)
 window.addEventListener('blur',stop)

 const syncWidgetRadii=()=>{
  document.querySelectorAll<HTMLElement>('.canvas-element.type-widget').forEach(frame=>{
   const shell=frame.querySelector<HTMLElement>(':scope > .atlas-widget-shell')
   if(!shell)return
   if(shell.dataset.atlasOriginalRadius===undefined)shell.dataset.atlasOriginalRadius=shell.style.borderRadius||''
   const frameRadius=getComputedStyle(frame).borderTopLeftRadius
   const hasFrameRadius=frameRadius&&frameRadius!=='0px'
   const desired=hasFrameRadius?frameRadius:(shell.dataset.atlasOriginalRadius||'0px')
   if(shell.style.getPropertyValue('border-radius')!==desired||shell.style.getPropertyPriority('border-radius')!=='important')shell.style.setProperty('border-radius',desired,'important')
  })
 }
 syncWidgetRadii()
 const observer=new MutationObserver(()=>syncWidgetRadii())
 observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']})
}
