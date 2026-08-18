import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, BarChart3, Clock3, Copy, Database, Eye, EyeOff, Heading, Image, Layers, LayoutTemplate, Lock, Minus, MousePointer2, Palette, Plus, Quote, SlidersHorizontal, Square, Trash2, Type, Unlock, Upload } from 'lucide-react'
import { deleteAsset, getAssets, loadFontAsset, uploadAsset, type AtlasAsset } from '../lib/assets'
import { deleteDatabase, deletePage, deleteRecord } from '../lib/data'
import type { Database as DatabaseType, Field, Page, PageBlock, PageBlockType, RecordRow } from '../types'
import TemplatePanel from './TemplatePanel'
import WidgetSettings from './WidgetSettings'

type Patch = Record<string, unknown>
type Tab = 'add' | 'design' | 'layers' | 'templates' | 'page' | 'assets'

type Props = {
  workspaceId: string
  userId: string
  page: Page
  blocks: PageBlock[]
  selected: PageBlock | null
  databases: DatabaseType[]
  database: DatabaseType | null
  record: RecordRow | null
  fields: Field[]
  onAdd: (type: PageBlockType) => void
  onAddPageTitle: () => void
  onAddPageCover: () => void
  onSelectBlock: (id: string | null) => void
  onSaveBlock: (id: string, patch: Patch) => void
  onDeleteBlock: (id: string) => void
  onDuplicateBlock: (id: string) => void
  onSavePage: (patch: Partial<Page>) => void
  onSavePageSettings: (patch: Patch) => void
  onOpenData: () => void
  onDone: () => void
}

export default function EditorSidebar(props: Props) {
  const { page, selected, blocks } = props
  const [tab, setTab] = useState<Tab>('add')
  const [assets, setAssets] = useState<AtlasAsset[]>([])
  const [assetError, setAssetError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragLayerId, setDragLayerId] = useState<string | null>(null)

  const refreshAssets = async () => {
    try { setAssetError(''); setAssets(await getAssets(props.workspaceId)) }
    catch (e) { setAssetError(e instanceof Error ? e.message : String(e)) }
  }
  useEffect(() => { void refreshAssets() }, [props.workspaceId])
  useEffect(() => { if (selected) setTab('design') }, [selected?.id])

  const orderedLayers = useMemo(() => [...blocks].sort((a, b) => num(b.config.zIndex, 1) - num(a.config.zIndex, 1)), [blocks])
  const images = useMemo(() => assets.filter(asset => asset.kind === 'image'), [assets])
  const fonts = useMemo(() => assets.filter(asset => asset.kind === 'font'), [assets])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select') || target?.isContentEditable || !selected) return
      const step = event.shiftKey ? 10 : 1
      const x = num(selected.config.x, 0), y = num(selected.config.y, 0), z = num(selected.config.zIndex, 1)
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); props.onDeleteBlock(selected.id); return }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); props.onDuplicateBlock(selected.id); return }
      if (event.key === 'ArrowLeft') { event.preventDefault(); props.onSaveBlock(selected.id, { x: Math.max(0, x - step) }) }
      if (event.key === 'ArrowRight') { event.preventDefault(); props.onSaveBlock(selected.id, { x: x + step }) }
      if (event.key === 'ArrowUp') { event.preventDefault(); props.onSaveBlock(selected.id, { y: Math.max(0, y - step) }) }
      if (event.key === 'ArrowDown') { event.preventDefault(); props.onSaveBlock(selected.id, { y: y + step }) }
      if ((event.metaKey || event.ctrlKey) && event.key === ']') { event.preventDefault(); props.onSaveBlock(selected.id, { zIndex: z + 1 }) }
      if ((event.metaKey || event.ctrlKey) && event.key === '[') { event.preventDefault(); props.onSaveBlock(selected.id, { zIndex: Math.max(1, z - 1) }) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, props.onDeleteBlock, props.onDuplicateBlock, props.onSaveBlock])

  const upload = async (file: File, kind: 'image' | 'font') => {
    setUploading(true)
    try { const created = await uploadAsset(props.workspaceId, props.userId, file, kind); setAssets(current => [created, ...current]); if (kind === 'font') await loadFontAsset(created) }
    catch (e) { setAssetError(e instanceof Error ? e.message : String(e)) }
    finally { setUploading(false) }
  }
  const applyFont = async (asset: AtlasAsset) => { if (!selected) return; props.onSaveBlock(selected.id, { fontFamily: await loadFontAsset(asset) }) }
  const reorderLayers = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return
    const next = [...orderedLayers], from = next.findIndex(layer => layer.id === draggedId), to = next.findIndex(layer => layer.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = next.splice(from, 1); next.splice(to, 0, moved)
    next.forEach((layer, index) => props.onSaveBlock(layer.id, { zIndex: next.length - index }))
  }

  return <div className="atlas-edit-rail">
    <div className="atlas-edit-rail-head"><div><span>EDITING</span><strong>{page.title}</strong></div><button onClick={props.onDone}>Done</button></div>
    <div className="atlas-edit-tabs six">
      <button className={tab === 'add' ? 'active' : ''} onClick={() => setTab('add')}><Plus />Add</button>
      <button className={tab === 'design' ? 'active' : ''} onClick={() => setTab('design')}><SlidersHorizontal />Design</button>
      <button className={tab === 'layers' ? 'active' : ''} onClick={() => setTab('layers')}><Layers />Layers</button>
      <button className={tab === 'templates' ? 'active' : ''} onClick={() => setTab('templates')}><LayoutTemplate />Templates</button>
      <button className={tab === 'page' ? 'active' : ''} onClick={() => setTab('page')}><Palette />Page</button>
      <button className={tab === 'assets' ? 'active' : ''} onClick={() => setTab('assets')}><Image />Assets</button>
    </div>
    <div className="atlas-edit-scroll">
      {tab === 'add' && <AddPanel onAdd={props.onAdd} canProperty={Boolean(props.record)} />}
      {tab === 'design' && <DesignPanel {...props} images={images} fonts={fonts} />}
      {tab === 'layers' && <LayersPanel layers={orderedLayers} selectedId={selected?.id || null} onSelect={props.onSelectBlock} onPatch={props.onSaveBlock} onDelete={props.onDeleteBlock} onDuplicate={props.onDuplicateBlock} onDragStart={setDragLayerId} onDrop={id => { if (dragLayerId) reorderLayers(dragLayerId, id); setDragLayerId(null) }} />}
      {tab === 'templates' && <TemplatePanel page={page} blocks={blocks} databases={props.databases} database={props.database} />}
      {tab === 'page' && <PagePanel {...props} />}
      {tab === 'assets' && <AssetsPanel images={images} fonts={fonts} uploading={uploading} error={assetError} upload={upload} onDelete={async asset => { await deleteAsset(asset); setAssets(current => current.filter(item => item.id !== asset.id)) }} applyImage={asset => selected && props.onSaveBlock(selected.id, { url: asset.public_url || '' })} applyFont={applyFont} />}
    </div>
    <div className="atlas-edit-rail-footer"><button onClick={props.onOpenData}><Database />Open data</button></div>
  </div>
}

