import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Lock, Maximize, Minus, Palette, Plus, Trash2, Unlock, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppContext } from '../App'
import AtlasWidget from '../components/AtlasWidget'
import DatabaseCanvasView from '../components/DatabaseCanvasView'
import EditorSidebar from '../components/EditorSidebar'
import DocumentEditor from '../components/DocumentEditor'
import FieldInput from '../components/FieldInput'
import { createDocument, createField, createPageBlock, createRecord, deleteField, deletePageBlock, deleteRecord, getDatabase, getDatabases, getDocument, getFields, getOrCreateContextPage, getPage, getPageBlocks, getRecord, getRecords, updateField, updatePage, updatePageBlock, updateRecord } from '../lib/data'
import { displayValue } from '../lib/value'
import type { AtlasAsset } from '../lib/assets'
import type { Database as DatabaseType, Field, FieldType, Page, PageBlock, PageBlockType, RecordRow, WorkspaceSelection } from '../types'
import FloatingObjectToolbar from '../components/FloatingObjectToolbar'
import PageCustomization from '../components/PageCustomization'
import { beginWorkspacePointerTransaction, fitRect, panViewportByWheel, pointerOwner, resizeRect, zoomAt, type ResizeEdge, type WorkspaceViewportState, type WorldRect } from '../lib/workspaceViewport'

type Kind = 'home' | 'page' | 'database' | 'record'
type BlockPatch = Record<string, unknown>
const DEFAULT_CANVAS_HEIGHT = 1100

