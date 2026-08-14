import { useEffect, useMemo, useState } from 'react'
import { Brush, Image as ImageIcon, Kanban, LayoutGrid, MoreHorizontal, Plus, Search, Settings2, Table2, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import RecordCanvas from '../components/RecordCanvas'
import { useAppContext } from '../App'
import {
  createField, createRecord, deleteDatabase, deleteField, deleteRecord, ensureDefaultViews, getDatabase, getDatabases,
  getFields, getLayoutElements, getLayoutForSurface, getRecords, updateRecord, updateView,
} from '../lib/data'
import { displayValue } from '../lib/value'
import type { Database, DatabaseView, Field, FieldType, Layout, LayoutElement, RecordRow } from '../types'

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' }, { value: 'long_text', label: 'Long text' }, { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' }, { value: 'checkbox', label: 'Checkbox' }, { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi-select' }, { value: 'url', label: 'URL' }, { value: 'image', label: 'Image' },
  { value: 'relation', label: 'Relation' },
]

export default function DatabasePage() {
  const { databaseId = '' } = useParams()
  const { workspace } = useAppContext()
  const navigate = useNavigate()
  const [database, setDatabase] = useState<Database | null>(null)
  const [allDatabases, setAllDatabases] = useState<Database[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [records, setRecords] = useState<RecordRow[]>([])
  const [views, setViews] = useState<DatabaseView[]>([])
  const [activeViewId, setActiveViewId] = useState('')
  const [galleryLayout, setGalleryLayout] = useState<Layout | null>(null)
  const [galleryElements, setGalleryElements] = useState<LayoutElement[]>([])
  const [boardLayout, setBoardLayout] = useState<Layout | null>(null)
  const [boardElements, setBoardElements] = useState<LayoutElement[]>([])
  const [query, setQuery] = useState('')
  const [showFieldForm, setShowFieldForm] = useState(false)
  const [showViewSettings, setShowViewSettings] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<FieldType>('text')
  const [newFieldOptions, setNewFieldOptions] = useState('')
  const [relationTarget, setRelationTarget] = useState('')

  const load = async () => {
    const [db, f, r, savedViews, dbs, gallery, board] = await Promise.all([
      getDatabase(databaseId), getFields(databaseId), getRecords(databaseId), ensureDefaultViews(databaseId), getDatabases(workspace.id),
      getLayoutForSurface(databaseId, 'gallery'), getLayoutForSurface(databaseId, 'board'),
    ])
    setDatabase(db); setFields(f); setRecords(r); setViews(savedViews); setAllDatabases(dbs)
    setActiveViewId((current) => savedViews.some((v) => v.id === current) ? current : savedViews[0]?.id || '')
    setGalleryLayout(gallery); setBoardLayout(board)
    setGalleryElements(gallery ? await getLayoutElements(gallery.id) : [])
    setBoardElements(board ? await getLayoutElements(board.id) : [])
  }

  useEffect(() => { load().catch((e) => alert(e instanceof Error ? e.message : String(e))) }, [databaseId])

  const activeView = views.find((view) => view.id === activeViewId) || views[0]
  const contentFields = fields.filter((field) => field.position > 0 || field.name !== 'Name')
  const filtered = useMemo(() => {
    const needle = query.toLowerCase().trim()
    if (!needle) return records
    return records.filter((record) => record.title.toLowerCase().includes(needle) || contentFields.some((field) => displayValue(record.data[field.id], field).toLowerCase().includes(needle)))
  }, [records, query, fields])

  const patchActiveView = async (configPatch: Record<string, unknown>) => {
    if (!activeView) return
    const updated = await updateView(activeView.id, { config: { ...activeView.config, ...configPatch } })
    setViews((current) => current.map((view) => view.id === updated.id ? updated : view))
  }

  const addRecord = async () => navigate(`/database/${databaseId}/record/${(await createRecord(databaseId)).id}`)

  const addField = async () => {
    if (!newFieldName.trim()) return
    const config = newFieldType === 'select' || newFieldType === 'multi_select'
      ? { options: newFieldOptions.split(',').map((x) => x.trim()).filter(Boolean) }
      : newFieldType === 'relation' ? { target_database_id: relationTarget } : {}
    await createField(databaseId, { name: newFieldName.trim(), type: newFieldType, required: false, config }, fields.length)
    setNewFieldName(''); setNewFieldType('text'); setNewFieldOptions(''); setRelationTarget(''); setShowFieldForm(false); await load()
  }

  const imageFields = fields.filter((field) => field.type === 'image')
  const selectFields = fields.filter((field) => field.type === 'select')
  const galleryImageId = String(activeView?.config.galleryImageFieldId || '')
  const boardFieldId = String(activeView?.config.boardFieldId || '')
  const galleryImageField = fields.find((field) => field.id === galleryImageId)
  const boardField = fields.find((field) => field.id === boardFieldId)
  const boardOptions = boardField && Array.isArray(boardField.config.options) ? boardField.config.options.map(String) : []
  const useDesignedCard = activeView?.config.useDesignedCard !== false

  const renderTable = () => {
    const density = String(activeView?.config.density || 'comfortable')
    const hidden = new Set(Array.isArray(activeView?.config.hiddenFieldIds) ? activeView?.config.hiddenFieldIds as string[] : [])
    const visible = contentFields.filter((field) => !hidden.has(field.id))
    return <div className={`table-shell table-${density}`} style={{ ['--table-header' as string]: String(activeView?.config.headerColor || '#faf8f4'), ['--table-row' as string]: String(activeView?.config.rowColor || '#ffffff') }}><table className="data-table"><thead><tr><th>Name</th>{visible.map((field) => <th key={field.id}><span className="th-inner">{field.name}<button onClick={async () => { if (confirm(`Delete ${field.name}?`)) { await deleteField(field.id); await load() } }}><MoreHorizontal size={14} /></button></span></th>)}<th /></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td><Link className="record-link" to={`/database/${databaseId}/record/${record.id}`}>{record.title || 'Untitled'}</Link></td>{visible.map((field) => <td key={field.id}>{field.type === 'image' && record.data[field.id] ? <img className="tiny-thumb" src={String(record.data[field.id])} alt="" /> : displayValue(record.data[field.id], field)}</td>)}<td><button className="icon-button" onClick={async () => { if (confirm(`Delete ${record.title}?`)) { await deleteRecord(record.id); await load() } }}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>
  }

  const renderGallery = () => <div className="gallery-grid">{filtered.map((record) => {
    if (useDesignedCard && galleryLayout && galleryElements.length) return <Link className="designed-gallery-card" to={`/database/${databaseId}/record/${record.id}`} key={record.id}><RecordCanvas layout={galleryLayout} elements={galleryElements} fields={fields} record={record} maxWidth={360} /></Link>
    const image = galleryImageField ? String(record.data[galleryImageField.id] || '') : ''
    return <Link className="gallery-card" to={`/database/${databaseId}/record/${record.id}`} key={record.id}><div className="gallery-cover">{image ? <img src={image} alt="" /> : <ImageIcon size={28} />}</div><div className="gallery-content"><h3>{record.title}</h3>{contentFields.filter((f) => f.id !== galleryImageId).slice(0, 3).map((field) => <div className="gallery-property" key={field.id}><span>{field.name}</span><span>{displayValue(record.data[field.id], field) || '—'}</span></div>)}</div></Link>
  })}</div>

  const renderBoard = () => {
    if (!boardField) return <div className="empty-view">Choose a Select property in View settings to group this board.</div>
    const columns = [...boardOptions, 'Unassigned']
    return <div className="board-scroll"><div className="board-grid">{columns.map((option) => {
      const items = filtered.filter((record) => option === 'Unassigned' ? !record.data[boardField.id] : String(record.data[boardField.id] || '') === option)
      return <section className="board-column" key={option}><div className="board-column-head"><span>{option}</span><span>{items.length}</span></div>{items.map((record) => <div className="board-card" key={record.id}>{useDesignedCard && boardLayout && boardElements.length ? <Link to={`/database/${databaseId}/record/${record.id}`}><RecordCanvas layout={boardLayout} elements={boardElements} fields={fields} record={record} maxWidth={270} /></Link> : <Link to={`/database/${databaseId}/record/${record.id}`}><strong>{record.title}</strong></Link>}<select value={String(record.data[boardField.id] || '')} onChange={async (e) => { const updated = await updateRecord(record.id, { data: { ...record.data, [boardField.id]: e.target.value } }); setRecords((current) => current.map((x) => x.id === updated.id ? updated : x)) }}><option value="">Unassigned</option>{boardOptions.map((item) => <option key={item}>{item}</option>)}</select></div>)}</section>
    })}</div></div>
  }

  return <div className="page-wrap wide">
    <header className="page-header database-header"><div><p className="eyebrow">DATABASE</p><h1>{database?.icon || '✦'} {database?.name || 'Loading…'}</h1><p className="page-subtitle">One source of truth, with views and designs that can look completely different.</p></div><div className="button-row"><Link className="secondary-button" to={`/database/${databaseId}/design`}><Brush size={17} /> Design</Link><button className="primary-button compact" onClick={addRecord}><Plus size={17} /> New record</button><button className="icon-button danger" onClick={async () => { if (database && confirm(`Delete ${database.name}?`)) { await deleteDatabase(database.id); navigate('/') } }}><Trash2 size={17} /></button></div></header>

    <div className="database-toolbar-v2"><div className="database-toolbar-left"><label className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search every property" /></label><div className="view-switcher">{views.map((view) => <button className={activeView?.id === view.id ? 'active' : ''} onClick={() => setActiveViewId(view.id)} key={view.id}>{view.type === 'table' ? <Table2 size={15} /> : view.type === 'gallery' ? <LayoutGrid size={15} /> : <Kanban size={15} />}{view.name}</button>)}</div></div><div className="database-toolbar-right"><button className="secondary-button" onClick={() => setShowViewSettings((v) => !v)}><Settings2 size={16} /> View settings</button><button className="secondary-button" onClick={() => setShowFieldForm((v) => !v)}><Plus size={16} /> Property</button></div></div>

    {showViewSettings && activeView && <div className="view-settings revamp-settings">
      <label>View name<input value={activeView.name} onChange={(e) => setViews((current) => current.map((v) => v.id === activeView.id ? { ...v, name: e.target.value } : v))} onBlur={() => updateView(activeView.id, { name: activeView.name })} /></label>
      {activeView.type === 'gallery' && <><label className="checkbox-row"><input type="checkbox" checked={useDesignedCard} onChange={(e) => patchActiveView({ useDesignedCard: e.target.checked })} /> Use designed gallery card</label><label>Fallback cover<select value={galleryImageId} onChange={(e) => patchActiveView({ galleryImageFieldId: e.target.value })}><option value="">No cover</option>{imageFields.map((field) => <option value={field.id} key={field.id}>{field.name}</option>)}</select></label><Link className="secondary-button" to={`/database/${databaseId}/design/gallery`}><Brush size={15} /> Design gallery card</Link></>}
      {activeView.type === 'board' && <><label>Group by<select value={boardFieldId} onChange={(e) => patchActiveView({ boardFieldId: e.target.value })}><option value="">Choose Select property</option>{selectFields.map((field) => <option value={field.id} key={field.id}>{field.name}</option>)}</select></label><label className="checkbox-row"><input type="checkbox" checked={useDesignedCard} onChange={(e) => patchActiveView({ useDesignedCard: e.target.checked })} /> Use designed board card</label><Link className="secondary-button" to={`/database/${databaseId}/design/board`}><Brush size={15} /> Design board card</Link></>}
      {activeView.type === 'table' && <><label>Density<select value={String(activeView.config.density || 'comfortable')} onChange={(e) => patchActiveView({ density: e.target.value })}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label><label>Header color<input type="color" value={String(activeView.config.headerColor || '#faf8f4')} onChange={(e) => patchActiveView({ headerColor: e.target.value })} /></label><label>Row color<input type="color" value={String(activeView.config.rowColor || '#ffffff')} onChange={(e) => patchActiveView({ rowColor: e.target.value })} /></label></>}
    </div>}

    {showFieldForm && <div className="field-builder card-panel"><label>Property name<input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} /></label><label>Type<select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as FieldType)}>{fieldTypes.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}</select></label>{['select','multi_select'].includes(newFieldType) && <label>Options<input value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} placeholder="Planned, Booked, Done" /></label>}{newFieldType === 'relation' && <label>Related database<select value={relationTarget} onChange={(e) => setRelationTarget(e.target.value)}><option value="">Choose database</option>{allDatabases.filter((db) => db.id !== databaseId).map((db) => <option value={db.id} key={db.id}>{db.name}</option>)}</select></label>}<div className="field-builder-actions"><button className="primary-button compact" onClick={addField}>Add property</button></div></div>}

    {activeView?.type === 'gallery' ? renderGallery() : activeView?.type === 'board' ? renderBoard() : renderTable()}
  </div>
}
