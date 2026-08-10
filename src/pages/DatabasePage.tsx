import { useEffect, useMemo, useState } from 'react'
import { Brush, MoreHorizontal, Plus, Search, Settings2, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createField, createRecord, deleteDatabase, deleteField, deleteRecord, getDatabase, getFields, getRecords } from '../lib/data'
import { displayValue } from '../lib/value'
import type { Database, Field, FieldType, RecordRow } from '../types'

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' }, { value: 'long_text', label: 'Long text' }, { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' }, { value: 'checkbox', label: 'Checkbox' }, { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi-select' }, { value: 'url', label: 'URL' }, { value: 'image', label: 'Image URL' },
  { value: 'relation', label: 'Relation (stored as IDs)' },
]

export default function DatabasePage() {
  const { databaseId = '' } = useParams()
  const navigate = useNavigate()
  const [database, setDatabase] = useState<Database | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [records, setRecords] = useState<RecordRow[]>([])
  const [query, setQuery] = useState('')
  const [showFieldForm, setShowFieldForm] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<FieldType>('text')
  const [newFieldOptions, setNewFieldOptions] = useState('')

  const load = async () => {
    const [db, f, r] = await Promise.all([getDatabase(databaseId), getFields(databaseId), getRecords(databaseId)])
    setDatabase(db); setFields(f); setRecords(r)
  }
  useEffect(() => { load().catch((e) => alert(e.message)) }, [databaseId])

  const filtered = useMemo(() => records.filter((r) => r.title.toLowerCase().includes(query.toLowerCase())), [records, query])

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
    setNewFieldName(''); setNewFieldType('text'); setNewFieldOptions(''); setShowFieldForm(false); await load()
  }

  const removeField = async (field: Field) => {
    if (!confirm(`Delete the field “${field.name}”? Existing values for it will remain in record JSON but will no longer be shown.`)) return
    await deleteField(field.id); await load()
  }

  const removeDb = async () => {
    if (!database || !confirm(`Delete “${database.name}” and all of its records, fields, and designs? This cannot be undone.`)) return
    await deleteDatabase(database.id); navigate('/')
  }

  return (
    <div className="page-wrap wide">
      <header className="page-header database-header">
        <div><p className="eyebrow">DATABASE</p><h1>{database?.icon || '✦'} {database?.name || 'Loading…'}</h1><p className="page-subtitle">{database?.description || 'Add fields, create records, and design how those records should look.'}</p></div>
        <div className="button-row"><Link className="secondary-button" to={`/database/${databaseId}/design`}><Brush size={17} /> Design</Link><button className="primary-button compact" onClick={addRecord}><Plus size={17} /> New record</button><button className="icon-button danger" onClick={removeDb} title="Delete database"><Trash2 size={17} /></button></div>
      </header>

      <div className="toolbar"><label className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records" /></label><button className="secondary-button" onClick={() => setShowFieldForm((x) => !x)}><Settings2 size={16} /> Add field</button></div>

      {showFieldForm && <div className="field-builder card-panel"><div><label>Field name<input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="Rating" /></label></div><div><label>Type<select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as FieldType)}>{fieldTypes.map((t) => <option value={t.value} key={t.value}>{t.label}</option>)}</select></label></div>{['select','multi_select'].includes(newFieldType) && <div><label>Options<input value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} placeholder="Want to read, Reading, Finished" /></label><span className="helper">Comma separated.</span></div>}<div className="field-builder-actions"><button className="primary-button compact" onClick={addField}>Add field</button></div></div>}

      <div className="table-shell">
        <table className="data-table">
          <thead><tr><th>Name</th>{fields.filter((f) => f.position > 0 || f.name !== 'Name').map((field) => <th key={field.id}><span className="th-inner">{field.name}<button onClick={() => removeField(field)} title={`Delete ${field.name}`}><MoreHorizontal size={14} /></button></span></th>)}<th /></tr></thead>
          <tbody>
            {filtered.map((record) => <tr key={record.id}><td><Link className="record-link" to={`/database/${databaseId}/record/${record.id}`}>{record.title || 'Untitled'}</Link></td>{fields.filter((f) => f.position > 0 || f.name !== 'Name').map((field) => <td key={field.id}>{field.type === 'image' && record.data[field.id] ? <img className="tiny-thumb" src={String(record.data[field.id])} alt="" /> : displayValue(record.data[field.id], field)}</td>)}<td className="row-actions"><button className="icon-button" title="Delete record" onClick={async () => { if (confirm(`Delete “${record.title}”?`)) { await deleteRecord(record.id); await load() } }}><Trash2 size={15} /></button></td></tr>)}
            {!filtered.length && <tr><td colSpan={fields.length + 1}><div className="table-empty">No records yet. Create one and start shaping this database.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