export default function UniversalPage({ kind }: { kind: Kind }) {
  const params = useParams()
  const navigate = useNavigate()
  const { workspace, user } = useAppContext()
  const [page, setPage] = useState<Page | null>(null)
  const [blocks, setBlocks] = useState<PageBlock[]>([])
  const [databases, setDatabases] = useState<DatabaseType[]>([])
  const [database, setDatabase] = useState<DatabaseType | null>(null)
  const [record, setRecord] = useState<RecordRow | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [selection, setSelection] = useState<WorkspaceSelection | null>(null)
  const [dataOpen, setDataOpen] = useState(false)
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null)
  const [focusedViewId,setFocusedViewId]=useState<string|null>(null)
  const [inspectorOpen,setInspectorOpen]=useState(false),[pageCustomizationOpen,setPageCustomizationOpen]=useState(false),[panning,setPanning]=useState(false)
  const [viewport,setViewport]=useState<WorkspaceViewportState>({zoom:1,panX:40,panY:40})
  const viewportRef=useRef<HTMLDivElement>(null),spacePressed=useRef(false)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const all = await getDatabases(workspace.id)
      setDatabases(all)
      let p: Page
      let db: DatabaseType | null = null
      let rec: RecordRow | null = null
      if (kind === 'home') p = await getOrCreateContextPage(workspace.id, 'home', 'Home', { icon: '✦' })
      else if (kind === 'page') p = await getPage(params.pageId || '')
      else if (kind === 'database') {
        db = await getDatabase(params.databaseId || '')
        p = await getOrCreateContextPage(workspace.id, 'database', db.name, { databaseId: db.id, icon: db.icon || '✦' })
      } else {
        db = await getDatabase(params.databaseId || '')
        rec = await getRecord(params.recordId || '')
        p = await getOrCreateContextPage(workspace.id, 'record', rec.title, { databaseId: db.id, recordId: rec.id, icon: db.icon || '✦' })
      }

      let nextBlocks = await getPageBlocks(p.id)
      const migratedSettings = { ...p.settings }
      let settingsChanged = false

      if (!migratedSettings.canvasTitleMigrated) {
        if (!nextBlocks.some(block => block.config?.systemBinding === 'page_title')) {
          const created = await createPageBlock(p.id, 'heading', nextBlocks.length, {
            systemBinding: 'page_title', x: 60, y: p.cover ? 280 : 45, width: 650, height: 110,
            rotation: 0, zIndex: 20, background: 'transparent', textColor: '#211e1a', radius: 0, padding: 0,
            fontSize: 64, fontWeight: 600, fontFamily: 'Georgia, serif', lineHeight: 1, letterSpacing: -1.5, textAlign: 'left',
          })
          nextBlocks = [...nextBlocks, created]
        }
        migratedSettings.canvasTitleMigrated = true
        migratedSettings.showTitle = false
        settingsChanged = true
      }

      if (!migratedSettings.canvasCoverMigrated) {
        if (p.cover && !nextBlocks.some(block => block.config?.systemBinding === 'page_cover')) {
          const created = await createPageBlock(p.id, 'image', nextBlocks.length, {
            systemBinding: 'page_cover', x: 0, y: 0, width: 920, height: 240, rotation: 0, zIndex: 1,
            background: 'transparent', radius: 0, padding: 0, fit: 'cover', url: p.cover,
          })
          nextBlocks = [...nextBlocks, created]
        }
        migratedSettings.canvasCoverMigrated = true
        settingsChanged = true
      }

      if (settingsChanged) {
        const updated = await updatePage(p.id, { settings: migratedSettings })
        p = updated
      }

      setDatabase(db)
      setRecord(rec)
      setFields(db ? await getFields(db.id) : [])
      setPage(p)
      setBlocks(nextBlocks)
      setSelection(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => { void load() }, [workspace.id, kind, params.pageId, params.databaseId, params.recordId])
  useEffect(()=>{if(!page)return;try{const saved=sessionStorage.getItem(`atlas:viewport:${page.id}`);setViewport(saved?JSON.parse(saved):{zoom:1,panX:40,panY:40})}catch{setViewport({zoom:1,panX:40,panY:40})}},[page?.id])
  useEffect(()=>{if(!page)return;try{sessionStorage.setItem(`atlas:viewport:${page.id}`,JSON.stringify(viewport))}catch{}},[page?.id,viewport])
  useEffect(()=>{const node=viewportRef.current;if(!node||!page)return;const wheel=(event:WheelEvent)=>{event.preventDefault();const rect=node.getBoundingClientRect();if(event.ctrlKey||event.metaKey){setViewport(current=>zoomAt(current,current.zoom*Math.exp(-event.deltaY*.002),{x:event.clientX,y:event.clientY},{x:rect.left,y:rect.top}));return}const visible=blocks.filter(block=>!block.config.hidden);const wheelBounds:WorldRect=visible.length?(()=>{const left=Math.min(...visible.map(block=>Number(block.config.x||0))),top=Math.min(...visible.map(block=>Number(block.config.y||0))),right=Math.max(...visible.map(block=>Number(block.config.x||0)+Number(block.config.width||320))),bottom=Math.max(...visible.map(block=>Number(block.config.y||0)+Number(block.config.height||140)));return{x:left,y:top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)}})():{x:0,y:0,width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight)};setViewport(current=>panViewportByWheel(current,{x:event.deltaX,y:event.deltaY},wheelBounds,{width:node.clientWidth,height:node.clientHeight},120))};node.addEventListener('wheel',wheel,{passive:false});return()=>node.removeEventListener('wheel',wheel)},[page?.id,blocks])
  useEffect(()=>{const down=(event:KeyboardEvent)=>{if(event.code==='Space'&&!isTypingTarget(event.target))spacePressed.current=true},up=(event:KeyboardEvent)=>{if(event.code==='Space')spacePressed.current=false};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}},[])
  const selected = useMemo(() => selection && (selection.kind === 'page_block' || selection.kind === 'database_view') ? blocks.find(block => block.id === selection.id) || null : null, [blocks, selection])
  const canvasHeight = Math.max(600, Number(page?.settings?.canvasHeight || DEFAULT_CANVAS_HEIGHT))
  const contentBounds=useMemo(()=>{const visible=blocks.filter(block=>!block.config.hidden);const right=Math.max(960,...visible.map(block=>Number(block.config.x||0)+Number(block.config.width||320)));const bottom=Math.max(canvasHeight,...visible.map(block=>Number(block.config.y||0)+Number(block.config.height||140)));return{x:0,y:0,width:right+240,height:bottom+240}},[blocks,canvasHeight])
  const layoutLocked=Boolean(page?.settings?.layoutLocked)

  const savePagePatch = async (patch: Partial<Page>) => {
    if (!page) return
    const next = { ...page, ...patch }
    setPage(next)
    const updated = await updatePage(page.id, patch)
    setPage(updated)
  }

  const savePageSettings = async (patch: BlockPatch) => {
    if (!page) return
    const settings = { ...page.settings, ...patch }
    setPage({ ...page, settings })
    const updated = await updatePage(page.id, { settings })
    setPage(updated)
  }

  const saveBlockPatch = async (id: string, patch: BlockPatch) => {
    const current = blocks.find(block => block.id === id)
    if (!current) return
    const config = { ...current.config, ...patch }
    setBlocks(items => items.map(block => block.id === id ? { ...block, config } : block))

    if (current.config?.systemBinding === 'page_title' && typeof patch.text === 'string' && page) {
      setPage({ ...page, title: patch.text })
      await updatePage(page.id, { title: patch.text })
    }
    if (current.config?.systemBinding === 'page_cover' && typeof patch.url === 'string' && page) {
      setPage({ ...page, cover: patch.url })
      await updatePage(page.id, { cover: patch.url })
    }

    const updated = await updatePageBlock(id, { config })
    setBlocks(items => items.map(block => block.id === id ? updated : block))
  }

  const deleteBlock = async (id: string) => {
    await deletePageBlock(id)
    setBlocks(items => items.filter(block => block.id !== id))
    if (selection?.id === id) setSelection(null)
  }

  const duplicateBlock = async (id: string) => {
    if (!page) return
    const source = blocks.find(block => block.id === id)
    if (!source) return
    const maxZ = Math.max(1, ...blocks.map(block => Number(block.config?.zIndex || 1)))
    const config: BlockPatch = {
      ...source.config,
      systemBinding: undefined,
      x: Number(source.config?.x || 0) + 24,
      y: Number(source.config?.y || 0) + 24,
      zIndex: maxZ + 1,
    }
    if (source.config?.systemBinding === 'page_title') config.text = page.title
    if (source.config?.systemBinding === 'page_cover') config.url = page.cover || ''
    const created = await createPageBlock(page.id, source.type, blocks.length, config)
    setBlocks(items => [...items, created])
    setSelection({ kind: created.type === 'database_view' ? 'database_view' : 'page_block', id: created.id })
  }

  const addBlock = async (type: PageBlockType, preset: BlockPatch = {}) => {
    if (!page) return
    const offset = blocks.length % 8
    let config: BlockPatch = {
      x: 60 + offset * 30, y: 90 + offset * 30,
      width: type === 'database_view' || type === 'section' ? 700 : type === 'shape' ? 240 : type === 'widget' ? 360 : 320,
      height: type === 'image' ? 280 : type === 'database_view' ? 390 : type === 'section' ? 320 : type === 'shape' ? 180 : type === 'widget' ? 220 : 140,
      rotation: 0, zIndex: Math.max(1, ...blocks.map(block => Number(block.config?.zIndex || 1))) + 1,
      background: 'transparent', textColor: '#211e1a', radius: 0, padding: 0,
    }
    if (type === 'heading') config = { ...config, text: 'New heading', fontSize: 42, fontWeight: 600, fontFamily: 'Georgia, serif', lineHeight: 1.1, letterSpacing: 0, textAlign: 'left' }
    if (type === 'text') config = { ...config, text: 'Start writing…', fontSize: 17, fontWeight: 400, fontFamily: 'Georgia, serif', lineHeight: 1.5, letterSpacing: 0, textAlign: 'left' }
    if (type === 'callout') config = { ...config, text: 'Add a note…', background: '#f0ebe3', padding: 18, radius: 14, fontSize: 17, fontFamily: 'Georgia, serif' }
    if (type === 'image') config = { ...config, url: '', fit: 'cover', radius: 14 }
    if (type === 'document') { const doc = await createDocument(workspace.id, user.id, 'Untitled document', page.id); config = { ...config, documentId: doc.id, width: 360, height: 190, background: '#fffdfa', radius: 16, padding: 20, displayMode: 'summary', manualSummary: '', documentTags: '', showDocumentMeta: true } }
    if (type === 'audio') config = { ...config, title: 'Audio', width: 420, height: 130, background: '#fffdfa', radius: 16, padding: 18 }
    if (type === 'file') config = { ...config, title: 'Attachment', width: 360, height: 110, background: '#fffdfa', radius: 14, padding: 18 }
    if (type === 'button') config = { ...config, label: 'Button', url: '', background: '#24211d', textColor: '#ffffff', width: 180, height: 60, radius: 12 }
    if (type === 'database_view') config = { ...config, databaseId: database?.id || databases[0]?.id || '', mode: 'gallery', recordLayoutMode: 'auto', title: '', limit: 12, padding: 0 }
    if (type === 'property') config = { ...config, fieldId: '__title__', label: '', display: 'default' }
    if (type === 'metric') config = { ...config, label: 'Total', databaseId: database?.id || databases[0]?.id || '', width: 220, height: 130 }
    if (type === 'progress') config = { ...config, label: 'Progress', fieldId: fields.find(field => field.type === 'number')?.id || '', value: 50, max: 100, width: 360, height: 100 }
    if (type === 'divider') config = { ...config, width: 420, height: 28, dividerColor: '#8f8276' }
    if (type === 'section') config = { ...config, background: '#fffdfa', border: '#ded6cb', borderColor: '#ded6cb', borderWidth: 1, radius: 20, padding: 0, width: 420, height: 260 }
    if (type === 'shape') config = { ...config, shapeKind: 'rectangle', background: '#e7ded2', border: '#cfc3b5', borderColor: '#cfc3b5', borderWidth: 1, radius: 18, padding: 0, width: 240, height: 180 }
    if (type === 'widget') config = { ...config, widgetType: 'digital_clock', background: '#ffffff', textColor: '#211e1a', radius: 18, padding: 20, fontSize: 16, databaseId: database?.id || databases[0]?.id || '' }
    config = { ...config, ...preset }
    const created = await createPageBlock(page.id, type, blocks.length, config)
    setBlocks(items => [...items, created])
    setSelection({ kind: type === 'database_view' ? 'database_view' : 'page_block', id: created.id })
  }

  const insertAsset = async (asset: AtlasAsset) => {
    if (!page || asset.kind === 'font' || asset.kind === 'emoji') return
    const type: PageBlockType = asset.kind === 'audio' ? 'audio' : asset.kind === 'file' ? 'file' : 'image'
    const created = await createPageBlock(page.id, type, blocks.length, {
      assetId: asset.id, url: asset.public_url || '', title: asset.name, mimeType: asset.mime_type,
      x: 70 + (blocks.length % 7) * 24, y: 110 + (blocks.length % 7) * 24,
      width: type === 'audio' ? 420 : 360, height: type === 'image' ? 280 : type === 'audio' ? 130 : 110,
      zIndex: Math.max(1, ...blocks.map(block => Number(block.config?.zIndex || 1))) + 1,
      background: type === 'image' ? 'transparent' : '#fffdfa', radius: 16, padding: type === 'image' ? 0 : 18, fit: 'cover',
    })
    setBlocks(items => [...items, created]); setSelection({ kind: 'page_block', id: created.id })
  }

  const addPageTitle = async () => {
    if (!page) return
    const created = await createPageBlock(page.id, 'heading', blocks.length, {
      systemBinding: 'page_title', x: 60, y: 45, width: 650, height: 110,
      rotation: 0, zIndex: Math.max(1, ...blocks.map(block => Number(block.config?.zIndex || 1))) + 1,
      background: 'transparent', textColor: String(page.settings?.textColor || '#211e1a'), radius: 0, padding: 0,
      fontSize: 64, fontWeight: 600, fontFamily: 'Georgia, serif', lineHeight: 1, letterSpacing: -1.5, textAlign: 'left',
    })
    setBlocks(items => [...items, created])
    setSelection({ kind: 'page_block', id: created.id })
  }

  const addPageCover = async () => {
    if (!page) return
    const created = await createPageBlock(page.id, 'image', blocks.length, {
      systemBinding: 'page_cover', x: 40, y: 40, width: 760, height: 300,
      rotation: 0, zIndex: Math.max(1, ...blocks.map(block => Number(block.config?.zIndex || 1))) + 1,
      background: 'transparent', radius: 0, padding: 0, fit: 'cover', url: page.cover || '',
    })
    setBlocks(items => [...items, created])
    setSelection({ kind: 'page_block', id: created.id })
  }

  const changeZoom=(next:number,pointer?:{x:number;y:number})=>{const rect=viewportRef.current?.getBoundingClientRect();if(!rect)return;const focus=pointer||{x:rect.left+rect.width/2,y:rect.top+rect.height/2};setViewport(current=>zoomAt(current,next,focus,{x:rect.left,y:rect.top}))}
  const panViewport=(event:ReactPointerEvent<HTMLDivElement>)=>{const owner=pointerOwner(event.nativeEvent);const emptyPrimary=event.button===0&&owner==='workspace';if(!emptyPrimary&&event.button!==1&&!spacePressed.current)return;event.preventDefault();setSelection(null);const origin=viewport;beginWorkspacePointerTransaction({event,zoom:1,threshold:emptyPrimary?5:0,onStart:()=>setPanning(true),onMove:(dx,dy)=>setViewport({...origin,panX:origin.panX+dx,panY:origin.panY+dy}),onCommit:()=>setPanning(false)})}
  const fitWorkspace=()=>{const node=viewportRef.current;if(node)setViewport(fitRect(contentBounds,{width:node.clientWidth,height:node.clientHeight}))}
  const fitSelection=()=>{const block=selected,node=viewportRef.current;if(!block||!node)return;setViewport(fitRect(blockRect(block),{width:node.clientWidth,height:node.clientHeight},100))}

  if (error) return <div className="atlas-error"><h2>Atlas could not open this page</h2><p>{error}</p></div>
  if (!page) return <div className="atlas-loading"><div className="spinner" /><p>Opening page…</p></div>

  const overlayHost = typeof document !== 'undefined' ? document.body : null
  const pageStyle: CSSProperties = {
    background: String(page.settings?.background || '#fbfaf7'),
    color: String(page.settings?.textColor || '#211e1a'),
    backgroundImage: page.settings?.backgroundImage ? `url(${String(page.settings.backgroundImage)})` : undefined,
    backgroundSize: String(page.settings?.backgroundSize || 'cover'),
    backgroundPosition: String(page.settings?.backgroundPosition || 'center'),
    backgroundRepeat: String(page.settings?.backgroundRepeat || 'no-repeat'),
  }

  return <div className="atlas-page canvas-first is-live-workspace" style={pageStyle}>
    <header className="canvas-topbar">
      <div className="canvas-breadcrumb">{kind === 'home' ? 'Dashboard' : kind === 'database' ? database?.name : kind === 'record' ? `${database?.name} / ${record?.title}` : page.title}</div>
      <div className="canvas-topbar-actions">
        {kind === 'record' && <button className="canvas-toolbar-button editor-back" onClick={()=>navigate(-1)}><ArrowLeft />Back</button>}
        {database && <button className="canvas-toolbar-button" onClick={()=>setDataOpen(true)}>Data</button>}
        <button className="canvas-toolbar-button" title={layoutLocked?'Unlock layout':'Lock layout'} onClick={()=>void savePageSettings({layoutLocked:!layoutLocked})}>{layoutLocked?<Lock/>:<Unlock/>}</button>
      </div>
    </header>

    <main ref={viewportRef} className={`workspace-viewport ${panning?'is-panning':''}`} data-workspace-pan onPointerDown={panViewport}>
      <div data-workspace-pan style={{position:'absolute',left:0,top:0,transform:`translate(${viewport.panX}px,${viewport.panY}px)`,willChange:'transform'}}>
       <div className="workspace-world" data-workspace-pan style={{position:'relative',left:0,top:0,width:contentBounds.width,height:contentBounds.height,zoom:viewport.zoom,transform:'none',willChange:'auto'} as CSSProperties}>
        <div className="true-canvas" data-workspace-pan style={{ width:contentBounds.width,height:contentBounds.height }}>
         {blocks.map(block => <CanvasBlock key={block.id} block={block} page={page} zoom={viewport.zoom} pageLocked={layoutLocked} selected={selection?.id === block.id} databases={databases} record={record} fields={fields} onRecordChange={setRecord} onOpenDocument={setOpenDocumentId} onSelect={() => setSelection({kind:block.type === 'database_view'?'database_view':'page_block',id:block.id})} onSave={patch => saveBlockPatch(block.id, patch)} onDelete={() => deleteBlock(block.id)} />)}
         {!blocks.length && <button className="canvas-empty-add" onClick={() => addBlock('heading')}><Plus />Add your first element</button>}
        </div>
       </div>
      </div>
    </main>
    <div className="workspace-zoom-controls"><button onClick={()=>changeZoom(viewport.zoom-.1)} aria-label="Zoom out"><Minus/></button><details><summary>{Math.round(viewport.zoom*100)}%</summary><div>{[.25,.5,.75,.9,1,1.1,1.25,1.5,2].map(value=><button key={value} onClick={()=>changeZoom(value)}>{Math.round(value*100)}%</button>)}<button onClick={fitWorkspace}><Maximize/>Fit workspace</button>{selected&&<button onClick={fitSelection}>Fit selection</button>}<button onClick={()=>setViewport({zoom:1,panX:40,panY:40})}>Reset view</button></div></details><button onClick={()=>changeZoom(viewport.zoom+.1)} aria-label="Zoom in"><Plus/></button></div>
    {selected&&<FloatingObjectToolbar rect={blockRect(selected)} viewport={viewport} viewportRect={viewportRef.current?.getBoundingClientRect()||null} locked={Boolean(selected.config.locked)} onDuplicate={()=>void duplicateBlock(selected.id)} onLock={()=>void saveBlockPatch(selected.id,{locked:!selected.config.locked})} onMore={()=>{setPageCustomizationOpen(false);setInspectorOpen(true)}} onDesign={selected.type==='database_view'&&String(selected.config.mode||'gallery')==='canvas'?()=>setFocusedViewId(selected.id):undefined}/>}

    {overlayHost && createPortal(<EditorSidebar
      workspaceId={workspace.id} userId={user.id} page={page} blocks={blocks} selected={selected}
      databases={databases} database={database} record={record} fields={fields} layoutLocked={layoutLocked}
      onAdd={addBlock} onInsertAsset={insertAsset} onAddPageTitle={addPageTitle} onAddPageCover={addPageCover}
      onSelectBlock={id=>setSelection(id?{kind:blocks.find(block=>block.id===id)?.type==='database_view'?'database_view':'page_block',id}:null)} onSaveBlock={saveBlockPatch} onDeleteBlock={deleteBlock} onDuplicateBlock={duplicateBlock}
      inspectorOpen={inspectorOpen} onCloseInspector={()=>setInspectorOpen(false)} onSavePage={savePagePatch} onSavePageSettings={savePageSettings} onOpenData={() => setDataOpen(true)} onRefresh={load}
    />, overlayHost)}
    <button className="page-customization-button" onPointerDown={event=>event.stopPropagation()} onClick={()=>setPageCustomizationOpen(value=>!value)}><Palette/>Page</button>
    {pageCustomizationOpen&&<PageCustomization page={page} blocks={blocks} databases={databases} database={database} onSaveSettings={savePageSettings} onRefresh={load} onClose={()=>setPageCustomizationOpen(false)}/>}

    {dataOpen && <DataDrawer database={database} record={record} databases={databases} fields={fields} onClose={() => setDataOpen(false)} onRecordChange={setRecord} onFieldsChange={setFields} />}
    {openDocumentId && <DocumentEditor id={openDocumentId} onSaved={()=>window.dispatchEvent(new CustomEvent('atlas-document-updated',{detail:{id:openDocumentId}}))} onClose={()=>setOpenDocumentId(null)} />}
    {focusedViewId&&blocks.find(block=>block.id===focusedViewId)&&<div className="focused-card-design" role="dialog" aria-modal="true"><div className="focused-card-design-head"><div><span>CANVAS CARD</span><strong>Focused design</strong></div><button onClick={()=>setFocusedViewId(null)}><X/></button></div><div className="focused-card-design-stage"><DatabaseCanvasView blockId={focusedViewId} config={blocks.find(block=>block.id===focusedViewId)!.config} editing databases={databases} save={patch=>saveBlockPatch(focusedViewId,patch)}/></div></div>}
  </div>
}

