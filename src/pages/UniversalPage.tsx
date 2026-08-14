import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { BarChart3, BringToFront, Database, Heading, Image, Layers, LayoutGrid, List, Minus, MousePointer2, Palette, Pencil, Plus, Quote, Rows3, SendToBack, Settings2, SlidersHorizontal, Square, Trash2, Type, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAppContext } from '../App'
import FieldInput from '../components/FieldInput'
import { createField, createPageBlock, createRecord, deleteField, deletePageBlock, getDatabase, getDatabases, getFields, getOrCreateContextPage, getPage, getPageBlocks, getRecord, getRecords, updateField, updatePage, updatePageBlock, updateRecord } from '../lib/data'
import { displayValue } from '../lib/value'
import type { Database as DatabaseType, Field, FieldType, Page, PageBlock, PageBlockType, RecordRow } from '../types'

type Kind = 'home' | 'page' | 'database' | 'record'
type ViewMode = 'table' | 'gallery' | 'board'

type BlockPatch = Record<string, unknown>

const DEFAULT_CANVAS_HEIGHT = 1100

export default function UniversalPage({ kind }: { kind: Kind }) {
  const params = useParams()
  const { workspace } = useAppContext()
  const [page, setPage] = useState<Page | null>(null)
  const [blocks, setBlocks] = useState<PageBlock[]>([])
  const [databases, setDatabases] = useState<DatabaseType[]>([])
  const [database, setDatabase] = useState<DatabaseType | null>(null)
  const [record, setRecord] = useState<RecordRow | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [editing, setEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [pageOpen, setPageOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const all = await getDatabases(workspace.id)
      setDatabases(all)
      let p: Page
      let db: DatabaseType | null = null
      let rec: RecordRow | null = null

      if (kind === 'home') {
        p = await getOrCreateContextPage(workspace.id, 'home', 'Home', { icon: '✦' })
      } else if (kind === 'page') {
        p = await getPage(params.pageId || '')
      } else if (kind === 'database') {
        db = await getDatabase(params.databaseId || '')
        p = await getOrCreateContextPage(workspace.id, 'database', db.name, { databaseId: db.id, icon: db.icon || '✦' })
      } else {
        db = await getDatabase(params.databaseId || '')
        rec = await getRecord(params.recordId || '')
        p = await getOrCreateContextPage(workspace.id, 'record', rec.title, { databaseId: db.id, recordId: rec.id, icon: db.icon || '✦' })
      }

      setDatabase(db)
      setRecord(rec)
      setFields(db ? await getFields(db.id) : [])
      setPage(p)
      setBlocks(await getPageBlocks(p.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => { void load() }, [workspace.id, kind, params.pageId, params.databaseId, params.recordId])

  const selected = useMemo(() => blocks.find(block => block.id === selectedId) || null, [blocks, selectedId])
  const canvasHeight = Math.max(600, Number(page?.settings?.canvasHeight || DEFAULT_CANVAS_HEIGHT))
  const showTitle = page?.settings?.showTitle !== false

  const savePageSettings = async (patch: BlockPatch) => {
    if (!page) return
    const settings = { ...page.settings, ...patch }
    setPage({ ...page, settings })
    await updatePage(page.id, { settings })
  }

  const addBlock = async (type: PageBlockType) => {
    if (!page) return
    const offset = blocks.length % 7
    let config: BlockPatch = {
      x: 70 + offset * 34,
      y: 120 + offset * 34,
      width: type === 'database_view' || type === 'section' ? 680 : 320,
      height: type === 'image' ? 260 : type === 'database_view' ? 360 : type === 'section' ? 320 : 140,
      rotation: 0,
      zIndex: blocks.length + 1,
      background: 'transparent',
      textColor: 'inherit',
      radius: 16,
      padding: 16,
    }
    if (type === 'heading') config = { ...config, text: 'New heading', fontSize: 40, fontWeight: 600 }
    if (type === 'text') config = { ...config, text: 'Start writing…', fontSize: 17 }
    if (type === 'callout') config = { ...config, text: 'Add a note…', background: '#f0ebe3' }
    if (type === 'image') config = { ...config, url: '', fit: 'cover' }
    if (type === 'button') config = { ...config, label: 'Button', url: '', background: '#24211d', textColor: '#ffffff', width: 180, height: 64 }
    if (type === 'database_view') config = { ...config, databaseId: database?.id || databases[0]?.id || '', mode: 'gallery', title: '', limit: 12, cardBackground: '#ffffff' }
    if (type === 'property') config = { ...config, fieldId: '__title__', label: '', display: 'default' }
    if (type === 'metric') config = { ...config, label: 'Total', databaseId: database?.id || databases[0]?.id || '', width: 240, height: 150 }
    if (type === 'progress') config = { ...config, label: 'Progress', fieldId: fields.find(field => field.type === 'number')?.id || '', value: 50, max: 100, width: 360, height: 120 }
    if (type === 'divider') config = { ...config, width: 420, height: 40, padding: 8 }
    if (type === 'section') config = { ...config, title: 'Structured section', background: '#ffffff', border: '#ded6cb', radius: 22, padding: 24 }

    const created = await createPageBlock(page.id, type, blocks.length, config)
    setBlocks(current => [...current, created])
    setSelectedId(created.id)
    setAddOpen(false)
  }

  const saveBlock = async (id: string, config: BlockPatch) => {
    setBlocks(current => current.map(block => block.id === id ? { ...block, config } : block))
    const updated = await updatePageBlock(id, { config })
    setBlocks(current => current.map(block => block.id === id ? updated : block))
  }

  if (error) return <div className="atlas-error"><h2>Atlas could not open this page</h2><p>{error}</p><p>Run <code>supabase/005_canvas_sections.sql</code> if you have not yet.</p></div>
  if (!page) return <div className="atlas-loading"><div className="spinner" /><p>Opening page…</p></div>

  return <div className={`atlas-page canvas-first ${editing ? 'is-editing' : ''}`} style={{ background: String(page.settings?.background || '#fbfaf7'), color: String(page.settings?.textColor || '#211e1a') }}>
    <header className="canvas-topbar">
      <div className="canvas-breadcrumb">{kind === 'home' ? 'Dashboard' : kind === 'database' ? database?.name : kind === 'record' ? `${database?.name} / ${record?.title}` : page.title}</div>
      <div className="canvas-topbar-actions">
        {editing && <>
          <div className="canvas-popover-wrap"><button className="canvas-toolbar-button primary-soft" onClick={() => { setAddOpen(v => !v); setPageOpen(false) }}><Plus /> Add</button>{addOpen && <AddPopover onAdd={addBlock} canProperty={Boolean(record)} />}</div>
          <button className="canvas-toolbar-button" onClick={() => setDataOpen(true)}><Database /> Data</button>
          <div className="canvas-popover-wrap"><button className="canvas-toolbar-button" onClick={() => { setPageOpen(v => !v); setAddOpen(false) }}><Palette /> Page</button>{pageOpen && <PagePopover page={page} setPage={setPage} savePage={updatePage} saveSettings={savePageSettings} />}</div>
        </>}
        <button className={`canvas-toolbar-button ${editing ? 'done' : 'edit'}`} onClick={() => { setEditing(v => !v); setSelectedId(null); setAddOpen(false); setPageOpen(false) }}><Pencil /> {editing ? 'Done' : 'Edit'}</button>
      </div>
    </header>

    {page.cover && <div className="canvas-page-cover" style={{ backgroundImage: `url(${page.cover})` }} />}

    <main className="canvas-stage-wrap">
      {showTitle && <div className="canvas-page-meta">
        <button className="canvas-page-icon" disabled={!editing}>{page.icon || '✦'}</button>
        <input className="canvas-page-title" value={page.title} readOnly={!editing} onChange={e => setPage({ ...page, title: e.target.value })} onBlur={() => updatePage(page.id, { title: page.title })} />
      </div>}

      <div className="true-canvas" style={{ height: canvasHeight }} onPointerDown={e => { if (e.currentTarget === e.target) setSelectedId(null) }}>
        {blocks.map(block => <CanvasBlock
          key={block.id}
          block={block}
          editing={editing}
          selected={selectedId === block.id}
          databases={databases}
          database={database}
          record={record}
          fields={fields}
          onSelect={() => setSelectedId(block.id)}
          onRecordChange={setRecord}
          onSave={config => saveBlock(block.id, config)}
          onDelete={async () => { await deletePageBlock(block.id); setBlocks(current => current.filter(item => item.id !== block.id)); setSelectedId(null) }}
        />)}
        {!blocks.length && !editing && <div className="canvas-empty-view"><span>This page is yours.</span><small>Click Edit to start creating.</small></div>}
        {!blocks.length && editing && <button className="canvas-empty-add" onClick={() => setAddOpen(true)}><Plus /> Add your first element</button>}
      </div>

      {editing && <div className="canvas-height-control"><label>Canvas height <input type="number" min="600" step="100" value={canvasHeight} onChange={e => savePageSettings({ canvasHeight: Number(e.target.value) })} /></label></div>}
    </main>

    {dataOpen && <DataDrawer database={database} record={record} databases={databases} fields={fields} onClose={() => setDataOpen(false)} onRecordChange={setRecord} onFieldsChange={setFields} />}
    {editing && selected && <div className="canvas-selection-status"><Layers /> Selected: {friendlyType(selected.type)}</div>}
  </div>
}

function AddPopover({ onAdd, canProperty }: { onAdd: (type: PageBlockType) => void; canProperty: boolean }) {
  return <div className="canvas-add-popover">
    <PopoverGroup title="Text">
      <AddItem icon={<Heading />} label="Heading" onClick={() => onAdd('heading')} />
      <AddItem icon={<Type />} label="Text" onClick={() => onAdd('text')} />
      <AddItem icon={<Quote />} label="Callout" onClick={() => onAdd('callout')} />
    </PopoverGroup>
    <PopoverGroup title="Data">
      <AddItem icon={<Database />} label="Database view" onClick={() => onAdd('database_view')} />
      {canProperty && <AddItem icon={<SlidersHorizontal />} label="Record property" onClick={() => onAdd('property')} />}
      <AddItem icon={<BarChart3 />} label="Metric" onClick={() => onAdd('metric')} />
      <AddItem icon={<BarChart3 />} label="Progress" onClick={() => onAdd('progress')} />
    </PopoverGroup>
    <PopoverGroup title="Layout & media">
      <AddItem icon={<Square />} label="Structured section" onClick={() => onAdd('section')} />
      <AddItem icon={<Image />} label="Image" onClick={() => onAdd('image')} />
      <AddItem icon={<MousePointer2 />} label="Button" onClick={() => onAdd('button')} />
      <AddItem icon={<Minus />} label="Divider" onClick={() => onAdd('divider')} />
    </PopoverGroup>
  </div>
}

function PopoverGroup({ title, children }: { title: string; children: ReactNode }) { return <div className="canvas-popover-group"><span>{title}</span><div>{children}</div></div> }
function AddItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick}>{icon}<span>{label}</span></button> }

function PagePopover({ page, setPage, savePage, saveSettings }: { page: Page; setPage: (page: Page) => void; savePage: (id: string, patch: Partial<Page>) => Promise<unknown>; saveSettings: (patch: BlockPatch) => Promise<void> }) {
  return <div className="canvas-page-popover">
    <label>Icon<input value={page.icon || ''} onChange={e => setPage({ ...page, icon: e.target.value })} onBlur={() => savePage(page.id, { icon: page.icon })} /></label>
    <label>Cover image<input value={page.cover || ''} placeholder="Image URL" onChange={e => setPage({ ...page, cover: e.target.value })} onBlur={() => savePage(page.id, { cover: page.cover })} /></label>
    <div className="canvas-color-row"><label>Background<input type="color" value={String(page.settings?.background || '#fbfaf7')} onChange={e => saveSettings({ background: e.target.value })} /></label><label>Text<input type="color" value={String(page.settings?.textColor || '#211e1a')} onChange={e => saveSettings({ textColor: e.target.value })} /></label></div>
    <label className="canvas-toggle"><input type="checkbox" checked={page.settings?.showTitle !== false} onChange={e => saveSettings({ showTitle: e.target.checked })} /> Show page title</label>
  </div>
}

function CanvasBlock({ block, editing, selected, databases, database, record, fields, onSelect, onRecordChange, onSave, onDelete }: { block: PageBlock; editing: boolean; selected: boolean; databases: DatabaseType[]; database: DatabaseType | null; record: RecordRow | null; fields: Field[]; onSelect: () => void; onRecordChange: (record: RecordRow) => void; onSave: (config: BlockPatch) => void; onDelete: () => void }) {
  const [config, setConfig] = useState<BlockPatch>(block.config)
  const [settingsOpen, setSettingsOpen] = useState(false)
  useEffect(() => setConfig(block.config), [block.config])

  const save = (patch: BlockPatch) => {
    const next = { ...config, ...patch }
    setConfig(next)
    onSave(next)
  }

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editing || (event.target as HTMLElement).closest('button,input,textarea,select,a,.resize-handle,.element-settings')) return
    event.preventDefault()
    onSelect()
    const startX = event.clientX
    const startY = event.clientY
    const originX = Number(config.x || 0)
    const originY = Number(config.y || 0)
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    const move = (moveEvent: PointerEvent) => setConfig(current => ({ ...current, x: Math.max(0, originX + moveEvent.clientX - startX), y: Math.max(0, originY + moveEvent.clientY - startY) }))
    const up = () => {
      target.removeEventListener('pointermove', move as EventListener)
      target.removeEventListener('pointerup', up)
      setConfig(current => { onSave(current); return current })
    }
    target.addEventListener('pointermove', move as EventListener)
    target.addEventListener('pointerup', up)
  }

  const resize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const originW = Number(config.width || 320)
    const originH = Number(config.height || 140)
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    const move = (moveEvent: PointerEvent) => setConfig(current => ({ ...current, width: Math.max(100, originW + moveEvent.clientX - startX), height: Math.max(50, originH + moveEvent.clientY - startY) }))
    const up = () => {
      target.removeEventListener('pointermove', move as EventListener)
      target.removeEventListener('pointerup', up)
      setConfig(current => { onSave(current); return current })
    }
    target.addEventListener('pointermove', move as EventListener)
    target.addEventListener('pointerup', up)
  }

  const style: CSSProperties = {
    left: Number(config.x || 0),
    top: Number(config.y || 0),
    width: Number(config.width || 320),
    height: Number(config.height || 140),
    zIndex: Number(config.zIndex || 1),
    transform: `rotate(${Number(config.rotation || 0)}deg)`,
    background: String(config.background || 'transparent'),
    color: String(config.textColor || 'inherit'),
    borderRadius: Number(config.radius || 16),
    padding: Number(config.padding ?? 16),
    border: config.border ? `1px solid ${String(config.border)}` : undefined,
  }

  return <div className={`canvas-element ${selected ? 'selected' : ''} type-${block.type}`} style={style} onPointerDown={drag} onClick={event => { if (editing) { event.stopPropagation(); onSelect() } }}>
    {editing && selected && <div className="element-context-toolbar" onPointerDown={event => event.stopPropagation()}>
      <button onClick={() => setSettingsOpen(v => !v)}><Settings2 /> Style</button>
      <button title="Bring forward" onClick={() => save({ zIndex: Number(config.zIndex || 1) + 1 })}><BringToFront /></button>
      <button title="Send backward" onClick={() => save({ zIndex: Math.max(1, Number(config.zIndex || 1) - 1) })}><SendToBack /></button>
      <button className="danger" title="Delete" onClick={onDelete}><Trash2 /></button>
    </div>}
    {editing && selected && settingsOpen && <ElementSettings block={block} config={config} databases={databases} database={database} record={record} fields={fields} save={save} onRecordChange={onRecordChange} />}
    <BlockContent block={block} config={config} editing={editing} databases={databases} record={record} fields={fields} save={save} onRecordChange={onRecordChange} />
    {editing && selected && <button className="resize-handle" onPointerDown={resize} aria-label="Resize" />}
  </div>
}

