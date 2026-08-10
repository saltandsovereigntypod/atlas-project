import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Image, Plus, Square, Trash2, Type } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  createLayoutElement,
  deleteLayoutElement,
  getDatabase,
  getFields,
  getLayoutElements,
  getOrCreateLayout,
  getRecords,
  updateLayout,
  updateLayoutElement,
} from '../lib/data'
import { displayValue } from '../lib/value'
import type { Database, Field, Layout, LayoutElement, RecordRow } from '../types'

type DragState = { id: string; startX: number; startY: number; originX: number; originY: number } | null

export default function DesignerPage() {
  const { databaseId = '' } = useParams()
  const [database, setDatabase] = useState<Database | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [records, setRecords] = useState<RecordRow[]>([])
  const [layout, setLayout] = useState<Layout | null>(null)
  const [elements, setElements] = useState<LayoutElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewRecordId, setPreviewRecordId] = useState<string>('')
  const dragRef = useRef<DragState>(null)

  const load = async () => {
    const [db, f, r, l] = await Promise.all([getDatabase(databaseId), getFields(databaseId), getRecords(databaseId), getOrCreateLayout(databaseId)])
    setDatabase(db); setFields(f); setRecords(r); setLayout(l); setPreviewRecordId((current) => current || r[0]?.id || '')
    setElements(await getLayoutElements(l.id))
  }
  useEffect(() => { load().catch((e) => alert(e.message)) }, [databaseId])

  const selected = elements.find((e) => e.id === selectedId) || null
  const previewRecord = records.find((r) => r.id === previewRecordId) || records[0] || null

  const resolveContent = (element: LayoutElement) => {
    if (element.type === 'text') return String(element.props.text || 'Text')
    if (element.type === 'shape') return ''
    if (element.props.source === 'title') return previewRecord?.title || 'Record title'
    const field = fields.find((f) => f.id === element.binding_field_id)
    return previewRecord && field ? displayValue(previewRecord.data[field.id], field) || field.name : field?.name || 'Choose a field'
  }

  const addElement = async (type: LayoutElement['type']) => {
    if (!layout) return
    const defaultField = fields.find((f) => !(f.position === 0 && f.name === 'Name'))
    const element = await createLayoutElement(layout.id, {
      type,
      binding_field_id: type === 'field' ? defaultField?.id || null : null,
      x: 80 + elements.length * 10,
      y: 80 + elements.length * 10,
      width: type === 'shape' ? 240 : 320,
      height: type === 'shape' ? 140 : 70,
      rotation: 0,
      z_index: elements.length + 1,
      props: type === 'text'
        ? { text: 'Double-click the inspector to change me', fontSize: 28, fontWeight: 600, color: '#211f1b', align: 'left' }
        : type === 'shape'
          ? { fill: '#ddd3c2', radius: 18, opacity: 1 }
          : { source: defaultField ? 'field' : 'title', fontSize: 24, fontWeight: 600, color: '#211f1b', align: 'left', imageMode: false },
    })
    setElements((current) => [...current, element]); setSelectedId(element.id)
  }

  const patchElement = async (patch: Partial<LayoutElement>) => {
    if (!selected) return
    const next = { ...selected, ...patch }
    setElements((current) => current.map((e) => e.id === selected.id ? next : e))
    const { id, layout_id: _layoutId, ...dbPatch } = patch as Partial<LayoutElement> & { id?: string; layout_id?: string }
    void id; void _layoutId
    await updateLayoutElement(selected.id, dbPatch)
  }

  const patchProps = async (props: Record<string, unknown>) => {
    if (!selected) return
    await patchElement({ props: { ...selected.props, ...props } })
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>, element: LayoutElement) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id: element.id, startX: event.clientX, startY: event.clientY, originX: element.x, originY: element.y }
    setSelectedId(element.id)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const x = Math.max(0, Math.round(drag.originX + event.clientX - drag.startX))
    const y = Math.max(0, Math.round(drag.originY + event.clientY - drag.startY))
    setElements((current) => current.map((e) => e.id === drag.id ? { ...e, x, y } : e))
  }

  const onPointerUp = async () => {
    const drag = dragRef.current
    if (!drag) return
    const element = elements.find((e) => e.id === drag.id)
    dragRef.current = null
    if (element) await updateLayoutElement(element.id, { x: element.x, y: element.y })
  }

  const removeSelected = async () => {
    if (!selected) return
    await deleteLayoutElement(selected.id)
    setElements((current) => current.filter((e) => e.id !== selected.id)); setSelectedId(null)
  }

  const fieldForSelected = selected?.binding_field_id ? fields.find((f) => f.id === selected.binding_field_id) : undefined
  const renderAsImage = selected?.type === 'field' && fieldForSelected?.type === 'image' && Boolean(selected.props.imageMode)
  const selectedValue = selected ? resolveContent(selected) : ''

  const sortedElements = useMemo(() => [...elements].sort((a, b) => a.z_index - b.z_index), [elements])

  if (!layout) return <div className="page-wrap"><p>Loading designer…</p></div>

  return (
    <div className="designer-page">
      <header className="designer-topbar">
        <Link to={`/database/${databaseId}`} className="back-link"><ArrowLeft size={17} /> {database?.name || 'Database'}</Link>
        <div className="designer-tools"><button onClick={() => addElement('text')}><Type size={16} /> Text</button><button onClick={() => addElement('field')}><Plus size={16} /> Field</button><button onClick={() => addElement('shape')}><Square size={16} /> Shape</button></div>
        <label className="preview-select">Preview <select value={previewRecordId} onChange={(e) => setPreviewRecordId(e.target.value)}><option value="">Sample</option>{records.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
      </header>

      <div className="designer-body">
        <aside className="designer-panel left-panel">
          <p className="panel-label">CANVAS</p>
          <label>Background<input type="color" value={layout.background} onChange={async (e) => { const background = e.target.value; setLayout({ ...layout, background }); await updateLayout(layout.id, { background }) }} /></label>
          <div className="two-cols"><label>Width<input type="number" min="320" value={layout.canvas_width} onChange={async (e) => { const canvas_width = Number(e.target.value); setLayout({ ...layout, canvas_width }); await updateLayout(layout.id, { canvas_width }) }} /></label><label>Height<input type="number" min="240" value={layout.canvas_height} onChange={async (e) => { const canvas_height = Number(e.target.value); setLayout({ ...layout, canvas_height }); await updateLayout(layout.id, { canvas_height }) }} /></label></div>
          <p className="panel-note">Drag elements directly on the canvas. Positions and styles are saved to Supabase.</p>
          <p className="panel-label gap-top">LAYERS</p>
          <div className="layer-list">{[...sortedElements].reverse().map((e) => <button className={selectedId === e.id ? 'active' : ''} onClick={() => setSelectedId(e.id)} key={e.id}><span>{e.type === 'text' ? <Type size={14} /> : e.type === 'shape' ? <Square size={14} /> : <Image size={14} />}</span>{e.type === 'field' ? (e.props.source === 'title' ? 'Title' : fields.find((f) => f.id === e.binding_field_id)?.name || 'Field') : e.type === 'text' ? String(e.props.text || 'Text').slice(0, 22) : 'Shape'}</button>)}</div>
        </aside>

        <section className="canvas-stage" onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null) }}>
          <div className="design-canvas" style={{ width: layout.canvas_width, height: layout.canvas_height, background: layout.background }}>
            {sortedElements.map((element) => {
              const field = element.binding_field_id ? fields.find((f) => f.id === element.binding_field_id) : undefined
              const imageMode = element.type === 'field' && field?.type === 'image' && Boolean(element.props.imageMode)
              const style = { left: element.x, top: element.y, width: element.width, height: element.height, transform: `rotate(${element.rotation}deg)`, zIndex: element.z_index }
              if (element.type === 'shape') return <div key={element.id} className={`canvas-element shape-element ${selectedId === element.id ? 'selected' : ''}`} style={{ ...style, background: String(element.props.fill || '#ddd3c2'), borderRadius: Number(element.props.radius || 0), opacity: Number(element.props.opacity ?? 1) }} onPointerDown={(e) => onPointerDown(e, element)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
              const content = resolveContent(element)
              return <div key={element.id} className={`canvas-element text-element ${selectedId === element.id ? 'selected' : ''}`} style={{ ...style, fontSize: Number(element.props.fontSize || 24), fontWeight: Number(element.props.fontWeight || 400), color: String(element.props.color || '#211f1b'), textAlign: String(element.props.align || 'left') as 'left' | 'center' | 'right' }} onPointerDown={(e) => onPointerDown(e, element)} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>{imageMode && content ? <img src={content} alt={field?.name || 'Bound image'} draggable={false} /> : content}</div>
            })}
            {!elements.length && <div className="canvas-empty"><strong>Your canvas is empty.</strong><span>Add text, a bound field, or a shape from the toolbar.</span></div>}
          </div>
        </section>

        <aside className="designer-panel right-panel">
          <p className="panel-label">INSPECTOR</p>
          {!selected ? <p className="panel-note">Select an element to change its content, data binding, position, and appearance.</p> : <>
            <div className="two-cols"><label>X<input type="number" value={selected.x} onChange={(e) => patchElement({ x: Number(e.target.value) })} /></label><label>Y<input type="number" value={selected.y} onChange={(e) => patchElement({ y: Number(e.target.value) })} /></label><label>Width<input type="number" value={selected.width} onChange={(e) => patchElement({ width: Math.max(20, Number(e.target.value)) })} /></label><label>Height<input type="number" value={selected.height} onChange={(e) => patchElement({ height: Math.max(20, Number(e.target.value)) })} /></label></div>
            {selected.type === 'text' && <label>Text<textarea rows={4} value={String(selected.props.text || '')} onChange={(e) => patchProps({ text: e.target.value })} /></label>}
            {selected.type === 'field' && <><label>Data source<select value={selected.props.source === 'title' ? '__title' : selected.binding_field_id || ''} onChange={(e) => e.target.value === '__title' ? patchElement({ binding_field_id: null, props: { ...selected.props, source: 'title' } }) : patchElement({ binding_field_id: e.target.value, props: { ...selected.props, source: 'field' } })}><option value="__title">Record title</option>{fields.filter((f) => !(f.position === 0 && f.name === 'Name')).map((f) => <option value={f.id} key={f.id}>{f.name}</option>)}</select></label>{fieldForSelected?.type === 'image' && <label className="checkbox-row"><input type="checkbox" checked={Boolean(selected.props.imageMode)} onChange={(e) => patchProps({ imageMode: e.target.checked })} /> Render as image</label>}</>}
            {selected.type !== 'shape' && <><div className="two-cols"><label>Font size<input type="number" min="8" max="160" value={Number(selected.props.fontSize || 24)} onChange={(e) => patchProps({ fontSize: Number(e.target.value) })} /></label><label>Weight<select value={Number(selected.props.fontWeight || 400)} onChange={(e) => patchProps({ fontWeight: Number(e.target.value) })}><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option></select></label></div><label>Text color<input type="color" value={String(selected.props.color || '#211f1b')} onChange={(e) => patchProps({ color: e.target.value })} /></label><label>Alignment<select value={String(selected.props.align || 'left')} onChange={(e) => patchProps({ align: e.target.value })}><option>left</option><option>center</option><option>right</option></select></label></>}
            {selected.type === 'shape' && <><label>Fill<input type="color" value={String(selected.props.fill || '#ddd3c2')} onChange={(e) => patchProps({ fill: e.target.value })} /></label><label>Corner radius<input type="range" min="0" max="80" value={Number(selected.props.radius || 0)} onChange={(e) => patchProps({ radius: Number(e.target.value) })} /></label><label>Opacity<input type="range" min="0.1" max="1" step="0.05" value={Number(selected.props.opacity ?? 1)} onChange={(e) => patchProps({ opacity: Number(e.target.value) })} /></label></>}
            <label>Rotation<input type="range" min="-180" max="180" value={selected.rotation} onChange={(e) => patchElement({ rotation: Number(e.target.value) })} /></label>
            <button className="danger-button" onClick={removeSelected}><Trash2 size={16} /> Delete element</button>
            {selected.type === 'field' && <div className="binding-preview"><span>Current preview</span><strong>{renderAsImage ? 'Image bound' : selectedValue || 'Empty'}</strong></div>}
          </>}
        </aside>
      </div>
    </div>
  )
}