function CanvasBlock({ block, page, zoom, pageLocked, selected, databases, record, fields, onRecordChange, onOpenDocument, onSelect, onSave }: { block: PageBlock; page: Page; zoom:number; pageLocked:boolean; selected: boolean; databases: DatabaseType[]; record: RecordRow | null; fields: Field[]; onRecordChange:(record:RecordRow)=>void; onOpenDocument:(id:string)=>void; onSelect: () => void; onSave: (patch: BlockPatch) => void; onDelete: () => void }) {
  const [config, setConfig] = useState<BlockPatch>(block.config)
  useEffect(() => setConfig(block.config), [block.config])

  const locked = Boolean(config.locked)
  const hidden = Boolean(config.hidden)
  const commit = (patch: BlockPatch) => { const next = { ...config, ...patch }; setConfig(next); onSave(patch) }

  const drag = (event: ReactPointerEvent<HTMLElement>) => {if(locked||pageLocked)return;event.preventDefault();event.stopPropagation();const origin={x:Number(config.x||0),y:Number(config.y||0)};beginWorkspacePointerTransaction({event,zoom,onStart:onSelect,onMove:(dx,dy)=>setConfig(current=>({...current,x:Math.max(0,origin.x+dx),y:Math.max(0,origin.y+dy)})),onCommit:()=>setConfig(current=>{onSave({x:current.x,y:current.y});return current})})}
  const resize = (edge:ResizeEdge)=>(event:ReactPointerEvent<HTMLElement>)=>{if(locked||pageLocked)return;event.preventDefault();event.stopPropagation();const origin=blockRect({...block,config});beginWorkspacePointerTransaction({event,zoom,threshold:0,onStart:onSelect,onMove:(dx,dy)=>setConfig(current=>({...current,...resizeRect(origin,edge,dx,dy)})),onCommit:()=>setConfig(current=>{onSave({x:current.x,y:current.y,width:current.width,height:current.height});return current})})}

  if (hidden) return null

  const rotation = Number(config.rotation || 0)
  const borderColor=String(config.borderColor||config.border||'transparent')
  const borderWidth=Number(config.borderWidth??(config.border?1:0))
  const style = {
    left: Number(config.x || 0), top: Number(config.y || 0), width: Number(config.width || 320), height: Number(config.height || 140),
    zIndex: Number(config.zIndex || 1), transform: rotation ? `rotate(${rotation}deg)` : undefined,
    background: String(config.background || 'transparent'), color: String(config.textColor || 'inherit'),
    borderRadius: Number(config.radius || 0), padding: Number(config.padding || 0),
    border: borderWidth ? `${borderWidth}px ${String(config.borderStyle||'solid')} ${borderColor}` : undefined,
    opacity: Number(config.opacity??1), fontFamily:String(config.fontFamily||'inherit'),
    '--atlas-object-font':String(config.fontFamily||'inherit'),
    '--atlas-input-background':String(config.inputBackground||'#ffffff'),
    '--atlas-input-text':String(config.inputTextColor||config.textColor||'inherit'),
    '--atlas-input-border':String(config.inputBorderColor||borderColor||'#d8d0c7'),
    '--atlas-label-color':String(config.labelColor||config.textColor||'currentColor'),
    '--atlas-muted-color':String(config.mutedColor||config.textColor||'currentColor'),
    '--atlas-track-color':String(config.trackColor||'#e6dfd7'),
    '--atlas-fill-color':String(config.fillColor||config.textColor||'#2e2925'),
    '--atlas-divider-color':String(config.dividerColor||config.background||config.textColor||'#2e2925'),
  } as CSSProperties

  return <div data-workspace-object className={`canvas-element ${selected ? 'selected' : ''} ${locked ? 'is-locked' : ''} ${pageLocked?'layout-locked':''} type-${block.type}`} style={style} onContextMenu={event=>{event.preventDefault();onSelect()}} onPointerDown={event=>{if(pointerOwner(event.nativeEvent)==='object'){onSelect();drag(event)}}}>
    {selected&&!locked&&!pageLocked&&<>{!['property','widget'].includes(block.type)&&<button className="object-frame-move-zone" aria-label={`Move ${block.type.replace('_',' ')}`} onPointerDown={drag}/>} {(['n','s','e','w','ne','nw','se','sw'] as ResizeEdge[]).map(edge=><button data-workspace-resize key={edge} className={`object-resize-zone edge-${edge}`} aria-label={`Resize ${edge}`} onPointerDown={resize(edge)}/>)}</>}
    <BlockContent block={block} page={page} config={config} zoom={zoom} manipulating={selected && !locked} databases={databases} record={record} fields={fields} onRecordChange={onRecordChange} onOpenDocument={onOpenDocument} save={commit} />
  </div>
}

