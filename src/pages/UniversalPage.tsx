import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Layers, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAppContext } from '../App'
import AtlasWidget from '../components/AtlasWidget'
import DatabaseCanvasView from '../components/DatabaseCanvasView'
import EditorSidebar from '../components/EditorSidebar'
import FieldInput from '../components/FieldInput'
import { createField, createPageBlock, createRecord, deleteField, deletePageBlock, deleteRecord, getDatabase, getDatabases, getFields, getOrCreateContextPage, getPage, getPageBlocks, getRecord, getRecords, updateField, updatePage, updatePageBlock, updateRecord } from '../lib/data'
import { displayValue } from '../lib/value'
import type { Database as DatabaseType, Field, FieldType, Page, PageBlock, PageBlockType, RecordRow } from '../types'

type Kind = 'home' | 'page' | 'database' | 'record'
type BlockPatch = Record<string, unknown>
const DEFAULT_CANVAS_HEIGHT = 1100

export default function UniversalPage({ kind }: { kind: Kind }) {
  const params = useParams()
  const { workspace, user } = useAppContext()
  const [page, setPage] = useState<Page | null>(null)
  const [blocks, setBlocks] = useState<PageBlock[]>([])
  const [databases, setDatabases] = useState<DatabaseType[]>([])
  const [database, setDatabase] = useState<DatabaseType | null>(null)
  const [record, setRecord] = useState<RecordRow | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [editing, setEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => { void load() }, [workspace.id, kind, params.pageId, params.databaseId, params.recordId])
  useEffect(() => () => document.body.classList.remove('atlas-editing'), [])
  useEffect(() => { document.body.classList.toggle('atlas-editing', editing); return () => document.body.classList.remove('atlas-editing') }, [editing])

  const selected = useMemo(() => blocks.find(block => block.id === selectedId) || null, [blocks, selectedId])
  const canvasHeight = Math.max(600, Number(page?.settings?.canvasHeight || DEFAULT_CANVAS_HEIGHT))

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
    if (selectedId === id) setSelectedId(null)
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
    setSelectedId(created.id)
  }

  const addBlock = async (type: PageBlockType) => {
    if (!page) return
    const offset = blocks.length % 8
    let config: BlockPatch = {
      x: 60 + offset * 30, y: 90 + offset * 30,
      width: type === 'database_view' || type === 'section' ? 700 : type === 'widget' ? 360 : 320,
      height: type === 'image' ? 280 : type === 'database_view' ? 390 : type === 'section' ? 320 : type === 'widget' ? 220 : 140,
      rotation: 0, zIndex: Math.max(1, ...blocks.map(block => Number(block.config?.zIndex || 1))) + 1,
      background: 'transparent', textColor: '#211e1a', radius: 0, padding: 0,
    }
    if (type === 'heading') config = { ...config, text: 'New heading', fontSize: 42, fontWeight: 600, fontFamily: 'Georgia, serif', lineHeight: 1.1, letterSpacing: 0, textAlign: 'left' }
    if (type === 'text') config = { ...config, text: 'Start writing…', fontSize: 17, fontWeight: 400, fontFamily: 'Georgia, serif', lineHeight: 1.5, letterSpacing: 0, textAlign: 'left' }
    if (type === 'callout') config = { ...config, text: 'Add a note…', background: '#f0ebe3', padding: 18, radius: 14, fontSize: 17, fontFamily: 'Georgia, serif' }
    if (type === 'image') config = { ...config, url: '', fit: 'cover', radius: 14 }
    if (type === 'button') config = { ...config, label: 'Button', url: '', background: '#24211d', textColor: '#ffffff', width: 180, height: 60, radius: 12 }
    if (type === 'database_view') config = { ...config, databaseId: database?.id || databases[0]?.id || '', mode: 'gallery', recordLayoutMode: 'auto', title: '', limit: 12, padding: 0 }
    if (type === 'property') config = { ...config, fieldId: '__title__', label: '', display: 'default' }
    if (type === 'metric') config = { ...config, label: 'Total', databaseId: database?.id || databases[0]?.id || '', width: 220, height: 130 }
    if (type === 'progress') config = { ...config, label: 'Progress', fieldId: fields.find(field => field.type === 'number')?.id || '', value: 50, max: 100, width: 360, height: 100 }
    if (type === 'divider') config = { ...config, width: 420, height: 28 }
    if (type === 'section') config = { ...config, title: 'Structured section', background: '#ffffff', border: '#ded6cb', radius: 20, padding: 24 }
    if (type === 'widget') config = { ...config, widgetType: 'digital_clock', background: '#ffffff', textColor: '#211e1a', radius: 18, padding: 20, fontSize: 16, databaseId: database?.id || databases[0]?.id || '' }
    const created = await createPageBlock(page.id, type, blocks.length, config)
    setBlocks(items => [...items, created])
    setSelectedId(created.id)
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
    setSelectedId(created.id)
  }

  const addPageCover = async () => {
    if (!page) return
    const created = await createPageBlock(page.id, 'image', blocks.length, {
      systemBinding: 'page_cover', x: 40, y: 40, width: 760, height: 300,
      rotation: 0, zIndex: Math.max(1, ...blocks.map(block => Number(block.config?.zIndex || 1))) + 1,
      background: 'transparent', radius: 0, padding: 0, fit: 'cover', url: page.cover || '',
    })
    setBlocks(items => [...items, created])
    setSelectedId(created.id)
  }

  if (error) return <div className="atlas-error"><h2>Atlas could not open this page</h2><p>{error}</p></div>
  if (!page) return <div className="atlas-loading"><div className="spinner" /><p>Opening page…</p></div>

  const host = typeof document !== 'undefined' ? document.getElementById('atlas-editor-sidebar-host') : null
  const pageStyle: CSSProperties = {
    backgroundColor: String(page.settings?.background || '#fbfaf7'),
    color: String(page.settings?.textColor || '#211e1a'),
    backgroundImage: page.settings?.backgroundImage ? `url(${String(page.settings.backgroundImage)})` : undefined,
    backgroundSize: String(page.settings?.backgroundSize || 'cover'),
    backgroundPosition: String(page.settings?.backgroundPosition || 'center'),
    backgroundRepeat: String(page.settings?.backgroundRepeat || 'no-repeat'),
  }

  return <div className={`atlas-page canvas-first ${editing ? 'is-editing' : ''}`} style={pageStyle}>
    <header className="canvas-topbar">
      <div className="canvas-breadcrumb">{kind === 'home' ? 'Dashboard' : kind === 'database' ? database?.name : kind === 'record' ? `${database?.name} / ${record?.title}` : page.title}</div>
      <div className="canvas-topbar-actions"><button className={`canvas-toolbar-button ${editing ? 'done' : 'edit'}`} onClick={() => { setEditing(value => !value); setSelectedId(null) }}><Pencil />{editing ? 'Done' : 'Edit'}</button></div>
    </header>

    <main className="canvas-stage-wrap">
      <div className="true-canvas" style={{ height: canvasHeight }} onPointerDown={event => { if (event.currentTarget === event.target) setSelectedId(null) }}>
        {blocks.map(block => <CanvasBlock key={block.id} block={block} page={page} editing={editing} selected={selectedId === block.id} databases={databases} record={record} fields={fields} onSelect={() => setSelectedId(block.id)} onSave={patch => saveBlockPatch(block.id, patch)} onDelete={() => deleteBlock(block.id)} />)}
        {!blocks.length && !editing && <div className="canvas-empty-view"><span>This page is yours.</span><small>Click Edit to start creating.</small></div>}
        {!blocks.length && editing && <button className="canvas-empty-add" onClick={() => addBlock('heading')}><Plus />Add your first element</button>}
      </div>
    </main>

    {editing && host && createPortal(<EditorSidebar
      workspaceId={workspace.id} userId={user.id} page={page} blocks={blocks} selected={selected}
      databases={databases} database={database} record={record} fields={fields}
      onAdd={addBlock} onAddPageTitle={addPageTitle} onAddPageCover={addPageCover}
      onSelectBlock={setSelectedId} onSaveBlock={saveBlockPatch} onDeleteBlock={deleteBlock} onDuplicateBlock={duplicateBlock}
      onSavePage={savePagePatch} onSavePageSettings={savePageSettings} onOpenData={() => setDataOpen(true)}
      onDone={() => { setEditing(false); setSelectedId(null) }}
    />, host)}

    {dataOpen && <DataDrawer database={database} record={record} databases={databases} fields={fields} onClose={() => setDataOpen(false)} onRecordChange={setRecord} onFieldsChange={setFields} />}
  </div>
}

