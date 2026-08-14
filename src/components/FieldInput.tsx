import { useEffect, useState } from 'react'
import type { Field, RecordRow } from '../types'
import { supabase } from '../lib/supabase'
import { getRecords } from '../lib/data'

interface Props {
  field: Field
  value: unknown
  onChange: (value: unknown) => void
}

export default function FieldInput({ field, value, onChange }: Props) {
  const options = Array.isArray(field.config?.options) ? field.config.options as string[] : []
  const [uploading, setUploading] = useState(false)
  const [relationRecords, setRelationRecords] = useState<RecordRow[]>([])
  const relationTarget = String(field.config?.target_database_id || '')

  useEffect(() => {
    if (field.type !== 'relation' || !relationTarget) return
    getRecords(relationTarget).then(setRelationRecords).catch(console.error)
  }, [field.type, relationTarget])

  if (field.type === 'checkbox') return <label className="checkbox-row"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /> <span>Checked</span></label>
  if (field.type === 'long_text') return <textarea rows={5} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
  if (field.type === 'number') return <input type="number" value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
  if (field.type === 'date') return <input type="date" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
  if (field.type === 'select') return <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}><option value="">None</option>{options.map((item) => <option key={item}>{item}</option>)}</select>
  if (field.type === 'multi_select') {
    const selected = Array.isArray(value) ? value as string[] : []
    return <div className="option-grid">{options.map((item) => <label className="checkbox-row" key={item}><input type="checkbox" checked={selected.includes(item)} onChange={(e) => onChange(e.target.checked ? [...selected, item] : selected.filter((x) => x !== item))} /> {item}</label>)}</div>
  }
  if (field.type === 'relation') {
    if (!relationTarget) return <div className="relation-warning">This relation has no target database. Recreate the property and choose one.</div>
    const selected = Array.isArray(value) ? value as string[] : value ? [String(value)] : []
    return <div className="relation-picker">{relationRecords.map((record) => <label className="checkbox-row" key={record.id}><input type="checkbox" checked={selected.includes(record.id)} onChange={(e) => onChange(e.target.checked ? [...selected, record.id] : selected.filter((id) => id !== record.id))} /> {record.title}</label>)}{!relationRecords.length && <span className="helper">No records in the related database yet.</span>}</div>
  }
  if (field.type === 'image') {
    const upload = async (file: File) => {
      setUploading(true)
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user) throw userError || new Error('You must be signed in to upload.')
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${userData.user.id}/${crypto.randomUUID()}-${safeName}`
        const { error } = await supabase.storage.from('user-assets').upload(path, file, { upsert: false })
        if (error) throw error
        const { data } = supabase.storage.from('user-assets').getPublicUrl(path)
        onChange(data.publicUrl)
      } catch (error) { alert(error instanceof Error ? error.message : 'Upload failed') } finally { setUploading(false) }
    }
    return <div className="image-field-input"><input type="url" placeholder="https://…" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} /><label className="secondary-button upload-button">{uploading ? 'Uploading…' : 'Upload image'}<input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.currentTarget.value = '' }} /></label>{Boolean(value) && <img className="image-preview" src={String(value)} alt="Selected asset" />}</div>
  }
  return <input type={field.type === 'url' ? 'url' : 'text'} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
}