function BlockContent({ block, page, config, zoom, manipulating, databases, record, fields, onRecordChange, onOpenDocument, save }: { block: PageBlock; page: Page; config: BlockPatch; zoom:number; manipulating: boolean; databases: DatabaseType[]; record: RecordRow | null; fields: Field[]; onRecordChange:(record:RecordRow)=>void; onOpenDocument:(id:string)=>void; save: (patch: BlockPatch) => void }) {
  const binding = String(config.systemBinding || '')
  if (block.type === 'heading' || block.type === 'text' || block.type === 'callout') {
    const Tag = block.type === 'heading' ? 'h2' : 'div'
    const text = binding === 'page_title' ? page.title : String(config.text || '')
    return <Tag className="canvas-editable-text" contentEditable suppressContentEditableWarning style={{ fontSize: Number(config.fontSize || 17), fontWeight: Number(config.fontWeight || 400), fontFamily: String(config.fontFamily || 'Georgia, serif'), lineHeight: Number(config.lineHeight || 1.2), letterSpacing: Number(config.letterSpacing || 0), textAlign: String(config.textAlign || 'left') as CSSProperties['textAlign'] }} onBlur={event => save({ text: event.currentTarget.textContent || '' })}>{text}</Tag>
  }
  if (block.type === 'image') {
    const url = binding === 'page_cover' ? page.cover : String(config.url || '')
    return url ? <img className="canvas-image" src={url} alt="" style={{ objectFit: String(config.fit || 'cover') as CSSProperties['objectFit'] }} /> : <div className="canvas-image-placeholder"><span>Add an image from the Assets panel</span></div>
  }
  if (block.type === 'document') return <DocumentCard id={String(config.documentId||'')} config={config} onOpen={onOpenDocument}/>
  if (block.type === 'audio') return <div className="canvas-audio"><span>AUDIO</span><strong>{String(config.title||'Audio')}</strong>{config.url?<audio data-workspace-interactive controls src={String(config.url)}/>:<small>Choose audio from Assets</small>}</div>
  if (block.type === 'file') return <div className="canvas-file-shell"><span>FILE</span><a data-workspace-interactive className="canvas-file" href={String(config.url||'#')} target="_blank" rel="noreferrer"><strong>{String(config.title||'Attachment')}</strong><small>{String(config.mimeType||'Open or download')}</small></a></div>
  if (block.type === 'button') return <a data-workspace-interactive className="canvas-action-button" href={String(config.url || '#')}>{String(config.label || 'Button')}</a>
  if (block.type === 'divider') return <div className="canvas-divider" />
  if (block.type === 'database_view') return <DatabaseCanvasView blockId={block.id} config={config} editing={manipulating} zoom={zoom} databases={databases} save={save} />
  if (block.type === 'property') return <PropertyDisplay config={config} record={record} fields={fields} onRecordChange={onRecordChange} />
  if (block.type === 'metric') return <MetricDisplay config={config} />
  if (block.type === 'progress') return <ProgressDisplay config={config} record={record} fields={fields} />
  if (block.type === 'section') return <div className="canvas-box-surface" aria-label="Decorative box"/>
  if (block.type === 'shape') return <div className={`canvas-shape-surface shape-${String(config.shapeKind||'rectangle')}`} aria-label={`${String(config.shapeKind||'rectangle')} shape`}/>
  if (block.type === 'widget') return <AtlasWidget config={config} editing={manipulating} databases={databases} save={save} />
  return null
}