function CanvasBlock({ block, page, editing, selected, databases, record, fields, onSelect, onSave, onDelete }: { block: PageBlock; page: Page; editing: boolean; selected: boolean; databases: DatabaseType[]; record: RecordRow | null; fields: Field[]; onSelect: () => void; onSave: (patch: BlockPatch) => void; onDelete: () => void }) {
  const [config, setConfig] = useState<BlockPatch>(block.config)
  useEffect(() => setConfig(block.config), [block.config])

  const locked = Boolean(config.locked)
  const hidden = Boolean(config.hidden)
  const commit = (patch: BlockPatch) => { const next = { ...config, ...patch }; setConfig(next); onSave(patch) }

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editing || locked || (event.target as HTMLElement).closest('button,input,textarea,select,a,.resize-handle,.db-canvas-view')) return
    event.preventDefault()
    onSelect()
    const startX = event.clientX, startY = event.clientY, originX = Number(config.x || 0), originY = Number(config.y || 0), target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    const move = (e: PointerEvent) => setConfig(current => ({ ...current, x: Math.max(0, originX + e.clientX - startX), y: Math.max(0, originY + e.clientY - startY) }))
    const up = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); setConfig(current => { onSave({ x: current.x, y: current.y }); return current }) }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  const resize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (locked) return
    event.preventDefault()
    event.stopPropagation()
    onSelect()
    const startX = event.clientX, startY = event.clientY, originW = Number(config.width || 320), originH = Number(config.height || 140), target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    const move = (e: PointerEvent) => setConfig(current => ({ ...current, width: Math.max(70, originW + e.clientX - startX), height: Math.max(35, originH + e.clientY - startY) }))
    const up = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); setConfig(current => { onSave({ width: current.width, height: current.height }); return current }) }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  if (hidden && !editing) return null

  const rotation = Number(config.rotation || 0)
  const style: CSSProperties = {
    left: Number(config.x || 0), top: Number(config.y || 0), width: Number(config.width || 320), height: Number(config.height || 140),
    zIndex: Number(config.zIndex || 1), transform: rotation ? `rotate(${rotation}deg)` : undefined,
    background: String(config.background || 'transparent'), color: String(config.textColor || 'inherit'),
    borderRadius: Number(config.radius || 0), padding: Number(config.padding || 0),
    border: config.border ? `1px solid ${String(config.border)}` : undefined,
    opacity: hidden ? 0.3 : 1,
  }

  return <div className={`canvas-element ${selected ? 'selected' : ''} ${locked ? 'is-locked' : ''} ${hidden ? 'is-hidden' : ''} type-${block.type}`} style={style} onPointerDown={drag} onClick={event => { if (editing) { event.stopPropagation(); onSelect() } }}>
    {editing && selected && <><div className="canvas-drag-cue"><Layers /></div><button className="canvas-delete-cue" onClick={event => { event.stopPropagation(); void onDelete() }}><Trash2 /></button></>}
    <BlockContent block={block} page={page} config={config} editing={editing && !locked} databases={databases} record={record} fields={fields} save={commit} />
    {editing && selected && !locked && <button className="resize-handle" onPointerDown={resize} aria-label="Resize" />}
  </div>
}