function ElementSettings({ block, config, databases, database, record, fields, save, onRecordChange }: { block: PageBlock; config: BlockPatch; databases: DatabaseType[]; database: DatabaseType | null; record: RecordRow | null; fields: Field[]; save: (patch: BlockPatch) => void; onRecordChange: (record: RecordRow) => void }) {
  return <div className="element-settings" onPointerDown={event => event.stopPropagation()}>
    <div className="settings-grid-four">
      <label>X<input type="number" value={Number(config.x || 0)} onChange={e => save({ x: Number(e.target.value) })} /></label>
      <label>Y<input type="number" value={Number(config.y || 0)} onChange={e => save({ y: Number(e.target.value) })} /></label>
      <label>W<input type="number" value={Number(config.width || 320)} onChange={e => save({ width: Number(e.target.value) })} /></label>
      <label>H<input type="number" value={Number(config.height || 140)} onChange={e => save({ height: Number(e.target.value) })} /></label>
    </div>
    <div className="settings-grid-two">
      <label>Background<input type="color" value={safeColor(config.background, '#ffffff')} onChange={e => save({ background: e.target.value })} /></label>
      <label>Text<input type="color" value={safeColor(config.textColor, '#211e1a')} onChange={e => save({ textColor: e.target.value })} /></label>
    </div>
    <div className="settings-grid-two">
      <label>Radius<input type="number" min="0" value={Number(config.radius || 0)} onChange={e => save({ radius: Number(e.target.value) })} /></label>
      <label>Rotate<input type="number" value={Number(config.rotation || 0)} onChange={e => save({ rotation: Number(e.target.value) })} /></label>
    </div>
    {(block.type === 'heading' || block.type === 'text' || block.type === 'callout') && <label>Font size<input type="number" value={Number(config.fontSize || 17)} onChange={e => save({ fontSize: Number(e.target.value) })} /></label>}
    {block.type === 'image' && <><label>Image URL<input value={String(config.url || '')} onChange={e => save({ url: e.target.value })} /></label><label>Fit<select value={String(config.fit || 'cover')} onChange={e => save({ fit: e.target.value })}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option></select></label></>}
    {block.type === 'button' && <><label>Button text<input value={String(config.label || '')} onChange={e => save({ label: e.target.value })} /></label><label>URL<input value={String(config.url || '')} onChange={e => save({ url: e.target.value })} /></label></>}
    {block.type === 'database_view' && <DatabaseSettings config={config} databases={databases} save={save} />}
    {block.type === 'property' && record && <PropertySettings config={config} record={record} fields={fields} save={save} onRecordChange={onRecordChange} />}
    {block.type === 'progress' && <ProgressSettings config={config} record={record} fields={fields} save={save} />}
    {block.type === 'metric' && <MetricSettings config={config} databases={databases} save={save} />}
    {block.type === 'section' && <><label>Section title<input value={String(config.title || '')} onChange={e => save({ title: e.target.value })} /></label><p className="settings-note">Structured sections are responsive containers. Child placement and drag-into-section behavior is the next layer.</p></>}
    {database && block.type !== 'property' && <div className="settings-context-note">Page data source: {database.name}</div>}
  </div>
}