function DocumentCard({id,config,onOpen}:{id:string;config:BlockPatch;onOpen:(id:string)=>void}){
  const[doc,setDoc]=useState<Awaited<ReturnType<typeof getDocument>>|null>(null)
  const reload=()=>{if(id)getDocument(id).then(setDoc).catch(console.error)}
  useEffect(()=>{reload();const handler=(event:Event)=>{const detail=(event as CustomEvent<{id?:string}>).detail;if(!detail?.id||detail.id===id)reload()};window.addEventListener('atlas-document-updated',handler);return()=>window.removeEventListener('atlas-document-updated',handler)},[id])
  const text=(doc?.body||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),words=text?text.split(' ').length:0,mode=String(config.displayMode||'summary'),manual=String(config.manualSummary||'').trim(),summary=manual||text.slice(0,220)||'A focused space for notes and writing.',tags=String(config.documentTags||'').split(',').map(tag=>tag.trim()).filter(Boolean)
  return <div className={`canvas-document-shell document-mode-${mode}`}><button data-workspace-interactive className="canvas-document" onClick={()=>onOpen(id)}><span>DOCUMENT</span><strong>{doc?.title||'Opening document…'}</strong>{mode==='full'&&<p className="document-card-full">{text||summary}</p>}{mode==='summary'&&<p>{summary}</p>}{(mode==='title_tags'||(mode!=='title'&&mode!=='full'&&mode!=='summary'))&&tags.length>0&&<div className="document-card-tags">{tags.map(tag=><i key={tag}>{tag}</i>)}</div>}{(mode==='summary'||mode==='full')&&tags.length>0&&<div className="document-card-tags">{tags.map(tag=><i key={tag}>{tag}</i>)}</div>}{Boolean(config.showDocumentMeta??true)&&mode!=='title'&&<small>{words} words · {doc?new Date(doc.updated_at).toLocaleDateString():''}</small>}</button></div>
}

