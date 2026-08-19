import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Sparkles } from 'lucide-react'
import FieldInput from './FieldInput'
import { createRecord, getFields, updateRecord } from '../lib/data'
import type { Database, Field } from '../types'

type Props = {
  database: Database | null
  onSaved?: () => void | Promise<void>
  compact?: boolean
}

export default function FriendlyRecordForm({ database, onSaved, compact = false }: Props) {
  const [fields, setFields] = useState<Field[]>([])
  const [title, setTitle] = useState('')
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setTitle('')
    setValues({})
    setSaved(false)
    if (!database?.id) { setFields([]); return }
    getFields(database.id).then(setFields).catch(error => setError(error instanceof Error ? error.message : String(error)))
  }, [database?.id])

  const visibleFields = useMemo(() => fields.filter(field => field.name.toLowerCase() !== 'name'), [fields])
  const titleLabel = useMemo(() => {
    const name = database?.name.toLowerCase() || ''
    if (name.includes('transaction')) return 'What was it?'
    if (name.includes('bill')) return 'Bill or payment'
    if (name.includes('book')) return 'Book title'
    if (name.includes('episode')) return 'Episode title'
    if (name.includes('guest')) return 'Guest name'
    if (name.includes('trip')) return 'Trip name'
    if (name.includes('ritual')) return 'Ritual name'
    if (name.includes('dream')) return 'Dream title'
    if (name.includes('task')) return 'What needs doing?'
    return 'Name'
  }, [database?.name])

  const submit = async () => {
    if (!database || !title.trim()) return
    setBusy(true); setError(''); setSaved(false)
    try {
      const record = await createRecord(database.id, title.trim())
      if (Object.keys(values).length) await updateRecord(record.id, { data: values })
      setTitle(''); setValues({}); setSaved(true)
      window.setTimeout(() => setSaved(false), 2200)
      await onSaved?.()
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally { setBusy(false) }
  }

  if (!database) return <div className="friendly-form-empty"><Sparkles/><strong>Choose a collection</strong><span>Pick what you want to add to, then Atlas will turn its properties into a friendly form.</span></div>

  return <div className={`friendly-record-form ${compact ? 'compact' : ''}`}>
    <div className="friendly-form-head"><div><span>ADD TO</span><strong>{database.name}</strong></div><Plus/></div>
    <label className="friendly-field"><span>{titleLabel}</span><input value={title} onChange={event => setTitle(event.target.value)} placeholder={titleLabel} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) void submit() }} /></label>
    <div className="friendly-form-fields">{visibleFields.map(field => <FriendlyField key={field.id} field={field} value={values[field.id]} onChange={value => setValues(current => ({ ...current, [field.id]: value }))}/>)}</div>
    {error && <p className="atlas-asset-error">{error}</p>}
    <button className={`friendly-form-submit ${saved ? 'saved' : ''}`} disabled={busy || !title.trim()} onClick={() => void submit()}>{saved ? <><Check/>Saved</> : <><Plus/>{busy ? 'Saving…' : `Add to ${database.name}`}</>}</button>
  </div>
}

function FriendlyField({ field, value, onChange }: { field: Field; value: unknown; onChange: (value: unknown) => void }) {
  const options = Array.isArray(field.config?.options) ? field.config.options as string[] : []
  if (field.type === 'select' && !options.length) return <label className="friendly-field field-select"><span>{field.name}</span><input value={String(value ?? '')} placeholder={`Type ${field.name.toLowerCase()}…`} onChange={event => onChange(event.target.value)}/><small>Add formal dropdown choices later if you want them.</small></label>
  if (field.type === 'multi_select' && !options.length) {
    const text = Array.isArray(value) ? value.join(', ') : String(value ?? '')
    return <label className="friendly-field field-multi_select"><span>{field.name}</span><input value={text} placeholder="Separate items with commas" onChange={event => onChange(event.target.value.split(',').map(item => item.trim()).filter(Boolean))}/><small>Comma-separated for now. You can turn these into preset choices later.</small></label>
  }
  return <label className={`friendly-field field-${field.type}`}><span>{field.name}</span><FieldInput field={field} value={value} onChange={onChange}/></label>
}