function BlockContent({ block, config, editing, databases, record, fields, save, onRecordChange }: { block: PageBlock; config: BlockPatch; editing: boolean; databases: DatabaseType[]; record: RecordRow | null; fields: Field[]; save: (patch: BlockPatch) => void; onRecordChange: (record: RecordRow) => void }) {
  if (block.type === 'heading' || block.type === 'text' || block.type === 'callout') {
    const Tag = block.type === 'heading' ? 'h2' : 'div'
    return <Tag className="canvas-editable-text" contentEditable={editing} suppressContentEditableWarning style={{ fontSize: Number(config.fontSize || (block.type === 'heading' ? 40 : 17)), fontWeight: Number(config.fontWeight || (block.type === 'heading' ? 600 : 400)) }} onBlur={event => save({ text: event.currentTarget.textContent || '' })}>{String(config.text || '')}</Tag>
  }
  if (block.type === 'image') return config.url ? <img className="canvas-image" src={String(config.url)} alt="" style={{ objectFit: String(config.fit || 'cover') as CSSProperties['objectFit'] }} /> : <div className="canvas-image-placeholder"><Image /><span>Select Style to add an image</span></div>
  if (block.type === 'button') return <a className="canvas-action-button" href={editing ? undefined : String(config.url || '#')} onClick={editing ? event => event.preventDefault() : undefined}>{String(config.label || 'Button')}</a>
  if (block.type === 'divider') return <div className="canvas-divider" />
  if (block.type === 'database_view') return <DatabaseView config={config} editing={editing} databases={databases} />
  if (block.type === 'property') return <PropertyDisplay config={config} record={record} fields={fields} />
  if (block.type === 'metric') return <MetricDisplay config={config} />
  if (block.type === 'progress') return <ProgressDisplay config={config} record={record} fields={fields} />
  if (block.type === 'section') return <div className="structured-section"><span className="structured-kicker">SECTION</span><strong>{String(config.title || 'Structured section')}</strong><p>Use this for responsive content such as lists, tables, and task groups.</p></div>
  return null
}

