import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Grip, LayoutGrid, Move, Palette, X } from 'lucide-react'
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

type CardStyle = {
  background?: string
  borderColor?: string
  borderWidth?: number
  radius?: number
  textColor?: string
  fontSize?: number
  fontFamily?: string
  padding?: number
  shadow?: boolean
}

type Props = {
  blockId: string
  config: Record<string, unknown>
  editing: boolean
  databases: Database[]
  save: (patch: Record<string, unknown>) => void
}

const defaultCardStyle: CardStyle = {
  background: 'transparent',
  borderColor: 'transparent',
  borderWidth: 0,
  radius: 0,
  textColor: 'inherit',
  fontSize: 18,
  fontFamily: 'Georgia, serif',
  padding: 12,
  shadow: false,
}

export default function DatabaseCanvasView({ blockId, config, editing, databases, save }: Props) {
  const databaseId = String(config.databaseId || '')
  const mode = String(config.mode || 'gallery') as ViewMode
  const recordLayoutMode = String(config.recordLayoutMode || 'auto') as RecordLayoutMode
  const title = String(config.title || databases.find(db => db.id === databaseId)?.name || '')
  const [records, setRecords] = useState<RecordRow[]>([])
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

  useEffect(() => {
    if (!databaseId) { setRecords([]); return }
    getRecords(databaseId).then(setRecords).catch(console.error)
  }, [databaseId])

  useEffect(() => { if (!editing) setSelectedRecordId(null) }, [editing])

  const shown = useMemo(() => records.slice(0, Number(config.limit || 24)), [records, config.limit])
  const storedLayouts = (config.recordLayouts && typeof config.recordLayouts === 'object' ? config.recordLayouts : {}) as Record<string, CardLayout>
  const storedStyles = (config.recordStyles && typeof config.recordStyles === 'object' ? config.recordStyles : {}) as Record<string, CardStyle>
  const viewCardStyle = (config.defaultCardStyle && typeof config.defaultCardStyle === 'object' ? config.defaultCardStyle : {}) as CardStyle

  const layoutFor = (record: RecordRow, index: number): CardLayout => storedLayouts[record.id] || {
    x: (index % 4) * 190,
    y: Math.floor(index / 4) * 180,
    width: 170,
    height: 150,
    rotation: 0,
    zIndex: index + 1,
  }

  const styleFor = (record: RecordRow): CardStyle => ({ ...defaultCardStyle, ...viewCardStyle, ...storedStyles[record.id] })

  const saveRecordLayout = (recordId: string, layout: CardLayout) => {
    save({ recordLayouts: { ...storedLayouts, [recordId]: layout } })
  }

  const saveRecordStyle = (recordId: string, style: CardStyle) => {
    save({ recordStyles: { ...storedStyles, [recordId]: style } })
  }

  const freeformHeight = Math.max(220, ...shown.map((record, index) => {
    const l = layoutFor(record, index)
    return l.y + l.height + 24
  }))

  return <div
    className={`db-canvas-view ${editing ? 'editing' : ''}`}
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
      ? <div className="db-record-freeform" style={{ minHeight: freeformHeight }} onPointerDown={() => setSelectedRecordId(null)}>
          {shown.map((record, index) => <FreeformRecordCard
            key={record.id}
            record={record}
            databaseId={databaseId}
            editing={editing}
            selected={selectedRecordId === record.id}
            layout={layoutFor(record, index)}
            cardStyle={styleFor(record)}
            onSelect={() => setSelectedRecordId(record.id)}
            onSave={layout => saveRecordLayout(record.id, layout)}
            onSaveStyle={style => saveRecordStyle(record.id, style)}
          />)}
        </div>
      : <AutoRecords records={shown} databaseId={databaseId} editing={editing} mode={mode} />}
  </div>
}

