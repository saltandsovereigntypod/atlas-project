import { useEffect, useState } from 'react'
import { ArrowLeft, Brush, Check, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import FieldInput from '../components/FieldInput'
import RecordCanvas from '../components/RecordCanvas'
import { deleteRecord, getDatabase, getFields, getLayoutElements, getOrCreateLayout, getRecord, updateRecord } from '../lib/data'
import type { Database, Field, Layout, LayoutElement, RecordRow } from '../types'

type RecordMode = 'edit' | 'design'

export default function RecordPage() {
  const { databaseId = '', recordId = '' } = useParams()
  const navigate = useNavigate()
  const [database, setDatabase] = useState<Database | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [record, setRecord] = useState<RecordRow | null>(null)
  const [layout, setLayout] = useState<Layout | null>(null)
  const [elements, setElements] = useState<LayoutElement[]>([])
  const [mode, setMode] = useState<RecordMode>('edit')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([getDatabase(databaseId), getFields(databaseId), getRecord(recordId), getOrCreateLayout(databaseId)])
      .then(async ([db, f, r, l]) => {
        setDatabase(db)
        setFields(f)
        setRecord(r)
        setLayout(l)
        setElements(await getLayoutElements(l.id))
      })
      .catch((error) => alert(error instanceof Error ? error.message : String(error)))
  }, [databaseId, recordId])

  if (!record) return <div className="page-wrap"><p>Loading record…</p></div>
  const contentFields = fields.filter((field) => !(field.position === 0 && field.name === 'Name'))

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const updated = await updateRecord(record.id, { title: record.title, data: record.data })
      setRecord(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 1600)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="record-page">
      <div className="record-topbar">
        <Link to={`/database/${databaseId}`} className="back-link"><ArrowLeft size={17} /> {database?.name || 'Database'}</Link>
        <div className="record-mode-tabs">
          <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}><Pencil size={14} /> Edit data</button>
          <button className={mode === 'design' ? 'active' : ''} onClick={() => setMode('design')}><Sparkles size={14} /> Designed page</button>
        </div>
        <div className="button-row">
          {mode === 'edit' && <><span className={`save-state ${saved ? 'visible' : ''}`}><Check size={15} /> Saved</span><button className="secondary-button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></>}
          <Link className="secondary-button" to={`/database/${databaseId}/design`}><Brush size={16} /> Designer</Link>
          <button className="icon-button danger" onClick={async () => { if (confirm('Delete this record?')) { await deleteRecord(record.id); navigate(`/database/${databaseId}`) } }}><Trash2 size={17} /></button>
        </div>
      </div>

      {mode === 'edit' ? (
        <div className="record-editor">
          <input className="record-title-input" value={record.title} onChange={(e) => setRecord({ ...record, title: e.target.value })} placeholder="Untitled" />
          <div className="record-fields">
            {contentFields.map((field) => <div className="record-field" key={field.id}><div className="field-label"><span>{field.name}</span><small>{field.type.replace('_', ' ')}</small></div><FieldInput field={field} value={record.data[field.id]} onChange={(value) => setRecord({ ...record, data: { ...record.data, [field.id]: value } })} /></div>)}
            {!contentFields.length && <div className="empty-inline">This database only has a title property. Add more properties from the database.</div>}
          </div>
        </div>
      ) : elements.length && layout ? (
        <div className="record-design-stage"><RecordCanvas layout={layout} elements={elements} fields={fields} record={record} maxWidth={1100} /></div>
      ) : (
        <div className="record-design-empty"><h2>This record does not have a designed page yet.</h2><p>Open the designer, place text, shapes, images, and bound properties, then every record in this database can use that layout.</p><Link className="primary-button" to={`/database/${databaseId}/design`}><Brush size={17} /> Design this database</Link></div>
      )}
    </div>
  )
}