function DatabaseSettings({ config, databases, save }: { config: BlockPatch; databases: DatabaseType[]; save: (patch: BlockPatch) => void }) {
  return <>
    <label>Database<select value={String(config.databaseId || '')} onChange={e => save({ databaseId: e.target.value })}>{databases.map(db => <option key={db.id} value={db.id}>{db.name}</option>)}</select></label>
    <label>View<select value={String(config.mode || 'gallery')} onChange={e => save({ mode: e.target.value })}><option value="gallery">Gallery</option><option value="table">Table</option><option value="board">Board</option></select></label>
    <label>Title<input value={String(config.title || '')} onChange={e => save({ title: e.target.value })} /></label>
    <label>Limit<input type="number" min="1" max="100" value={Number(config.limit || 12)} onChange={e => save({ limit: Number(e.target.value) })} /></label>
  </>
}

function PropertySettings({ config, record, fields, save, onRecordChange }: { config: BlockPatch; record: RecordRow; fields: Field[]; save: (patch: BlockPatch) => void; onRecordChange: (record: RecordRow) => void }) {
  const fieldId = String(config.fieldId || '__title__')
  const field = fields.find(item => item.id === fieldId)
  const value = fieldId === '__title__' ? record.title : field ? record.data?.[field.id] : ''
  const changeValue = async (next: unknown) => {
    const updated = fieldId === '__title__' ? await updateRecord(record.id, { title: String(next) }) : field ? await updateRecord(record.id, { data: { ...record.data, [field.id]: next } }) : record
    onRecordChange(updated)
  }
  return <>
    <label>Property<select value={fieldId} onChange={e => save({ fieldId: e.target.value })}><option value="__title__">Record title</option>{fields.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Label<input value={String(config.label || '')} onChange={e => save({ label: e.target.value })} /></label>
    <div className="settings-value-editor"><span>Value</span>{fieldId === '__title__' ? <input value={String(value || '')} onChange={e => void changeValue(e.target.value)} /> : field ? <FieldInput field={field} value={value} onChange={changeValue} /> : null}</div>
  </>
}

function ProgressSettings({ config, record, fields, save }: { config: BlockPatch; record: RecordRow | null; fields: Field[]; save: (patch: BlockPatch) => void }) {
  return <><label>Label<input value={String(config.label || '')} onChange={e => save({ label: e.target.value })} /></label>{record && <label>Number property<select value={String(config.fieldId || '')} onChange={e => save({ fieldId: e.target.value })}><option value="">Manual</option>{fields.filter(field => field.type === 'number').map(field => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>}<label>Maximum<input type="number" value={Number(config.max || 100)} onChange={e => save({ max: Number(e.target.value) })} /></label>{!config.fieldId && <label>Manual value<input type="number" value={Number(config.value || 0)} onChange={e => save({ value: Number(e.target.value) })} /></label>}</>
}

function MetricSettings({ config, databases, save }: { config: BlockPatch; databases: DatabaseType[]; save: (patch: BlockPatch) => void }) {
  return <><label>Label<input value={String(config.label || '')} onChange={e => save({ label: e.target.value })} /></label><label>Database<select value={String(config.databaseId || '')} onChange={e => save({ databaseId: e.target.value })}>{databases.map(db => <option key={db.id} value={db.id}>{db.name}</option>)}</select></label></>
}

function DatabaseView({ config, editing, databases }: { config: BlockPatch; editing: boolean; databases: DatabaseType[] }) {
  const databaseId = String(config.databaseId || '')
  const [records, setRecords] = useState<RecordRow[]>([])
  useEffect(() => { if (!databaseId) { setRecords([]); return }; getRecords(databaseId).then(setRecords).catch(console.error) }, [databaseId])
  const mode = String(config.mode || 'gallery') as ViewMode
  const title = String(config.title || databases.find(db => db.id === databaseId)?.name || '')
  const shown = records.slice(0, Number(config.limit || 12))
  return <div className="canvas-database-view">{title && <h3>{title}</h3>}<Records records={shown} databaseId={databaseId} mode={mode} editing={editing} /></div>
}

function Records({ records, databaseId, mode, editing }: { records: RecordRow[]; databaseId: string; mode: ViewMode; editing: boolean }) {
  if (!records.length) return <div className="canvas-data-empty">No records yet.</div>
  if (mode === 'gallery') return <div className="canvas-record-gallery">{records.map(record => editing ? <div className="canvas-record-card" key={record.id}><strong>{record.title}</strong></div> : <Link className="canvas-record-card" key={record.id} to={`/database/${databaseId}/record/${record.id}`}><strong>{record.title}</strong></Link>)}</div>
  if (mode === 'board') return <div className="canvas-record-board"><div><span>Records</span>{records.map(record => editing ? <div key={record.id}>{record.title}</div> : <Link key={record.id} to={`/database/${databaseId}/record/${record.id}`}>{record.title}</Link>)}</div></div>
  return <div className="canvas-record-table">{records.map(record => editing ? <div key={record.id}><span>{record.title}</span></div> : <Link key={record.id} to={`/database/${databaseId}/record/${record.id}`}><span>{record.title}</span></Link>)}</div>
}

function PropertyDisplay({ config, record, fields }: { config: BlockPatch; record: RecordRow | null; fields: Field[] }) {
  if (!record) return <div className="canvas-data-empty">This element needs a record page.</div>
  const fieldId = String(config.fieldId || '__title__')
  const field = fields.find(item => item.id === fieldId)
  const value = fieldId === '__title__' ? record.title : field ? record.data?.[field.id] : ''
  const label = String(config.label || field?.name || '')
  return <div className="canvas-property">{label && <span>{label}</span>}<strong>{displayValue(value, field) || 'Empty'}</strong></div>
}

function MetricDisplay({ config }: { config: BlockPatch }) {
  const databaseId = String(config.databaseId || '')
  const [count, setCount] = useState(0)
  useEffect(() => { if (!databaseId) { setCount(0); return }; getRecords(databaseId).then(records => setCount(records.length)).catch(console.error) }, [databaseId])
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
  const [tab, setTab] = useState<'records' | 'properties'>(record ? 'records' : 'records')
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
    const updated = await updateRecord(record.id, { title: patch.title ?? record.title, data: patch.data ?? record.data })
    onRecordChange(updated)
  }

  return <aside className="canvas-data-drawer">
    <div className="data-drawer-head"><div><span>DATA</span><strong>{record ? record.title : databases.find(db => db.id === activeDb)?.name || 'Workspace data'}</strong></div><button onClick={onClose}><X /></button></div>
    {record && database ? <div className="record-data-editor">
      <label>Title<input value={record.title} onChange={e => onRecordChange({ ...record, title: e.target.value })} onBlur={() => saveCurrentRecord({ title: record.title })} /></label>
      {fields.map(field => <label key={field.id}>{field.name}<FieldInput field={field} value={record.data?.[field.id]} onChange={value => onRecordChange({ ...record, data: { ...record.data, [field.id]: value } })} /><button className="save-field-value" onClick={() => saveCurrentRecord({ data: record.data })}>Save</button></label>)}
    </div> : <>
      <select className="data-source-select" value={activeDb} onChange={e => setActiveDb(e.target.value)}>{databases.map(db => <option key={db.id} value={db.id}>{db.name}</option>)}</select>
      <div className="data-tabs"><button className={tab === 'records' ? 'active' : ''} onClick={() => setTab('records')}>Records</button><button className={tab === 'properties' ? 'active' : ''} onClick={() => setTab('properties')}>Properties</button></div>
      {tab === 'records' ? <div className="data-records-panel"><button className="data-primary-button" onClick={async () => { const created = await createRecord(activeDb, 'Untitled'); setRecords(current => [created, ...current]) }}><Plus /> New record</button>{records.map(item => <Link key={item.id} to={`/database/${activeDb}/record/${item.id}`}>{item.title}<span>Open</span></Link>)}</div> : <div className="data-properties-panel">
        <div className="new-property-row"><input placeholder="Property name" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} /><select value={newFieldType} onChange={e => setNewFieldType(e.target.value as FieldType)}>{fieldTypes.map(type => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select><button onClick={async () => { if (!newFieldName.trim()) return; await createField(activeDb, { name: newFieldName.trim(), type: newFieldType, required: false, config: {} }, drawerFields.length); setNewFieldName(''); await refresh() }}><Plus /></button></div>
        {drawerFields.map(field => <div className="property-row" key={field.id}><input value={field.name} onChange={e => setDrawerFields(current => current.map(item => item.id === field.id ? { ...item, name: e.target.value } : item))} onBlur={async e => { await updateField(field.id, { name: e.target.value }); await refresh() }} /><select value={field.type} onChange={async e => { await updateField(field.id, { type: e.target.value as FieldType }); await refresh() }}>{fieldTypes.map(type => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select><button className="danger" onClick={async () => { await deleteField(field.id); await refresh() }}><Trash2 /></button></div>)}
      </div>}
    </>}
  </aside>
}

const fieldTypes: FieldType[] = ['text', 'long_text', 'number', 'date', 'checkbox', 'select', 'multi_select', 'url', 'image', 'relation']

function safeColor(value: unknown, fallback: string) { const text = String(value || ''); return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback }
function friendlyType(type: PageBlockType) { return type.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase()) }