function PropertyDisplay({ config, record, fields, onRecordChange }: { config: BlockPatch; record: RecordRow | null; fields: Field[]; onRecordChange:(record:RecordRow)=>void }) {
  if (!record) return <div className="canvas-data-empty">This element needs a record page.</div>
  const id = String(config.fieldId || '__title__')
  const field = fields.find(item => item.id === id)
  const value = id === '__title__' ? record.title : field ? record.data?.[field.id] : ''
  const label = String(config.label || field?.name || '')
  const saveValue=async(next:unknown)=>{const updated=id==='__title__'?await updateRecord(record.id,{title:String(next)}):await updateRecord(record.id,{data:{...record.data,[id]:next}});onRecordChange(updated)}
  return <div className="canvas-property">{label && <span>{label}</span>}{id==='__title__'?<input value={record.title} onChange={e=>onRecordChange({...record,title:e.target.value})} onBlur={e=>void saveValue(e.target.value)}/>:field?<FieldInput field={field} value={value} onChange={value=>void saveValue(value)}/>:<strong>{displayValue(value, field) || 'Empty'}</strong>}</div>
}

function MetricDisplay({ config }: { config: BlockPatch }) {
  const databaseId = String(config.databaseId || '')
  const [count, setCount] = useState(0)
  useEffect(() => { if (!databaseId) { setCount(0); return }; getRecords(databaseId).then(items => setCount(items.length)).catch(console.error) }, [databaseId])
  return <div className="canvas-metric"><strong>{count}</strong><span>{String(config.label || 'records')}</span></div>
}