function FreeformRecordCard({ record, databaseId, editing, selected, layout, cardStyle, onSelect, onSave, onSaveStyle }: { record: RecordRow; databaseId: string; editing: boolean; selected: boolean; layout: CardLayout; cardStyle: CardStyle; onSelect: () => void; onSave: (layout: CardLayout) => void; onSaveStyle: (style: CardStyle) => void }) {
  const [local, setLocal] = useState(layout)
  const [styleOpen, setStyleOpen] = useState(false)
  useEffect(() => setLocal(layout), [layout.x, layout.y, layout.width, layout.height, layout.rotation, layout.zIndex])
  useEffect(() => { if (!selected) setStyleOpen(false) }, [selected])

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    onSelect()
    if (!editing || (event.target as HTMLElement).closest('button,a,input,select,.record-resize-handle,.db-card-style-panel')) return
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
    onSelect()
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
        width: Math.max(80, origin.width + e.clientX - startX),
        height: Math.max(50, origin.height + e.clientY - startY),
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

  const style: CSSProperties = {
    left: local.x,
    top: local.y,
    width: local.width,
    height: local.height,
    zIndex: local.zIndex || 1,
    transform: `rotate(${local.rotation || 0}deg)`,
    background: cardStyle.background || 'transparent',
    color: cardStyle.textColor || 'inherit',
    border: `${Number(cardStyle.borderWidth || 0)}px solid ${cardStyle.borderColor || 'transparent'}`,
    borderRadius: Number(cardStyle.radius || 0),
    boxShadow: cardStyle.shadow ? '0 14px 34px rgba(40,30,20,.14)' : 'none',
  }

  const contentStyle: CSSProperties = {
    padding: Number(cardStyle.padding ?? 12),
    fontFamily: cardStyle.fontFamily || 'Georgia, serif',
  }

  return <div className={`db-freeform-card ${editing ? 'editing' : ''} ${selected ? 'selected' : ''}`} style={style} onPointerDown={drag} onClick={event => { event.stopPropagation(); onSelect() }}>
    {editing && selected && <div className="db-card-toolbar" onPointerDown={event => event.stopPropagation()}>
      <button type="button" onClick={() => setStyleOpen(v => !v)}><Palette /> Card</button>
    </div>}
    {editing && selected && styleOpen && <CardStylePanel style={cardStyle} onSave={onSaveStyle} onClose={() => setStyleOpen(false)} />}
    {editing && <div className="db-card-grip"><Grip /></div>}
    {editing
      ? <div className="db-card-content" style={contentStyle}><strong style={{ fontSize: Number(cardStyle.fontSize || 18) }}>{record.title}</strong></div>
      : <Link className="db-card-content" style={contentStyle} to={`/database/${databaseId}/record/${record.id}`}><strong style={{ fontSize: Number(cardStyle.fontSize || 18) }}>{record.title}</strong></Link>}
    {editing && selected && <button type="button" className="record-resize-handle" onPointerDown={resize} aria-label="Resize record card" />}
  </div>
}

function CardStylePanel({ style, onSave, onClose }: { style: CardStyle; onSave: (style: CardStyle) => void; onClose: () => void }) {
  const change = (patch: Partial<CardStyle>) => onSave({ ...style, ...patch })
  return <div className="db-card-style-panel" onPointerDown={event => event.stopPropagation()}>
    <div className="db-card-style-head"><strong>Card design</strong><button type="button" onClick={onClose}><X /></button></div>
    <div className="db-style-grid-two">
      <label>Background<input type="color" value={safeColor(style.background, '#ffffff')} onChange={e => change({ background: e.target.value })} /></label>
      <label>Text<input type="color" value={safeColor(style.textColor, '#211e1a')} onChange={e => change({ textColor: e.target.value })} /></label>
    </div>
    <div className="db-style-grid-two">
      <label>Border<input type="color" value={safeColor(style.borderColor, '#ded6cb')} onChange={e => change({ borderColor: e.target.value })} /></label>
      <label>Width<input type="number" min="0" max="12" value={Number(style.borderWidth || 0)} onChange={e => change({ borderWidth: Number(e.target.value) })} /></label>
    </div>
    <div className="db-style-grid-two">
      <label>Radius<input type="number" min="0" value={Number(style.radius || 0)} onChange={e => change({ radius: Number(e.target.value) })} /></label>
      <label>Padding<input type="number" min="0" value={Number(style.padding ?? 12)} onChange={e => change({ padding: Number(e.target.value) })} /></label>
    </div>
    <label>Title size<input type="number" min="8" value={Number(style.fontSize || 18)} onChange={e => change({ fontSize: Number(e.target.value) })} /></label>
    <label>Font<select value={style.fontFamily || 'Georgia, serif'} onChange={e => change({ fontFamily: e.target.value })}><option value="Georgia, serif">Georgia</option><option value="Arial, sans-serif">Arial</option><option value="Verdana, sans-serif">Verdana</option><option value="'Courier New', monospace">Courier New</option></select></label>
    <label className="db-style-check"><input type="checkbox" checked={Boolean(style.shadow)} onChange={e => change({ shadow: e.target.checked })} /> Shadow</label>
    <button type="button" className="db-reset-card" onClick={() => onSave({ ...defaultCardStyle })}>Reset to transparent</button>
  </div>
}

function AutoRecords({ records, databaseId, editing, mode }: { records: RecordRow[]; databaseId: string; editing: boolean; mode: ViewMode }) {
  if (!records.length) return <div className="canvas-data-empty">No records yet.</div>
  if (mode === 'table') return <div className="canvas-record-table">{records.map(record => editing ? <div key={record.id}><span>{record.title}</span></div> : <Link key={record.id} to={`/database/${databaseId}/record/${record.id}`}><span>{record.title}</span></Link>)}</div>
  if (mode === 'board') return <div className="canvas-record-board"><div><span>Records</span>{records.map(record => editing ? <div key={record.id}>{record.title}</div> : <Link key={record.id} to={`/database/${databaseId}/record/${record.id}`}>{record.title}</Link>)}</div></div>
  return <div className="canvas-record-gallery">{records.map(record => editing ? <div className="canvas-record-card" key={record.id}><strong>{record.title}</strong></div> : <Link className="canvas-record-card" key={record.id} to={`/database/${databaseId}/record/${record.id}`}><strong>{record.title}</strong></Link>)}</div>
}

function safeColor(value: unknown, fallback: string) {
  const text = String(value || '')
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback
}