function BlockContent({ block, page, config, editing, databases, record, fields, save }: { block: PageBlock; page: Page; config: BlockPatch; editing: boolean; databases: DatabaseType[]; record: RecordRow | null; fields: Field[]; save: (patch: BlockPatch) => void }) {
  const binding = String(config.systemBinding || '')
  if (block.type === 'heading' || block.type === 'text' || block.type === 'callout') {
    const Tag = block.type === 'heading' ? 'h2' : 'div'
    const text = binding === 'page_title' ? page.title : String(config.text || '')
    return <Tag className="canvas-editable-text" contentEditable={editing} suppressContentEditableWarning style={{ fontSize: Number(config.fontSize || 17), fontWeight: Number(config.fontWeight || 400), fontFamily: String(config.fontFamily || 'Georgia, serif'), lineHeight: Number(config.lineHeight || 1.2), letterSpacing: Number(config.letterSpacing || 0), textAlign: String(config.textAlign || 'left') as CSSProperties['textAlign'] }} onBlur={event => save({ text: event.currentTarget.textContent || '' })}>{text}</Tag>
  }
  if (block.type === 'image') {
    const url = binding === 'page_cover' ? page.cover : String(config.url || '')
    return url ? <img className="canvas-image" src={url} alt="" style={{ objectFit: String(config.fit || 'cover') as CSSProperties['objectFit'] }} /> : <div className="canvas-image-placeholder"><span>Add an image from the Assets panel</span></div>
  }
  if (block.type === 'button') return <a className="canvas-action-button" href={editing ? undefined : String(config.url || '#')} onClick={editing ? event => event.preventDefault() : undefined}>{String(config.label || 'Button')}</a>
  if (block.type === 'divider') return <div className="canvas-divider" />
  if (block.type === 'database_view') return <DatabaseCanvasView blockId={block.id} config={config} editing={editing} databases={databases} save={save} />
  if (block.type === 'property') return <PropertyDisplay config={config} record={record} fields={fields} />
  if (block.type === 'metric') return <MetricDisplay config={config} />
  if (block.type === 'progress') return <ProgressDisplay config={config} record={record} fields={fields} />
  if (block.type === 'section') return <div className="structured-section"><span className="structured-kicker">SECTION</span><strong>{String(config.title || 'Structured section')}</strong><p>Responsive content can live here while the rest of the page stays freeform.</p></div>
  if (block.type === 'widget') return <AtlasWidget config={config} editing={editing} databases={databases} save={save} />
  return null
}

function PropertyDisplay({ config, record, fields }: { config: BlockPatch; record: RecordRow | null; fields: Field[] }) {
  if (!record) return <div className="canvas-data-empty">This element needs a record page.</div>
  const id = String(config.fieldId || '__title__')
  const field = fields.find(item => item.id === id)
  const value = id === '__title__' ? record.title : field ? record.data?.[field.id] : ''
  const label = String(config.label || field?.name || '')
  return <div className="canvas-property">{label && <span>{label}</span>}<strong>{displayValue(value, field) || 'Empty'}</strong></div>
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
