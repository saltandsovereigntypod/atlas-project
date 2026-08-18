import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, BarChart3, Database, Heading, Image, Layers, Minus, MousePointer2, Palette, Plus, Quote, SlidersHorizontal, Square, Trash2, Type, Upload } from 'lucide-react'
import { deleteAsset, getAssets, loadFontAsset, uploadAsset, type AtlasAsset } from '../lib/assets'
import { deleteDatabase, deletePage, deleteRecord, getPageBlocks } from '../lib/data'
import type { Database as DatabaseType, Field, Page, PageBlock, PageBlockType, RecordRow } from '../types'

type Patch = Record<string, unknown>
type Tab = 'add' | 'design' | 'layers' | 'page' | 'assets'

type Props = {
  workspaceId: string
  userId: string
  page: Page
  selected: PageBlock | null
  databases: DatabaseType[]
  database: DatabaseType | null
  record: RecordRow | null
  fields: Field[]
  onAdd: (type: PageBlockType) => void
  onSaveBlock: (id: string, patch: Patch) => void
  onDeleteBlock: (id: string) => void
  onSavePage: (patch: Partial<Page>) => void
  onSavePageSettings: (patch: Patch) => void
  onOpenData: () => void
  onDone: () => void
}

export default function EditorSidebar(props: Props) {
  const { page, selected } = props
  const [tab, setTab] = useState<Tab>('add')
  const [assets, setAssets] = useState<AtlasAsset[]>([])
  const [layers, setLayers] = useState<PageBlock[]>([])
  const [assetError, setAssetError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragLayerId, setDragLayerId] = useState<string | null>(null)

  const refreshAssets = async () => {
    try {
      setAssetError('')
      setAssets(await getAssets(props.workspaceId))
    } catch (e) {
      setAssetError(e instanceof Error ? e.message : String(e))
    }
  }
  const refreshLayers = async () => {
    try { setLayers(await getPageBlocks(page.id)) } catch (e) { console.error(e) }
  }

  useEffect(() => { void refreshAssets() }, [props.workspaceId])
  useEffect(() => { void refreshLayers() }, [page.id, selected?.id])
  useEffect(() => { if (selected) setTab('design') }, [selected?.id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select') || target?.isContentEditable || !selected) return

      const step = event.shiftKey ? 10 : 1
      const x = num(selected.config.x, 0)
      const y = num(selected.config.y, 0)
      const z = num(selected.config.zIndex, 1)

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        props.onDeleteBlock(selected.id)
        setLayers(current => current.filter(item => item.id !== selected.id))
        return
      }
      if (event.key === 'ArrowLeft') { event.preventDefault(); props.onSaveBlock(selected.id, { x: Math.max(0, x - step) }) }
      if (event.key === 'ArrowRight') { event.preventDefault(); props.onSaveBlock(selected.id, { x: x + step }) }
      if (event.key === 'ArrowUp') { event.preventDefault(); props.onSaveBlock(selected.id, { y: Math.max(0, y - step) }) }
      if (event.key === 'ArrowDown') { event.preventDefault(); props.onSaveBlock(selected.id, { y: y + step }) }
      if ((event.metaKey || event.ctrlKey) && event.key === ']') { event.preventDefault(); props.onSaveBlock(selected.id, { zIndex: z + 1 }) }
      if ((event.metaKey || event.ctrlKey) && event.key === '[') { event.preventDefault(); props.onSaveBlock(selected.id, { zIndex: Math.max(1, z - 1) }) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, props.onDeleteBlock, props.onSaveBlock])

  const images = useMemo(() => assets.filter(a => a.kind === 'image'), [assets])
  const fonts = useMemo(() => assets.filter(a => a.kind === 'font'), [assets])
  const orderedLayers = useMemo(() => [...layers].sort((a, b) => num(b.config.zIndex, 1) - num(a.config.zIndex, 1)), [layers])

  const upload = async (file: File, kind: 'image' | 'font') => {
    setUploading(true)
    try {
      const created = await uploadAsset(props.workspaceId, props.userId, file, kind)
      setAssets(current => [created, ...current])
      if (kind === 'font') await loadFontAsset(created)
    } catch (e) {
      setAssetError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  const applyFont = async (asset: AtlasAsset) => {
    if (!selected) return
    const family = await loadFontAsset(asset)
    props.onSaveBlock(selected.id, { fontFamily: family })
  }

  const selectLayer = (id: string) => {
    const sourceOrder = layers.findIndex(layer => layer.id === id)
    const elements = document.querySelectorAll<HTMLElement>('.true-canvas > .canvas-element')
    elements[sourceOrder]?.click()
  }

  const reorderLayers = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return
    const ordered = [...orderedLayers]
    const from = ordered.findIndex(layer => layer.id === draggedId)
    const to = ordered.findIndex(layer => layer.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = ordered.splice(from, 1)
    ordered.splice(to, 0, moved)
    const next = ordered.map((layer, index) => ({ ...layer, config: { ...layer.config, zIndex: ordered.length - index } }))
    setLayers(current => current.map(layer => next.find(item => item.id === layer.id) || layer))
    next.forEach(layer => props.onSaveBlock(layer.id, { zIndex: layer.config.zIndex }))
  }

  return <div className="atlas-edit-rail">
    <div className="atlas-edit-rail-head"><div><span>EDITING</span><strong>{page.title}</strong></div><button onClick={props.onDone}>Done</button></div>
    <div className="atlas-edit-tabs five">
      <button className={tab === 'add' ? 'active' : ''} onClick={() => setTab('add')}><Plus />Add</button>
      <button className={tab === 'design' ? 'active' : ''} onClick={() => setTab('design')}><SlidersHorizontal />Design</button>
      <button className={tab === 'layers' ? 'active' : ''} onClick={() => { setTab('layers'); void refreshLayers() }}><Layers />Layers</button>
      <button className={tab === 'page' ? 'active' : ''} onClick={() => setTab('page')}><Palette />Page</button>
      <button className={tab === 'assets' ? 'active' : ''} onClick={() => setTab('assets')}><Image />Assets</button>
    </div>
    <div className="atlas-edit-scroll">
      {tab === 'add' && <AddPanel onAdd={props.onAdd} canProperty={Boolean(props.record)} />}
      {tab === 'design' && <DesignPanel {...props} images={images} fonts={fonts} layers={layers} />}
      {tab === 'layers' && <LayersPanel layers={orderedLayers} selectedId={selected?.id || null} onSelect={selectLayer} onDelete={async id => { props.onDeleteBlock(id); setLayers(current => current.filter(layer => layer.id !== id)) }} onDragStart={setDragLayerId} onDrop={async id => { if (dragLayerId) await reorderLayers(dragLayerId, id); setDragLayerId(null) }} />}
      {tab === 'page' && <PagePanel {...props} />}
      {tab === 'assets' && <AssetsPanel images={images} fonts={fonts} uploading={uploading} error={assetError} upload={upload} onDelete={async asset => { await deleteAsset(asset); setAssets(current => current.filter(a => a.id !== asset.id)) }} applyImage={asset => selected && props.onSaveBlock(selected.id, { url: asset.public_url || '' })} applyFont={applyFont} />}
    </div>
    <div className="atlas-edit-rail-footer"><button onClick={props.onOpenData}><Database />Open data</button></div>
  </div>
}

function AddPanel({ onAdd, canProperty }: { onAdd: (type: PageBlockType) => void; canProperty: boolean }) {
  return <>
    <PanelTitle>Text</PanelTitle><div className="atlas-add-grid"><Add icon={<Heading />} label="Heading" onClick={() => onAdd('heading')} /><Add icon={<Type />} label="Text" onClick={() => onAdd('text')} /><Add icon={<Quote />} label="Callout" onClick={() => onAdd('callout')} /><Add icon={<Minus />} label="Divider" onClick={() => onAdd('divider')} /></div>
    <PanelTitle>Data</PanelTitle><div className="atlas-add-grid"><Add icon={<Database />} label="Database view" onClick={() => onAdd('database_view')} />{canProperty && <Add icon={<SlidersHorizontal />} label="Property" onClick={() => onAdd('property')} />}<Add icon={<BarChart3 />} label="Metric" onClick={() => onAdd('metric')} /><Add icon={<BarChart3 />} label="Progress" onClick={() => onAdd('progress')} /></div>
    <PanelTitle>Media & layout</PanelTitle><div className="atlas-add-grid"><Add icon={<Image />} label="Image" onClick={() => onAdd('image')} /><Add icon={<MousePointer2 />} label="Button" onClick={() => onAdd('button')} /><Add icon={<Square />} label="Section" onClick={() => onAdd('section')} /></div>
  </>
}
function Add({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) { return <button className="atlas-add-tile" onClick={onClick}>{icon}<span>{label}</span></button> }
function PanelTitle({ children }: { children: ReactNode }) { return <div className="atlas-edit-section-title">{children}</div> }

function DesignPanel(props: Props & { images: AtlasAsset[]; fonts: AtlasAsset[]; layers: PageBlock[] }) {
  const b = props.selected
  if (!b) return <div className="atlas-edit-empty"><Layers /><strong>Select something on the canvas</strong><p>Its full design controls will appear here.</p></div>
  const c = b.config
  const save = (patch: Patch) => props.onSaveBlock(b.id, patch)
  const isText = ['heading', 'text', 'callout'].includes(b.type)
  const maxZ = Math.max(1, ...props.layers.map(layer => num(layer.config.zIndex, 1)))
  return <div className="atlas-design-panel">
    <div className="atlas-selected-name"><span>{b.type.replace('_', ' ')}</span><button title="Delete selected" onClick={() => props.onDeleteBlock(b.id)}><Trash2 /></button></div>
    <div className="atlas-shortcut-hint">Delete/Backspace deletes · Arrows nudge · Shift+Arrows moves 10px · Ctrl/Cmd+[ ] changes layer</div>
    <PanelTitle>Position & size</PanelTitle>
    <div className="atlas-control-grid four"><Control label="X"><input type="number" value={num(c.x, 0)} onChange={e => save({ x: +e.target.value })} /></Control><Control label="Y"><input type="number" value={num(c.y, 0)} onChange={e => save({ y: +e.target.value })} /></Control><Control label="W"><input type="number" value={num(c.width, 320)} onChange={e => save({ width: +e.target.value })} /></Control><Control label="H"><input type="number" value={num(c.height, 140)} onChange={e => save({ height: +e.target.value })} /></Control></div>
    <div className="atlas-control-grid two"><Control label="Rotation"><input type="number" value={num(c.rotation, 0)} onChange={e => save({ rotation: +e.target.value })} /></Control><Control label="Layer"><input type="number" min="1" value={num(c.zIndex, 1)} onChange={e => save({ zIndex: +e.target.value })} /></Control></div>
    <div className="atlas-layer-actions"><button onClick={() => save({ zIndex: maxZ + 1 })}>To front</button><button onClick={() => save({ zIndex: num(c.zIndex, 1) + 1 })}><ArrowUp />Forward</button><button onClick={() => save({ zIndex: Math.max(1, num(c.zIndex, 1) - 1) })}><ArrowDown />Backward</button><button onClick={() => save({ zIndex: 1 })}>To back</button></div>
    <PanelTitle>Appearance</PanelTitle>
    <div className="atlas-control-grid two"><Control label="Background"><input type="color" value={color(c.background, '#ffffff')} onChange={e => save({ background: e.target.value })} /></Control><Control label="Text"><input type="color" value={color(c.textColor, '#211e1a')} onChange={e => save({ textColor: e.target.value })} /></Control></div>
    <div className="atlas-control-grid two"><Control label="Corners"><input type="number" min="0" value={num(c.radius, 0)} onChange={e => save({ radius: +e.target.value })} /></Control><Control label="Padding"><input type="number" min="0" value={num(c.padding, 0)} onChange={e => save({ padding: +e.target.value })} /></Control></div>
    {isText && <><PanelTitle>Typography</PanelTitle><Control label="Font"><select value={String(c.fontFamily || 'Georgia, serif')} onChange={e => save({ fontFamily: e.target.value })}><option value="Georgia, serif">Georgia</option><option value="Arial, sans-serif">Arial</option><option value="Verdana, sans-serif">Verdana</option><option value="'Courier New', monospace">Courier New</option>{props.fonts.map(f => <option key={f.id} value={String(f.metadata?.family || f.name)}>{f.name}</option>)}</select></Control><div className="atlas-control-grid two"><Control label="Size"><input type="number" min="8" value={num(c.fontSize, b.type === 'heading' ? 40 : 17)} onChange={e => save({ fontSize: +e.target.value })} /></Control><Control label="Weight"><select value={String(c.fontWeight || 400)} onChange={e => save({ fontWeight: +e.target.value })}><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra bold</option></select></Control></div><div className="atlas-control-grid two"><Control label="Line height"><input type="number" min=".6" max="3" step=".05" value={num(c.lineHeight, 1.2)} onChange={e => save({ lineHeight: +e.target.value })} /></Control><Control label="Letter spacing"><input type="number" step=".1" value={num(c.letterSpacing, 0)} onChange={e => save({ letterSpacing: +e.target.value })} /></Control></div><div className="atlas-align-row"><button className={c.textAlign === 'left' || !c.textAlign ? 'active' : ''} onClick={() => save({ textAlign: 'left' })}><AlignLeft /></button><button className={c.textAlign === 'center' ? 'active' : ''} onClick={() => save({ textAlign: 'center' })}><AlignCenter /></button><button className={c.textAlign === 'right' ? 'active' : ''} onClick={() => save({ textAlign: 'right' })}><AlignRight /></button></div></>}
    {b.type === 'image' && <><PanelTitle>Image</PanelTitle><Control label="Fit"><select value={String(c.fit || 'cover')} onChange={e => save({ fit: e.target.value })}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option></select></Control>{props.images.length > 0 && <div className="atlas-asset-mini-grid">{props.images.slice(0, 8).map(a => <button key={a.id} onClick={() => save({ url: a.public_url || '' })}><img src={a.public_url || ''} alt="" /></button>)}</div>}</>}
    {b.type === 'button' && <><PanelTitle>Button</PanelTitle><Control label="Text"><input value={String(c.label || '')} onChange={e => save({ label: e.target.value })} /></Control><Control label="Link"><input value={String(c.url || '')} onChange={e => save({ url: e.target.value })} /></Control></>}
    {b.type === 'database_view' && <><PanelTitle>Database view</PanelTitle><Control label="Source"><select value={String(c.databaseId || '')} onChange={e => save({ databaseId: e.target.value })}>{props.databases.map(db => <option key={db.id} value={db.id}>{db.name}</option>)}</select></Control><div className="atlas-control-grid two"><Control label="Display"><select value={String(c.mode || 'gallery')} onChange={e => save({ mode: e.target.value })}><option value="gallery">Gallery</option><option value="table">Table</option><option value="board">Board</option></select></Control><Control label="Record layout"><select value={String(c.recordLayoutMode || 'auto')} onChange={e => save({ recordLayoutMode: e.target.value })}><option value="auto">Auto</option><option value="freeform">Freeform</option></select></Control></div><div className="atlas-control-grid two"><Control label="Limit"><input type="number" min="1" max="100" value={num(c.limit, 12)} onChange={e => save({ limit: +e.target.value })} /></Control><Control label="Title"><input value={String(c.title || '')} onChange={e => save({ title: e.target.value })} /></Control></div></>}
    {b.type === 'property' && props.record && <><PanelTitle>Data binding</PanelTitle><Control label="Property"><select value={String(c.fieldId || '__title__')} onChange={e => save({ fieldId: e.target.value })}><option value="__title__">Record title</option>{props.fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Control><Control label="Label"><input value={String(c.label || '')} onChange={e => save({ label: e.target.value })} /></Control></>}
    {b.type === 'progress' && <><PanelTitle>Progress data</PanelTitle><Control label="Label"><input value={String(c.label || '')} onChange={e => save({ label: e.target.value })} /></Control>{props.record && <Control label="Number property"><select value={String(c.fieldId || '')} onChange={e => save({ fieldId: e.target.value })}><option value="">Manual value</option>{props.fields.filter(f => f.type === 'number').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Control>}<div className="atlas-control-grid two"><Control label="Value"><input type="number" disabled={Boolean(c.fieldId)} value={num(c.value, 0)} onChange={e => save({ value: +e.target.value })} /></Control><Control label="Maximum"><input type="number" min="1" value={num(c.max, 100)} onChange={e => save({ max: +e.target.value })} /></Control></div></>}
    {b.type === 'metric' && <><PanelTitle>Metric data</PanelTitle><Control label="Label"><input value={String(c.label || '')} onChange={e => save({ label: e.target.value })} /></Control><Control label="Database"><select value={String(c.databaseId || '')} onChange={e => save({ databaseId: e.target.value })}>{props.databases.map(db => <option key={db.id} value={db.id}>{db.name}</option>)}</select></Control></>}
    {b.type === 'section' && <><PanelTitle>Section</PanelTitle><Control label="Title"><input value={String(c.title || '')} onChange={e => save({ title: e.target.value })} /></Control></>}
  </div>
}

function LayersPanel({ layers, selectedId, onSelect, onDelete, onDragStart, onDrop }: { layers: PageBlock[]; selectedId: string | null; onSelect: (id: string) => void; onDelete: (id: string) => void; onDragStart: (id: string) => void; onDrop: (id: string) => void }) {
  return <div className="atlas-layers-panel">
    <div className="atlas-layer-help"><Layers /><div><strong>Front to back</strong><span>Drag rows to reorder. Click a row to select even when the object is buried.</span></div></div>
    {layers.length ? <div className="atlas-layer-list">{layers.map(layer => <div key={layer.id} className={`atlas-layer-row ${selectedId === layer.id ? 'active' : ''}`} draggable onDragStart={() => onDragStart(layer.id)} onDragOver={(event: DragEvent) => event.preventDefault()} onDrop={(event: DragEvent) => { event.preventDefault(); onDrop(layer.id) }}>
      <button className="atlas-layer-main" onClick={() => onSelect(layer.id)}><span className="atlas-layer-grip">⋮⋮</span><span className="atlas-layer-name">{layerName(layer)}</span><small>z {num(layer.config.zIndex, 1)}</small></button>
      <button className="atlas-layer-delete" title="Delete element" onClick={() => onDelete(layer.id)}><Trash2 /></button>
    </div>)}</div> : <p className="atlas-helper">Add something to the page and it will appear here.</p>}
  </div>
}

function PagePanel(props: Props) {
  const p = props.page
  const deleteCurrent = async () => {
    if (p.context_type === 'home') return
    const label = p.context_type === 'database' ? `database “${props.database?.name || p.title}” and its records` : p.context_type === 'record' ? `record “${props.record?.title || p.title}”` : `page “${p.title}”`
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return
    if (p.context_type === 'database' && props.database) await deleteDatabase(props.database.id)
    else if (p.context_type === 'record' && props.record) await deleteRecord(props.record.id)
    else await deletePage(p.id)
    window.location.hash = p.context_type === 'record' && props.database ? `#/database/${props.database.id}` : '#/'
  }
  return <div>
    <PanelTitle>Page identity</PanelTitle><Control label="Title"><input value={p.title} onChange={e => props.onSavePage({ title: e.target.value })} /></Control><Control label="Icon / emoji"><input value={p.icon || ''} onChange={e => props.onSavePage({ icon: e.target.value })} /></Control><Control label="Cover image URL"><input value={p.cover || ''} onChange={e => props.onSavePage({ cover: e.target.value })} /></Control>
    <PanelTitle>Page colors</PanelTitle><div className="atlas-control-grid two"><Control label="Background"><input type="color" value={color(p.settings?.background, '#fbfaf7')} onChange={e => props.onSavePageSettings({ background: e.target.value })} /></Control><Control label="Text"><input type="color" value={color(p.settings?.textColor, '#211e1a')} onChange={e => props.onSavePageSettings({ textColor: e.target.value })} /></Control></div><Control label="Canvas height"><input type="number" min="600" step="100" value={num(p.settings?.canvasHeight, 1100)} onChange={e => props.onSavePageSettings({ canvasHeight: +e.target.value })} /></Control><label className="atlas-check"><input type="checkbox" checked={p.settings?.showTitle !== false} onChange={e => props.onSavePageSettings({ showTitle: e.target.checked })} />Show legacy page title</label>
    {p.context_type !== 'home' && <><PanelTitle>Danger zone</PanelTitle><button className="atlas-danger-button" onClick={() => void deleteCurrent()}><Trash2 />{p.context_type === 'database' ? 'Delete database' : p.context_type === 'record' ? 'Delete record' : 'Delete page'}</button></>}
  </div>
}

function AssetsPanel({ images, fonts, uploading, error, upload, onDelete, applyImage, applyFont }: { images: AtlasAsset[]; fonts: AtlasAsset[]; uploading: boolean; error: string; upload: (file: File, kind: 'image' | 'font') => void; onDelete: (asset: AtlasAsset) => void; applyImage: (asset: AtlasAsset) => void; applyFont: (asset: AtlasAsset) => void }) {
  return <div><PanelTitle>Upload</PanelTitle><div className="atlas-upload-row"><label><Upload />Image<input type="file" accept="image/*" disabled={uploading} onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'image')} /></label><label><Upload />Font<input type="file" accept=".ttf,.otf,.woff,.woff2,font/*" disabled={uploading} onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'font')} /></label></div>{error && <p className="atlas-asset-error">{error}</p>}<PanelTitle>Images</PanelTitle>{images.length ? <div className="atlas-assets-grid">{images.map(a => <div key={a.id}><button className="atlas-asset-thumb" onClick={() => applyImage(a)}><img src={a.public_url || ''} alt={a.name} /></button><span>{a.name}</span><button className="atlas-asset-delete" onClick={() => onDelete(a)}><Trash2 /></button></div>)}</div> : <p className="atlas-helper">Uploaded images will live here so you can reuse them anywhere.</p>}<PanelTitle>Fonts</PanelTitle>{fonts.length ? <div className="atlas-font-list">{fonts.map(a => <div key={a.id}><button onClick={() => applyFont(a)}>{a.name}</button><button className="atlas-asset-delete" onClick={() => onDelete(a)}><Trash2 /></button></div>)}</div> : <p className="atlas-helper">Upload TTF, OTF, WOFF, or WOFF2 fonts and reuse them throughout Atlas.</p>}</div>
}

function Control({ label, children }: { label: string; children: ReactNode }) { return <label className="atlas-edit-control"><span>{label}</span>{children}</label> }
function num(value: unknown, fallback: number) { const n = Number(value); return Number.isFinite(n) ? n : fallback }
function color(value: unknown, fallback: string) { const s = String(value || ''); return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback }
function layerName(layer: PageBlock) {
  if (layer.type === 'heading' || layer.type === 'text' || layer.type === 'callout') return String(layer.config.text || layer.type)
  if (layer.type === 'database_view') return String(layer.config.title || 'Database view')
  if (layer.type === 'button') return String(layer.config.label || 'Button')
  if (layer.type === 'property') return String(layer.config.label || 'Record property')
  if (layer.type === 'image') return 'Image'
  return layer.type.replace('_', ' ')
}