function AddPanel({ onAdd, canProperty }: { onAdd: (type: PageBlockType) => void; canProperty: boolean }) {
  return <>
    <PanelTitle>Text</PanelTitle><div className="atlas-add-grid"><Add icon={<Heading />} label="Heading" onClick={() => onAdd('heading')} /><Add icon={<Type />} label="Text" onClick={() => onAdd('text')} /><Add icon={<Quote />} label="Callout" onClick={() => onAdd('callout')} /><Add icon={<Minus />} label="Divider" onClick={() => onAdd('divider')} /></div>
    <PanelTitle>Widgets</PanelTitle><div className="atlas-add-grid"><Add icon={<Clock3 />} label="Widget library" onClick={() => onAdd('widget')} /></div><p className="atlas-helper">Add a widget, then choose a type or a premade Witchy, Budget, Books, Podcast, or Productivity preset in Design.</p>
    <PanelTitle>Data</PanelTitle><div className="atlas-add-grid"><Add icon={<Database />} label="Database view" onClick={() => onAdd('database_view')} />{canProperty && <Add icon={<SlidersHorizontal />} label="Property" onClick={() => onAdd('property')} />}<Add icon={<BarChart3 />} label="Metric" onClick={() => onAdd('metric')} /><Add icon={<BarChart3 />} label="Progress" onClick={() => onAdd('progress')} /></div>
    <PanelTitle>Media & layout</PanelTitle><div className="atlas-add-grid"><Add icon={<Image />} label="Image" onClick={() => onAdd('image')} /><Add icon={<MousePointer2 />} label="Button" onClick={() => onAdd('button')} /><Add icon={<Square />} label="Section" onClick={() => onAdd('section')} /></div>
  </>
}
function Add({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) { return <button className="atlas-add-tile" onClick={onClick}>{icon}<span>{label}</span></button> }
function PanelTitle({ children }: { children: ReactNode }) { return <div className="atlas-edit-section-title">{children}</div> }

function DesignPanel(props: Props & { images: AtlasAsset[]; fonts: AtlasAsset[] }) {
  const block = props.selected
  if (!block) return <div className="atlas-edit-empty"><Layers /><strong>Select something on the canvas</strong><p>Its full design controls will appear here.</p></div>
  const config = block.config, save = (patch: Patch) => props.onSaveBlock(block.id, patch)
  const isText = ['heading', 'text', 'callout'].includes(block.type)
  const maxZ = Math.max(1, ...props.blocks.map(layer => num(layer.config.zIndex, 1)))
  const boundLabel = config.systemBinding === 'page_title' ? 'Page title' : config.systemBinding === 'page_cover' ? 'Page cover' : block.type === 'widget' ? String(config.widgetType || 'Widget').replaceAll('_',' ') : block.type.replace('_', ' ')

  return <div className="atlas-design-panel">
    <div className="atlas-selected-name"><span>{boundLabel}</span><div className="atlas-selected-actions"><button title="Duplicate" onClick={() => props.onDuplicateBlock(block.id)}><Copy /></button><button title="Delete" onClick={() => props.onDeleteBlock(block.id)}><Trash2 /></button></div></div>
    <div className="atlas-shortcut-hint">Delete deletes · Ctrl/Cmd+D duplicates · Arrows nudge · Shift+Arrows moves 10px · Ctrl/Cmd+[ ] changes layer</div>
    <div className="atlas-lock-row"><button className={config.locked ? 'active' : ''} onClick={() => save({ locked: !config.locked })}>{config.locked ? <Lock /> : <Unlock />}{config.locked ? 'Locked' : 'Unlocked'}</button><button className={config.hidden ? 'active' : ''} onClick={() => save({ hidden: !config.hidden })}>{config.hidden ? <EyeOff /> : <Eye />}{config.hidden ? 'Hidden' : 'Visible'}</button></div>

    <PanelTitle>Position & size</PanelTitle>
    <div className="atlas-control-grid four"><Control label="X"><input type="number" value={num(config.x, 0)} onChange={e => save({ x: +e.target.value })} /></Control><Control label="Y"><input type="number" value={num(config.y, 0)} onChange={e => save({ y: +e.target.value })} /></Control><Control label="W"><input type="number" value={num(config.width, 320)} onChange={e => save({ width: +e.target.value })} /></Control><Control label="H"><input type="number" value={num(config.height, 140)} onChange={e => save({ height: +e.target.value })} /></Control></div>
    <div className="atlas-control-grid two"><Control label="Rotation"><input type="number" value={num(config.rotation, 0)} onChange={e => save({ rotation: +e.target.value })} /></Control><Control label="Layer"><input type="number" min="1" value={num(config.zIndex, 1)} onChange={e => save({ zIndex: +e.target.value })} /></Control></div>
    <div className="atlas-layer-actions"><button onClick={() => save({ zIndex: maxZ + 1 })}>To front</button><button onClick={() => save({ zIndex: num(config.zIndex, 1) + 1 })}><ArrowUp />Forward</button><button onClick={() => save({ zIndex: Math.max(1, num(config.zIndex, 1) - 1) })}><ArrowDown />Backward</button><button onClick={() => save({ zIndex: 1 })}>To back</button></div>

    <PanelTitle>Appearance</PanelTitle>
    <div className="atlas-control-grid two"><Control label="Background"><input type="color" value={color(config.background, '#ffffff')} onChange={e => save({ background: e.target.value })} /></Control><Control label="Text"><input type="color" value={color(config.textColor, '#211e1a')} onChange={e => save({ textColor: e.target.value })} /></Control></div>
    <div className="atlas-control-grid two"><Control label="Corners"><input type="number" min="0" value={num(config.radius, 0)} onChange={e => save({ radius: +e.target.value })} /></Control><Control label="Padding"><input type="number" min="0" value={num(config.padding, 0)} onChange={e => save({ padding: +e.target.value })} /></Control></div>

    {isText && <><PanelTitle>Typography</PanelTitle><Control label="Font"><select value={String(config.fontFamily || 'Georgia, serif')} onChange={e => save({ fontFamily: e.target.value })}><option value="Georgia, serif">Georgia</option><option value="Arial, sans-serif">Arial</option><option value="Verdana, sans-serif">Verdana</option><option value="'Courier New', monospace">Courier New</option>{props.fonts.map(font => <option key={font.id} value={String(font.metadata?.family || font.name)}>{font.name}</option>)}</select></Control><div className="atlas-control-grid two"><Control label="Size"><input type="number" min="8" value={num(config.fontSize, block.type === 'heading' ? 40 : 17)} onChange={e => save({ fontSize: +e.target.value })} /></Control><Control label="Weight"><select value={String(config.fontWeight || 400)} onChange={e => save({ fontWeight: +e.target.value })}><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra bold</option></select></Control></div><div className="atlas-control-grid two"><Control label="Line height"><input type="number" min=".6" max="3" step=".05" value={num(config.lineHeight, 1.2)} onChange={e => save({ lineHeight: +e.target.value })} /></Control><Control label="Letter spacing"><input type="number" step=".1" value={num(config.letterSpacing, 0)} onChange={e => save({ letterSpacing: +e.target.value })} /></Control></div><div className="atlas-align-row"><button className={config.textAlign === 'left' || !config.textAlign ? 'active' : ''} onClick={() => save({ textAlign: 'left' })}><AlignLeft /></button><button className={config.textAlign === 'center' ? 'active' : ''} onClick={() => save({ textAlign: 'center' })}><AlignCenter /></button><button className={config.textAlign === 'right' ? 'active' : ''} onClick={() => save({ textAlign: 'right' })}><AlignRight /></button></div></>}
    {block.type === 'widget' && <><PanelTitle>Widget</PanelTitle><WidgetSettings config={config} databases={props.databases} save={save} /></>}
    {block.type === 'image' && <><PanelTitle>Image</PanelTitle><Control label="Fit"><select value={String(config.fit || 'cover')} onChange={e => save({ fit: e.target.value })}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option></select></Control>{props.images.length > 0 && <div className="atlas-asset-mini-grid">{props.images.slice(0, 8).map(asset => <button key={asset.id} onClick={() => save({ url: asset.public_url || '' })}><img src={asset.public_url || ''} alt="" /></button>)}</div>}</>}
    {block.type === 'button' && <><PanelTitle>Button</PanelTitle><Control label="Text"><input value={String(config.label || '')} onChange={e => save({ label: e.target.value })} /></Control><Control label="Link"><input value={String(config.url || '')} onChange={e => save({ url: e.target.value })} /></Control></>}
    {block.type === 'database_view' && <><PanelTitle>Database view</PanelTitle><Control label="Source"><select value={String(config.databaseId || '')} onChange={e => save({ databaseId: e.target.value })}>{props.databases.map(db => <option key={db.id} value={db.id}>{db.name}</option>)}</select></Control><div className="atlas-control-grid two"><Control label="Display"><select value={String(config.mode || 'gallery')} onChange={e => save({ mode: e.target.value })}><option value="gallery">Gallery</option><option value="table">Table</option><option value="board">Board</option></select></Control><Control label="Record layout"><select value={String(config.recordLayoutMode || 'auto')} onChange={e => save({ recordLayoutMode: e.target.value })}><option value="auto">Auto</option><option value="freeform">Freeform</option></select></Control></div><div className="atlas-control-grid two"><Control label="Limit"><input type="number" min="1" max="100" value={num(config.limit, 12)} onChange={e => save({ limit: +e.target.value })} /></Control><Control label="Title"><input value={String(config.title || '')} onChange={e => save({ title: e.target.value })} /></Control></div></>}
    {block.type === 'property' && props.record && <><PanelTitle>Data binding</PanelTitle><Control label="Property"><select value={String(config.fieldId || '__title__')} onChange={e => save({ fieldId: e.target.value })}><option value="__title__">Record title</option>{props.fields.map(field => <option key={field.id} value={field.id}>{field.name}</option>)}</select></Control><Control label="Label"><input value={String(config.label || '')} onChange={e => save({ label: e.target.value })} /></Control></>}
    {block.type === 'progress' && <><PanelTitle>Progress data</PanelTitle><Control label="Label"><input value={String(config.label || '')} onChange={e => save({ label: e.target.value })} /></Control>{props.record && <Control label="Number property"><select value={String(config.fieldId || '')} onChange={e => save({ fieldId: e.target.value })}><option value="">Manual value</option>{props.fields.filter(field => field.type === 'number').map(field => <option key={field.id} value={field.id}>{field.name}</option>)}</select></Control>}<div className="atlas-control-grid two"><Control label="Value"><input type="number" disabled={Boolean(config.fieldId)} value={num(config.value, 0)} onChange={e => save({ value: +e.target.value })} /></Control><Control label="Maximum"><input type="number" min="1" value={num(config.max, 100)} onChange={e => save({ max: +e.target.value })} /></Control></div></>}
    {block.type === 'metric' && <><PanelTitle>Metric data</PanelTitle><Control label="Label"><input value={String(config.label || '')} onChange={e => save({ label: e.target.value })} /></Control><Control label="Database"><select value={String(config.databaseId || '')} onChange={e => save({ databaseId: e.target.value })}>{props.databases.map(db => <option key={db.id} value={db.id}>{db.name}</option>)}</select></Control></>}
    {block.type === 'section' && <><PanelTitle>Section</PanelTitle><Control label="Title"><input value={String(config.title || '')} onChange={e => save({ title: e.target.value })} /></Control></>}
  </div>
}

function LayersPanel({ layers, selectedId, onSelect, onPatch, onDelete, onDuplicate, onDragStart, onDrop }: { layers: PageBlock[]; selectedId: string | null; onSelect: (id: string | null) => void; onPatch: (id: string, patch: Patch) => void; onDelete: (id: string) => void; onDuplicate: (id: string) => void; onDragStart: (id: string) => void; onDrop: (id: string) => void }) {
  return <div className="atlas-layers-panel"><div className="atlas-layer-help"><Layers /><div><strong>Front to back</strong><span>Drag rows to reorder. Lock, hide, duplicate, select, or delete any visual element here.</span></div></div>{layers.length ? <div className="atlas-layer-list">{layers.map(layer => <div key={layer.id} className={`atlas-layer-row ${selectedId === layer.id ? 'active' : ''}`} draggable onDragStart={() => onDragStart(layer.id)} onDragOver={(event: DragEvent) => event.preventDefault()} onDrop={(event: DragEvent) => { event.preventDefault(); onDrop(layer.id) }}><button className="atlas-layer-main" onClick={() => onSelect(layer.id)}><span className="atlas-layer-grip">⋮⋮</span><span className="atlas-layer-name">{layerName(layer)}</span><small>z {num(layer.config.zIndex, 1)}</small></button><div className="atlas-layer-row-actions"><button title={layer.config.hidden ? 'Show' : 'Hide'} onClick={() => onPatch(layer.id, { hidden: !layer.config.hidden })}>{layer.config.hidden ? <EyeOff /> : <Eye />}</button><button title={layer.config.locked ? 'Unlock' : 'Lock'} onClick={() => onPatch(layer.id, { locked: !layer.config.locked })}>{layer.config.locked ? <Lock /> : <Unlock />}</button><button title="Duplicate" onClick={() => onDuplicate(layer.id)}><Copy /></button><button title="Delete" className="danger" onClick={() => onDelete(layer.id)}><Trash2 /></button></div></div>)}</div> : <p className="atlas-helper">Add something to the page and it will appear here.</p>}</div>
}

function PagePanel(props: Props) {
  const page = props.page
  const hasBoundTitle = props.blocks.some(block => block.config.systemBinding === 'page_title'), hasBoundCover = props.blocks.some(block => block.config.systemBinding === 'page_cover')
  const deleteCurrent = async () => {
    if (page.context_type === 'home') return
    const label = page.context_type === 'database' ? `database “${props.database?.name || page.title}” and its records` : page.context_type === 'record' ? `record “${props.record?.title || page.title}”` : `page “${page.title}”`
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return
    if (page.context_type === 'database' && props.database) await deleteDatabase(props.database.id)
    else if (page.context_type === 'record' && props.record) await deleteRecord(props.record.id)
    else await deletePage(page.id)
    window.location.hash = page.context_type === 'record' && props.database ? `#/database/${props.database.id}` : '#/'
  }
  return <div><PanelTitle>Page identity</PanelTitle><Control label="Navigation title"><input value={page.title} onChange={e => props.onSavePage({ title: e.target.value })} /></Control><Control label="Sidebar icon / emoji"><input value={page.icon || ''} onChange={e => props.onSavePage({ icon: e.target.value })} /></Control><div className="atlas-page-bound-actions"><button disabled={hasBoundTitle} onClick={props.onAddPageTitle}><Heading />{hasBoundTitle ? 'Title is on canvas' : 'Add page title to canvas'}</button><button disabled={hasBoundCover} onClick={props.onAddPageCover}><Image />{hasBoundCover ? 'Cover is on canvas' : 'Add page cover to canvas'}</button></div><PanelTitle>Canvas background</PanelTitle><div className="atlas-control-grid two"><Control label="Color"><input type="color" value={color(page.settings?.background, '#fbfaf7')} onChange={e => props.onSavePageSettings({ background: e.target.value })} /></Control><Control label="Text"><input type="color" value={color(page.settings?.textColor, '#211e1a')} onChange={e => props.onSavePageSettings({ textColor: e.target.value })} /></Control></div><Control label="Background image URL"><input value={String(page.settings?.backgroundImage || '')} placeholder="Optional" onChange={e => props.onSavePageSettings({ backgroundImage: e.target.value })} /></Control><div className="atlas-control-grid two"><Control label="Image fit"><select value={String(page.settings?.backgroundSize || 'cover')} onChange={e => props.onSavePageSettings({ backgroundSize: e.target.value })}><option value="cover">Cover</option><option value="contain">Contain</option><option value="auto">Natural size</option><option value="100% 100%">Stretch</option></select></Control><Control label="Position"><select value={String(page.settings?.backgroundPosition || 'center')} onChange={e => props.onSavePageSettings({ backgroundPosition: e.target.value })}><option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select></Control></div><Control label="Canvas height"><input type="number" min="600" step="100" value={num(page.settings?.canvasHeight, 1100)} onChange={e => props.onSavePageSettings({ canvasHeight: +e.target.value })} /></Control>{page.context_type !== 'home' && <><PanelTitle>Danger zone</PanelTitle><button className="atlas-danger-button" onClick={() => void deleteCurrent()}><Trash2 />{page.context_type === 'database' ? 'Delete database' : page.context_type === 'record' ? 'Delete record' : 'Delete page'}</button></>}</div>
}

function AssetsPanel({ images, fonts, uploading, error, upload, onDelete, applyImage, applyFont }: { images: AtlasAsset[]; fonts: AtlasAsset[]; uploading: boolean; error: string; upload: (file: File, kind: 'image' | 'font') => void; onDelete: (asset: AtlasAsset) => void; applyImage: (asset: AtlasAsset) => void; applyFont: (asset: AtlasAsset) => void }) {
  return <div><PanelTitle>Upload</PanelTitle><div className="atlas-upload-row"><label><Upload />Image<input type="file" accept="image/*" disabled={uploading} onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'image')} /></label><label><Upload />Font<input type="file" accept=".ttf,.otf,.woff,.woff2,font/*" disabled={uploading} onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'font')} /></label></div>{error && <p className="atlas-asset-error">{error}</p>}<PanelTitle>Images</PanelTitle>{images.length ? <div className="atlas-assets-grid">{images.map(asset => <div key={asset.id}><button className="atlas-asset-thumb" onClick={() => applyImage(asset)}><img src={asset.public_url || ''} alt={asset.name} /></button><span>{asset.name}</span><button className="atlas-asset-delete" onClick={() => onDelete(asset)}><Trash2 /></button></div>)}</div> : <p className="atlas-helper">Uploaded images live here so you can reuse them anywhere.</p>}<PanelTitle>Fonts</PanelTitle>{fonts.length ? <div className="atlas-font-list">{fonts.map(asset => <div key={asset.id}><button onClick={() => applyFont(asset)}>{asset.name}</button><button className="atlas-asset-delete" onClick={() => onDelete(asset)}><Trash2 /></button></div>)}</div> : <p className="atlas-helper">Upload TTF, OTF, WOFF, or WOFF2 fonts and reuse them throughout Atlas.</p>}</div>
}

function Control({ label, children }: { label: string; children: ReactNode }) { return <label className="atlas-edit-control"><span>{label}</span>{children}</label> }
function num(value: unknown, fallback: number) { const number = Number(value); return Number.isFinite(number) ? number : fallback }
function color(value: unknown, fallback: string) { const text = String(value || ''); return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback }
function layerName(layer: PageBlock) { if (layer.config.systemBinding === 'page_title') return 'Page title'; if (layer.config.systemBinding === 'page_cover') return 'Page cover'; if (layer.type === 'heading' || layer.type === 'text' || layer.type === 'callout') return String(layer.config.text || layer.type); if (layer.type === 'database_view') return String(layer.config.title || 'Database view'); if (layer.type === 'button') return String(layer.config.label || 'Button'); if (layer.type === 'property') return String(layer.config.label || 'Record property'); if (layer.type === 'widget') return String(layer.config.widgetType || 'Widget').replaceAll('_',' '); if (layer.type === 'image') return 'Image'; return layer.type.replace('_', ' ') }