function ProgressDisplay({ config, record, fields }: { config: BlockPatch; record: RecordRow | null; fields: Field[] }) {
  const field = fields.find(item => item.id === String(config.fieldId || ''))
  const raw = field && record ? Number(record.data?.[field.id] || 0) : Number(config.value || 0)
  const max = Math.max(1, Number(config.max || 100))
  const percent = Math.max(0, Math.min(100, (raw / max) * 100))
  return <div className="canvas-progress"><div><span>{String(config.label || 'Progress')}</span><strong>{Math.round(raw)} / {max}</strong></div><div className="canvas-progress-track"><div style={{ width: `${percent}%` }} /></div></div>
}

function DataDrawer({ database, record, databases, fields, onClose, onRecordChange, onFieldsChange }: { database: DatabaseType | null; record: RecordRow | null; databases: DatabaseType[]; fields: Field[]; onClose: () => void; onRecordChange: (record: RecordRow) => void; onFieldsChange: (fields: Field[]) => void }) {
  const [activeDb, setActiveDb] = useState(database?.id || databases[0]?.id || '')
  const [records, setRecords] = useState<RecordRow[]>([])
  const [drawerFields, setDrawerFields] = useState<Field[]>(fields)
  const [tab, setTab] = useState<'records' | 'properties'>('records')
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<FieldType>('text')

  const refresh = async () => {
    if (!activeDb) return
    const [nextRecords, nextFields] = await Promise.all([getRecords(activeDb), getFields(activeDb)])
    setRecords(nextRecords)
    setDrawerFields(nextFields)
    if (database?.id === activeDb) onFieldsChange(nextFields)
  }
  useEffect(() => { void refresh() }, [activeDb])

  const saveCurrentRecord = async (patch: Partial<RecordRow>) => {
    if (!record) return
    onRecordChange(await updateRecord(record.id, { title: patch.title ?? record.title, data: patch.data ?? record.data }))
  }

  return <aside className="canvas-data-drawer">
    <div className="data-drawer-head"><div><span>DATA</span><strong>{record ? record.title : databases.find(item => item.id === activeDb)?.name || 'Workspace data'}</strong></div><button onClick={onClose}><X /></button></div>
    {record && database ? <div className="record-data-editor">
      <label>Title<input value={record.title} onChange={event => onRecordChange({ ...record, title: event.target.value })} onBlur={() => saveCurrentRecord({ title: record.title })} /></label>
      {fields.map(field => <label key={field.id}>{field.name}<FieldInput field={field} value={record.data?.[field.id]} onChange={value => onRecordChange({ ...record, data: { ...record.data, [field.id]: value } })} /><button className="save-field-value" onClick={() => saveCurrentRecord({ data: record.data })}>Save</button></label>)}
    </div> : <>
      <select className="data-source-select" value={activeDb} onChange={event => setActiveDb(event.target.value)}>{databases.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <div className="data-tabs"><button className={tab === 'records' ? 'active' : ''} onClick={() => setTab('records')}>Records</button><button className={tab === 'properties' ? 'active' : ''} onClick={() => setTab('properties')}>Properties</button></div>
      {tab === 'records' ? <div className="data-records-panel"><button className="data-primary-button" onClick={async () => { const created = await createRecord(activeDb, 'Untitled'); setRecords(current => [created, ...current]) }}><Plus />New record</button>{records.map(item => <div className="data-record-row" key={item.id}><Link to={`/database/${activeDb}/record/${item.id}`}>{item.title}<span>Open</span></Link><button title="Delete record" onClick={async () => { if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return; await deleteRecord(item.id); setRecords(current => current.filter(recordItem => recordItem.id !== item.id)) }}><Trash2 /></button></div>)}</div> : <div className="data-properties-panel">
        <div className="new-property-row"><input placeholder="Property name" value={newFieldName} onChange={event => setNewFieldName(event.target.value)} /><select value={newFieldType} onChange={event => setNewFieldType(event.target.value as FieldType)}>{fieldTypes.map(type => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select><button onClick={async () => { if (!newFieldName.trim()) return; await createField(activeDb, { name: newFieldName.trim(), type: newFieldType, required: false, config: {} }, drawerFields.length); setNewFieldName(''); await refresh() }}><Plus /></button></div>
        {drawerFields.map(field => <div className="property-row" key={field.id}><input value={field.name} onChange={event => setDrawerFields(current => current.map(item => item.id === field.id ? { ...item, name: event.target.value } : item))} onBlur={async event => { await updateField(field.id, { name: event.target.value }); await refresh() }} /><select value={field.type} onChange={async event => { await updateField(field.id, { type: event.target.value as FieldType }); await refresh() }}>{fieldTypes.map(type => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select><button className="danger" onClick={async () => { if (!window.confirm(`Delete property “${field.name}”?`)) return; await deleteField(field.id); await refresh() }}><Trash2 /></button></div>)}
      </div>}
    </>}
  </aside>
}

const fieldTypes: FieldType[] = ['text', 'long_text', 'number', 'date', 'checkbox', 'select', 'multi_select', 'url', 'image', 'relation']
function blockRect(block:PageBlock):WorldRect{return{x:Number(block.config.x||0),y:Number(block.config.y||0),width:Number(block.config.width||320),height:Number(block.config.height||140)}}
function isTypingTarget(target:EventTarget|null){const element=target as HTMLElement|null;return Boolean(element?.isContentEditable||element?.matches('input,textarea,select'))}
