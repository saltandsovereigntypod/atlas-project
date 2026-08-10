import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import FieldInput from '../components/FieldInput'
import { deleteRecord, getDatabase, getFields, getRecord, updateRecord } from '../lib/data'
import type { Database, Field, RecordRow } from '../types'

export default function RecordPage() {
  const { databaseId = '', recordId = '' } = useParams()
  const navigate = useNavigate()
  const [database, setDatabase] = useState<Database | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [record, setRecord] = useState<RecordRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([getDatabase(databaseId), getFields(databaseId), getRecord(recordId)]).then(([db, f, r]) => { setDatabase(db); setFields(f); setRecord(r) })
  }, [databaseId, recordId])

  if (!record) return <div className="page-wrap"><p>Loading record…</p></div>
  const contentFields = fields.filter((f) => !(f.position === 0 && f.name === 'Name'))

  const save = async () => {
    setSaving(true); setSaved(false)
    try { const updated = await updateRecord(record.id, { title: record.title, data: record.data }); setRecord(updated); setSaved(true); setTimeout(() => setSaved(false), 1600) }
    finally { setSaving(false) }
  }

  return (
    <div className="record-page">
      <div className="record-topbar"><Link to={`/database/${databaseId}`} className="back-link"><ArrowLeft size={17} /> {database?.name || 'Database'}</Link><div className="button-row"><span className={`save-state ${saved ? 'visible' : ''}`}><Check size={15} /> Saved</span><button className="secondary-button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button><button className="icon-button danger" onClick={async () => { if (confirm('Delete this record?')) { await deleteRecord(record.id); navigate(`/database/${databaseId}`) } }}><Trash2 size={17} /></button></div></div>
      <div className="record-editor">
        <input className="record-title-input" value={record.title} onChange={(e) => setRecord({ ...record, title: e.target.value })} placeholder="Untitled" />
        <div className="record-fields">{contentFields.map((field) => <div className="record-field" key={field.id}><div className="field-label"><span>{field.name}</span><small>{field.type.replace('_', ' ')}</small></div><FieldInput field={field} value={record.data[field.id]} onChange={(value) => setRecord({ ...record, data: { ...record.data, [field.id]: value } })} /></div>)}{!contentFields.length && <div className="empty-inline">This database only has a title field. Add more fields from the database table.</div>}</div>
      </div>
    </div>
  )
}
