import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Grip, LayoutGrid, Move } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getRecords } from '../lib/data'
import type { Database, RecordRow } from '../types'

type ViewMode = 'gallery' | 'table' | 'board'
type RecordLayoutMode = 'auto' | 'freeform'

type CardLayout = {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex?: number
}

type Props = {
  blockId: string
  config: Record<string, unknown>
  editing: boolean
  databases: Database[]
  save: (patch: Record<string, unknown>) => void
}

export default function DatabaseCanvasView({ blockId, config, editing, databases, save }: Props) {
  const databaseId = String(config.databaseId || '')
  const mode = String(config.mode || 'gallery') as ViewMode
  const recordLayoutMode = String(config.recordLayoutMode || 'auto') as RecordLayoutMode
  const title = String(config.title || databases.find(db => db.id === databaseId)?.name || '')
  const [records, setRecords] = useState<RecordRow[]>([])

  useEffect(() => {
    if (!databaseId) { setRecords([]); return }
    getRecords(databaseId).then(setRecords).catch(console.error)
  }, [databaseId])

  const shown = useMemo(() => records.slice(0, Number(config.limit || 24)), [records, config.limit])
  const storedLayouts = (config.recordLayouts && typeof config.recordLayouts === 'object' ? config.recordLayouts : {}) as Record<string, CardLayout>

  const layoutFor = (record: RecordRow, index: number): CardLayout => storedLayouts[record.id] || {
    x: (index % 4) * 190,
    y: Math.floor(index / 4) * 180,
    width: 170,
    height: 150,
    rotation: 0,
    zIndex: index + 1,
  }

  const saveRecordLayout = (recordId: string, layout: CardLayout) => {
    save({ recordLayouts: { ...storedLayouts, [recordId]: layout } })
  }

  const freeformHeight = Math.max(220, ...shown.map((record, index) => {
    const l = layoutFor(record, index)
    return l.y + l.height + 24
  }))

  return <div
    className="db-canvas-view"
    data-block-id={blockId}
    onPointerDown={event => event.stopPropagation()}
    onClick={event => event.stopPropagation()}
  >
    <div className="db-canvas-header">
      {title && <h3>{title}</h3>}
      {editing && <div className="db-canvas-controls">
        <button type="button" className={recordLayoutMode === 'auto' ? 'active' : ''} onClick={() => save({ recordLayoutMode: 'auto' })}><LayoutGrid /> Auto layout</button>
        <button type="button" className={recordLayoutMode === 'freeform' ? 'active' : ''} onClick={() => save({ recordLayoutMode: 'freeform' })}><Move /> Freeform records</button>
      </div>}
    </div>

    {recordLayoutMode === 'freeform'
      ? <div className="db-record-freeform" style={{ minHeight: freeformHeight }}>
          {shown.map((record, index) => <FreeformRecordCard key={record.id} record={record} databaseId={databaseId} editing={editing} layout={layoutFor(record, index)} onSave={layout => saveRecordLayout(record.id, layout)} />)}
        </div>
      : <AutoRecords records={shown} databaseId={databaseId} editing={editing} mode={mode} />}
  </div>
}

function FreeformRecordCard({ record, databaseId, editing, layout, onSave }: { record: RecordRow; databaseId: string; editing: boolean; layout: CardLayout; onSave: (layout: CardLayout) => void }) {
  const [local, setLocal] = useState(layout)
  useEffect(() => setLocal(layout), [layout.x, layout.y, layout.width, layout.height, layout.rotation, layout.zIndex])

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (!editing || (event.target as HTMLElement).closest('button,a,.record-resize-handle')) return
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const origin = { ...local }
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)

    const move = (e: PointerEvent) => {
      e.stopPropagation()
      setLocal(current => ({
        ...current,
        x: Math.max(0, origin.x + e.clientX - startX),
        y: Math.max(0, origin.y + e.clientY - startY),
      }))
    }

    const up = (e: PointerEvent) => {
      e.stopPropagation()
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.releasePointerCapture?.(event.pointerId)
      setLocal(current => { onSave(current); return current })
    }

    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  const resize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!editing) return
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const origin = { ...local }
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)

    const move = (e: PointerEvent) => {
      e.stopPropagation()
      setLocal(current => ({
        ...current,
        width: Math.max(110, origin.width + e.clientX - startX),
        height: Math.max(90, origin.height + e.clientY - startY),
      }))
    }

    const up = (e: PointerEvent) => {
      e.stopPropagation()
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.releasePointerCapture?.(event.pointerId)
      setLocal(current => { onSave(current); return current })
    }

    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  const style = {
    left: local.x,
    top: local.y,
    width: local.width,
    height: local.height,
    zIndex: local.zIndex || 1,
    transform: `rotate(${local.rotation || 0}deg)`,
  }

  return <div className={`db-freeform-card ${editing ? 'editing' : ''}`} style={style} onPointerDown={drag} onClick={event => event.stopPropagation()}>
    {editing && <div className="db-card-grip"><Grip /></div>}
    {editing
      ? <div className="db-card-content"><strong>{record.title}</strong><small>Drag me independently</small></div>
      : <Link className="db-card-content" to={`/database/${databaseId}/record/${record.id}`}><strong>{record.title}</strong></Link>}
    {editing && <button type="button" className="record-resize-handle" onPointerDown={resize} aria-label="Resize record card" />}
  </div>
}

function AutoRecords({ records, databaseId, editing, mode }: { records: RecordRow[]; databaseId: string; editing: boolean; mode: ViewMode }) {
  if (!records.length) return <div className="canvas-data-empty">No records yet.</div>
  if (mode === 'table') return <div className="canvas-record-table">{records.map(record => editing ? <div key={record.id}><span>{record.title}</span></div> : <Link key={record.id} to={`/database/${databaseId}/record/${record.id}`}><span>{record.title}</span></Link>)}</div>
  if (mode === 'board') return <div className="canvas-record-board"><div><span>Records</span>{records.map(record => editing ? <div key={record.id}>{record.title}</div> : <Link key={record.id} to={`/database/${databaseId}/record/${record.id}`}>{record.title}</Link>)}</div></div>
  return <div className="canvas-record-gallery">{records.map(record => editing ? <div className="canvas-record-card" key={record.id}><strong>{record.title}</strong></div> : <Link className="canvas-record-card" key={record.id} to={`/database/${databaseId}/record/${record.id}`}><strong>{record.title}</strong></Link>)}</div>
}
