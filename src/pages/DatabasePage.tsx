import { useEffect, useMemo, useState } from 'react'
import { Brush, Image as ImageIcon, Kanban, LayoutGrid, MoreHorizontal, Plus, Search, Settings2, Table2, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import RecordCanvas from '../components/RecordCanvas'
import { createField, createRecord, deleteDatabase, deleteField, deleteRecord, getDatabase, getFields, getLayoutElements, getOrCreateLayout, getRecords, updateRecord } from '../lib/data'
import { displayValue } from '../lib/value'
import type { Database, Field, FieldType, Layout, LayoutElement, RecordRow } from '../types'

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' }, { value: 'long_text', label: 'Long text' }, { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' }, { value: 'checkbox', label: 'Checkbox' }, { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi-select' }, { value: 'url', label: 'URL' }, { value: 'image', label: 'Image URL' },
  { value: 'relation', label: 'Relation (stored as IDs)' },
]

type ViewMode = 'table' | 'gallery' | 'board'

export default function DatabasePage() {
  const { databaseId = '' } = useParams()
  const navigate = useNavigate()
  const [database, setDatabase] = useState<Database | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [records, setRecords] = useState<RecordRow[]>([])
  const [layout, setLayout] = useState<Layout | null>(null)
  const [layoutElements, setLayoutElements] = useState<LayoutElement[]>([])
  const [query, setQuery] = useState('')
  const [showFieldForm, setShowFieldForm] = useState(false)
  const [showViewSettings, setShowViewSettings] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<FieldType>('text')
  const [newFieldOptions, setNewFieldOptions] = useState('')
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem(`atlas:view:${databaseId}`) as ViewMode) || 'table')
  const [galleryImageFieldId, setGalleryImageFieldId] = useState(() => localStorage.getItem(`atlas:gallery-image:${databaseId}`) || '')
  const [boardFieldId, setBoardFieldId] = useState(() => localStorage.getItem(`atlas:board-field:${databaseId}`) || '')
  const [useDesignedGallery, setUseDesignedGallery] = useState(() => localStorage.getItem(`atlas:gallery-designed:${databaseId}`) !== 'false')

  const load = async () => {
    const [db, f, r, l] = await Promise.all([getDatabase(databaseId), getFields(databaseId), getRecords(databaseId), getOrCreateLayout(databaseId)])
    const designElements = await getLayoutElements(l.id)
    setDatabase(db)
    setFields(f)
    setRecords(r)
    setLayout(l)
    setLayoutElements(designElements)
    if (!galleryImageFieldId) setGalleryImageFieldId(f.find((field) => field.type === 'image')?.id || '')
    if (!boardFieldId) setBoardFieldId(f.find((field) => field.type === 'select')?.id || '')
  }

  useEffect(() => { load().catch((e) => alert(e.message)) }, [databaseId])
  useEffect(() => { localStorage.setItem(`atlas:view:${databaseId}`, view) }, [databaseId, view])
  useEffect(() => { localStorage.setItem(`atlas:gallery-image:${databaseId}`, galleryImageFieldId) }, [databaseId, galleryImageFieldId])
  useEffect(() => { localStorage.setItem(`atlas:board-field:${databaseId}`, boardFieldId) }, [databaseId, boardFieldId])
  useEffect(() => { localStorage.setItem(`atlas:gallery-designed:${databaseId}`, String(useDesignedGallery)) }, [databaseId, useDesignedGallery])

  const contentFields = fields.filter((field) => field.position > 0 || field.name !== 'Name')
  const filtered = useMemo(() => {
    const needle = query.toLowerCase().trim()
    if (!needle) return records
    return records.filter((record) => {
      if (record.title.toLowerCase().includes(needle)) return true
      return contentFields.some((field) => displayValue(record.data[field.id], field).toLowerCase().includes(needle))
    })
  }, [records, query, contentFields])

  const imageFields = fields.filter((field) => field.type === 'image')
  const selectFields = fields.filter((field) => field.type === 'select')
  const galleryImageField = fields.find((field) => field.id === galleryImageFieldId)
  const boardField = fields.find((field) => field.id === boardFieldId)
  const boardOptions = boardField && Array.isArray(boardField.config.options) ? boardField.config.options.map(String) : []
  const hasDesignedPage = Boolean(layout && layoutElements.length)

  const addRecord = async () => {
    const row = await createRecord(databaseId)
    navigate(`/database/${databaseId}/record/${row.id}`)
  }

  const addField = async () => {
    if (!newFieldName.trim()) return
    const config = newFieldType === 'select' || newFieldType === 'multi_select'
      ? { options: newFieldOptions.split(',').map((x) => x.trim()).filter(Boolean) }
      : {}
    await createField(databaseId, { name: newFieldName.trim(), type: newFieldType, required: false, config }, fields.length)
    setNewFieldName('')
    setNewFieldType('text')
    setNewFieldOptions('')
    setShowFieldForm(false)
    await load()
  }

  const removeField = async (field: Field) => {
    if (!confirm(`Delete the field “${field.name}”? Existing values for it will remain in record JSON but will no longer be shown.`)) return
    await deleteField(field.id)
    await load()
  }

  const removeDb = async () => {
    if (!database || !confirm(`Delete “${database.name}” and all of its records, fields, and designs? This cannot be undone.`)) return
    await deleteDatabase(database.id)
    navigate('/')
  }

  const moveBoardRecord = async (record: RecordRow, value: string) => {
    if (!boardField) return
    const updated = await updateRecord(record.id, { data: { ...record.data, [boardField.id]: value } })
    setRecords((current) => current.map((item) => item.id === updated.id ? updated : item))
  }

  const renderTable = () => (
    <div className="table-shell">
      <table className="data-table">
        <thead><tr><th>Name</th>{contentFields.map((field) => <th key={field.id}><span className="th-inner">{field.name}<button onClick={() => removeField(field)} title={`Delete ${field.name}`}><MoreHorizontal size={14} /></button></span></th>)}<th /></tr></thead>
        <tbody>
          {filtered.map((record) => <tr key={record.id}><td><Link className="record-link" to={`/database/${databaseId}/record/${record.id}`}>{record.title || 'Untitled'}</Link></td>{contentFields.map((field) => <td key={field.id}>{field.type === 'image' && record.data[field.id] ? <img className="tiny-thumb" src={String(record.data[field.id])} alt="" /> : displayValue(record.data[field.id], field)}</td>)}<td className="row-actions"><button className="icon-button" title="Delete record" onClick={async () => { if (confirm(`Delete “${record.title}”?`)) { await deleteRecord(record.id); await load() } }}><Trash2 size={15} /></button></td></tr>)}
          {!filtered.length && <tr><td colSpan={contentFields.length + 2}><div className="table-empty">No matching records.</div></td></tr>}
        </tbody>
      </table>
    </div>
  )

  const renderGallery = () => {
    if (!filtered.length) return <div className="empty-view">No matching records.</div>
    return (
      <div className="gallery-grid">
        {filtered.map((record) => {
          if (useDesignedGallery && hasDesignedPage && layout) {
            return (
              <Link className="gallery-card" to={`/database/${databaseId}/record/${record.id}`} key={record.id} style={{ overflow: 'hidden' }}>
                <div style={{ width: '100%', overflow: 'hidden', background: layout.background, display: 'flex', justifyContent: 'center' }}>
                  <RecordCanvas layout={layout} elements={layoutElements} fields={fields} record={record} maxWidth={300} className="gallery-designed-canvas" />
                </div>
                <div className="gallery-content"><h3>{record.title || 'Untitled'}</h3></div>
              </Link>
            )
          }

          const image = galleryImageField ? String(record.data[galleryImageField.id] || '') : ''
          return (
            <Link className="gallery-card" to={`/database/${databaseId}/record/${record.id}`} key={record.id}>
              <div className="gallery-cover">{image ? <img src={image} alt="" /> : <ImageIcon size={28} />}</div>
              <div className="gallery-content">
                <h3>{record.title || 'Untitled'}</h3>
                <div className="gallery-properties">
                  {contentFields.filter((field) => field.id !== galleryImageFieldId && field.type !== 'long_text').slice(0, 3).map((field) => (
                    <div className="gallery-property" key={field.id}><span>{field.name}</span><span>{displayValue(record.data[field.id], field) || '—'}</span></div>
                  ))}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    )
  }

  const renderBoard = () => {
    if (!boardField) return <div className="empty-view">Add a Select field, then choose it in View settings to create a board.</div>
    const columns = [...boardOptions, 'Unassigned']
    return (
      <div className="board-scroll">
        <div className="board-grid">
          {columns.map((option) => {
            const items = filtered.filter((record) => {
              const current = String(record.data[boardField.id] || '')
              return option === 'Unassigned' ? !current : current === option
            })
            return (
              <section className="board-column" key={option}>
                <div className="board-column-head"><span>{option}</span><span>{items.length}</span></div>
                {items.map((record) => (
                  <div className="board-card" key={record.id}>
                    <Link to={`/database/${databaseId}/record/${record.id}`}><strong>{record.title || 'Untitled'}</strong></Link>
                    <select value={String(record.data[boardField.id] || '')} onChange={(event) => moveBoardRecord(record, event.target.value)}>
                      <option value="">Unassigned</option>
                      {boardOptions.map((item) => <option value={item} key={item}>{item}</option>)}
                    </select>
                    {contentFields.filter((field) => field.id !== boardField.id && field.type !== 'image' && field.type !== 'long_text').slice(0, 2).map((field) => <small key={field.id}>{field.name}: {displayValue(record.data[field.id], field) || '—'}</small>)}
                  </div>
                ))}
              </section>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap wide">
      <header className="page-header database-header">
        <div><p className="eyebrow">DATABASE</p><h1>{database?.icon || '✦'} {database?.name || 'Loading…'}</h1><p className="page-subtitle">{database?.description || 'One source of truth, as many views and designed record pages as you need.'}</p></div>
        <div className="button-row"><Link className="secondary-button" to={`/database/${databaseId}/design`}><Brush size={17} /> Design record page</Link><button className="primary-button compact" onClick={addRecord}><Plus size={17} /> New record</button><button className="icon-button danger" onClick={removeDb} title="Delete database"><Trash2 size={17} /></button></div>
      </header>

      <div className="database-toolbar-v2">
        <div className="database-toolbar-left">
          <label className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search every property" /></label>
          <div className="view-switcher" aria-label="Database view">
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><Table2 size={15} /> Table</button>
            <button className={view === 'gallery' ? 'active' : ''} onClick={() => setView('gallery')}><LayoutGrid size={15} /> Gallery</button>
            <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}><Kanban size={15} /> Board</button>
          </div>
        </div>
        <div className="database-toolbar-right"><button className="secondary-button" onClick={() => setShowViewSettings((value) => !value)}><Settings2 size={16} /> View settings</button><button className="secondary-button" onClick={() => setShowFieldForm((value) => !value)}><Plus size={16} /> Property</button></div>
      </div>

      {showViewSettings && <div className="view-settings">
        {hasDesignedPage && <label className="checkbox-row"><input type="checkbox" checked={useDesignedGallery} onChange={(e) => setUseDesignedGallery(e.target.checked)} /> Use designed record page as gallery card</label>}
        {!useDesignedGallery && <label>Gallery cover<select value={galleryImageFieldId} onChange={(e) => setGalleryImageFieldId(e.target.value)}><option value="">No cover image</option>{imageFields.map((field) => <option value={field.id} key={field.id}>{field.name}</option>)}</select></label>}
        <label>Board grouping<select value={boardFieldId} onChange={(e) => setBoardFieldId(e.target.value)}><option value="">Choose a Select property</option>{selectFields.map((field) => <option value={field.id} key={field.id}>{field.name}</option>)}</select></label>
      </div>}

      {showFieldForm && <div className="field-builder card-panel"><div><label>Property name<input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="Rating" /></label></div><div><label>Type<select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as FieldType)}>{fieldTypes.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}</select></label></div>{['select','multi_select'].includes(newFieldType) && <div><label>Options<input value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} placeholder="Want to read, Reading, Finished" /></label><span className="helper">Comma separated.</span></div>}<div className="field-builder-actions"><button className="primary-button compact" onClick={addField}>Add property</button></div></div>}

      {view === 'table' ? renderTable() : view === 'gallery' ? renderGallery() : renderBoard()}
    </div>
  )
}
