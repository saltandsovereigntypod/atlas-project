import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Grid3X3, Image, Plus, Square, Trash2, Type } from 'lucide-react'
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

type InteractionState =
  | { mode: 'drag'; id: string; startX: number; startY: number; originX: number; originY: number }
  | { mode: 'resize'; id: string; startX: number; startY: number; originWidth: number; originHeight: number }
  | null

const snap = (value: number, enabled: boolean) => enabled ? Math.round(value / 10) * 10 : Math.round(value)

export default function DesignerPage() {
  const { databaseId = '' } = useParams()
  const [database, setDatabase] = useState<Database | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [records, setRecords] = useState<RecordRow[]>([])
  const [layout, setLayout] = useState<Layout | null>(null)
  const [elements, setElements] = useState<LayoutElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewRecordId, setPreviewRecordId] = useState<string>('')
  const [showGrid, setShowGrid] = useState(true)
  const interactionRef = useRef<InteractionState>(null)

  const load = async () => {
    const [db, f, r, l] = await Promise.all([getDatabase(databaseId), getFields(databaseId), getRecords(databaseId), getOrCreateLayout(databaseId)])
    setDatabase(db)
    setFields(f)
    setRecords(r)
    setLayout(l)
    setPreviewRecordId((current) => current || r[0]?.id || '')
    setElements(await getLayoutElements(l.id))
  }

  useEffect(() => { load().catch((e) => alert(e.message)) }, [databaseId])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selectedId) return
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        void removeElement(selectedId)
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        void duplicateElement(selectedId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, elements, layout])

  const selected = elements.find((element) => element.id === selectedId) || null
  const previewRecord = records.find((record) => record.id === previewRecordId) || records[0] || null

  const resolveContent = (element: LayoutElement) => {
    if (element.type === 'text') return String(element.props.text || 'Text')
    if (element.type === 'shape') return ''
    if (element.props.source === 'title') return previewRecord?.title || 'Record title'
    const field = fields.find((candidate) => candidate.id === element.binding_field_id)
    return previewRecord && field ? displayValue(previewRecord.data[field.id], field) || field.name : field?.name || 'Choose a property'
  }

  const addElement = async (type: LayoutElement['type']) => {
    if (!layout) return
    const defaultField = fields.find((field) => !(field.position === 0 && field.name === 'Name'))
    const element = await createLayoutElement(layout.id, {
      type,
      binding_field_id: type === 'field' ? defaultField?.id || null : null,
      x: 80 + elements.length * 10,
      y: 80 + elements.length * 10,
      width: type === 'shape' ? 240 : 320,
      height: type === 'shape' ? 140 : 70,
      rotation: 0,
      z_index: elements.length ? Math.max(...elements.map((item) => item.z_index)) + 1 : 1,
      props: type === 'text'
        ? { text: 'Add your text', fontSize: 28, fontWeight: 600, color: '#211f1b', align: 'left', fontFamily: 'Georgia, serif', lineHeight: 1.2, opacity: 1 }
        : type === 'shape'
          ? { fill: '#ddd3c2', radius: 18, opacity: 1, borderWidth: 0, borderColor: '#75624c' }
          : { source: defaultField ? 'field' : 'title', fontSize: 24, fontWeight: 600, color: '#211f1b', align: 'left', fontFamily: 'inherit', lineHeight: 1.2, opacity: 1, imageMode: false },
    })
    setElements((current) => [...current, element])
    setSelectedId(element.id)
  }

  const patchElementById = async (id: string, patch: Partial<LayoutElement>) => {
    setElements((current) => current.map((element) => element.id === id ? { ...element, ...patch } : element))
    const { id: _id, layout_id: _layoutId, ...dbPatch } = patch as Partial<LayoutElement> & { id?: string; layout_id?: string }
    void _id
    void _layoutId
    await updateLayoutElement(id, dbPatch)
  }

  const patchElement = async (patch: Partial<LayoutElement>) => {
    if (!selected) return
    await patchElementById(selected.id, patch)
  }

  const patchProps = async (props: Record<string, unknown>) => {
    if (!selected) return
    await patchElement({ props: { ...selected.props, ...props } })
  }

  const duplicateElement = async (id: string) => {
    if (!layout) return
    const source = elements.find((element) => element.id === id)
    if (!source) return
    const copy = await createLayoutElement(layout.id, {
      type: source.type,
      binding_field_id: source.binding_field_id,
      x: source.x + 20,
      y: source.y + 20,
      width: source.width,
      height: source.height,
      rotation: source.rotation,
      z_index: elements.length ? Math.max(...elements.map((item) => item.z_index)) + 1 : 1,
      props: { ...source.props },
    })
    setElements((current) => [...current, copy])
    setSelectedId(copy.id)
  }

  const removeElement = async (id: string) => {
    await deleteLayoutElement(id)
    setElements((current) => current.filter((element) => element.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const moveLayer = async (id: string, direction: 1 | -1) => {
    const ordered = [...elements].sort((a, b) => a.z_index - b.z_index)
    const index = ordered.findIndex((element) => element.id === id)
    const swapIndex = index + direction
    if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return
    const current = ordered[index]
    const other = ordered[swapIndex]
    const currentZ = current.z_index
    const otherZ = other.z_index
    setElements((items) => items.map((item) => item.id === current.id ? { ...item, z_index: otherZ } : item.id === other.id ? { ...item, z_index: currentZ } : item))
    await Promise.all([updateLayoutElement(current.id, { z_index: otherZ }), updateLayoutElement(other.id, { z_index: currentZ })])
  }

  const onDragStart = (event: PointerEvent<HTMLDivElement>, element: LayoutElement) => {
    if ((event.target as HTMLElement).classList.contains('resize-handle')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    interactionRef.current = { mode: 'drag', id: element.id, startX: event.clientX, startY: event.clientY, originX: element.x, originY: element.y }
    setSelectedId(element.id)
  }

  const onResizeStart = (event: PointerEvent<HTMLDivElement>, element: LayoutElement) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    interactionRef.current = { mode: 'resize', id: element.id, startX: event.clientX, startY: event.clientY, originWidth: element.width, originHeight: element.height }
    setSelectedId(element.id)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = interactionRef.current
    if (!state) return
    if (state.mode === 'drag') {
      const x = Math.max(0, snap(state.originX + event.clientX - state.startX, showGrid))
      const y = Math.max(0, snap(state.originY + event.clientY - state.startY, showGrid))
      setElements((current) => current.map((element) => element.id === state.id ? { ...element, x, y } : element))
    } else {
      const width = Math.max(30, snap(state.originWidth + event.clientX - state.startX, showGrid))
      const height = Math.max(30, snap(state.originHeight + event.clientY - state.startY, showGrid))
      setElements((current) => current.map((element) => element.id === state.id ? { ...element, width, height } : element))
    }
  }

  const onPointerUp = async () => {
    const state = interactionRef.current
    if (!state) return
    interactionRef.current = null
    const element = elements.find((item) => item.id === state.id)
    if (!element) return
    if (state.mode === 'drag') await updateLayoutElement(element.id, { x: element.x, y: element.y })
    else await updateLayoutElement(element.id, { width: element.width, height: element.height })
  }

  const fieldForSelected = selected?.binding_field_id ? fields.find((field) => field.id === selected.binding_field_id) : undefined
  const renderAsImage = selected?.type === 'field' && fieldForSelected?.type === 'image' && Boolean(selected.props.imageMode)
  const selectedValue = selected ? resolveContent(selected) : ''
  const sortedElements = useMemo(() => [...elements].sort((a, b) => a.z_index - b.z_index), [elements])

  if (!layout) return <div className="page-wrap"><p>Loading designer…</p></div>

  return (
    <div className="designer-page">
      <header className="designer-topbar">
        <Link to={`/database/${databaseId}`} className="back-link"><ArrowLeft size={17} /> {database?.name || 'Database'}</Link>
        <div className="designer-tools"><button onClick={() => addElement('text')}><Type size={16} /> Text</button><button onClick={() => addElement('field')}><Plus size={16} /> Property</button><button onClick={() => addElement('shape')}><Square size={16} /> Shape</button></div>
        <div className="designer-action-group"><button onClick={() => setShowGrid((value) => !value)}><Grid3X3 size={15} /> {showGrid ? 'Snap on' : 'Snap off'}</button>{selected && <button onClick={() => duplicateElement(selected.id)}><Copy size={15} /> Duplicate</button>}</div>
        <label className="preview-select">Preview <select value={previewRecordId} onChange={(e) => setPreviewRecordId(e.target.value)}><option value="">Sample</option>{records.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
      </header>

      <div className="designer-body">
        <aside className="designer-panel left-panel">
          <p className="panel-label">CANVAS</p>
          <label>Background<input type="color" value={layout.background} onChange={async (e) => { const background = e.target.value; setLayout({ ...layout, background }); await updateLayout(layout.id, { background }) }} /></label>
          <div className="two-cols"><label>Width<input type="number" min="320" value={layout.canvas_width} onChange={async (e) => { const canvas_width = Number(e.target.value); setLayout({ ...layout, canvas_width }); await updateLayout(layout.id, { canvas_width }) }} /></label><label>Height<input type="number" min="240" value={layout.canvas_height} onChange={async (e) => { const canvas_height = Number(e.target.value); setLayout({ ...layout, canvas_height }); await updateLayout(layout.id, { canvas_height }) }} /></label></div>
          <p className="panel-note">Drag to position. Use the corner handle to resize. Cmd/Ctrl+D duplicates the selected layer, Delete removes it.</p>
          <p className="panel-label gap-top">LAYERS</p>
          <div className="layer-list">{[...sortedElements].reverse().map((element) => <div className="layer-row" key={element.id}><button className={selectedId === element.id ? 'active' : ''} onClick={() => setSelectedId(element.id)}><span>{element.type === 'text' ? <Type size={14} /> : element.type === 'shape' ? <Square size={14} /> : <Image size={14} />}</span>{element.type === 'field' ? (element.props.source === 'title' ? 'Title' : fields.find((field) => field.id === element.binding_field_id)?.name || 'Property') : element.type === 'text' ? String(element.props.text || 'Text').slice(0, 20) : 'Shape'}</button><div className="layer-controls"><button title="Bring forward" onClick={() => moveLayer(element.id, 1)}><ChevronUp size={13} /></button><button title="Send backward" onClick={() => moveLayer(element.id, -1)}><ChevronDown size={13} /></button></div></div>)}</div>
        </aside>

        <section className="canvas-stage" onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null) }}>
          <div className={`design-canvas ${showGrid ? 'show-grid' : ''}`} style={{ width: layout.canvas_width, height: layout.canvas_height, backgroundColor: layout.background }}>
            {sortedElements.map((element) => {
              const field = element.binding_field_id ? fields.find((candidate) => candidate.id === element.binding_field_id) : undefined
              const imageMode = element.type === 'field' && field?.type === 'image' && Boolean(element.props.imageMode)
              const style = { left: element.x, top: element.y, width: element.width, height: element.height, transform: `rotate(${element.rotation}deg)`, zIndex: element.z_index }
              const selection = selectedId === element.id
              const handle = selection ? <div className="resize-handle" onPointerDown={(event) => onResizeStart(event, element)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} /> : null

              if (element.type === 'shape') return <div key={element.id} className={`canvas-element shape-element ${selection ? 'selected' : ''}`} style={{ ...style, background: String(element.props.fill || '#ddd3c2'), borderRadius: Number(element.props.radius || 0), opacity: Number(element.props.opacity ?? 1), border: Number(element.props.borderWidth || 0) > 0 ? `${Number(element.props.borderWidth)}px solid ${String(element.props.borderColor || '#75624c')}` : undefined }} onPointerDown={(e) => onDragStart(e, element)} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>{handle}</div>
              const content = resolveContent(element)
              return <div key={element.id} className={`canvas-element text-element ${selection ? 'selected' : ''}`} style={{ ...style, fontSize: Number(element.props.fontSize || 24), fontWeight: Number(element.props.fontWeight || 400), color: String(element.props.color || '#211f1b'), textAlign: String(element.props.align || 'left') as 'left' | 'center' | 'right', fontFamily: String(element.props.fontFamily || 'inherit'), lineHeight: Number(element.props.lineHeight || 1.2), opacity: Number(element.props.opacity ?? 1) }} onPointerDown={(e) => onDragStart(e, element)} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>{imageMode && content ? <img src={content} alt={field?.name || 'Bound image'} draggable={false} /> : content}{handle}</div>
            })}
            {!elements.length && <div className="canvas-empty"><strong>Your canvas is empty.</strong><span>Add text, a bound property, or a shape from the toolbar.</span></div>}
          </div>
        </section>

        <aside className="designer-panel right-panel">
          <p className="panel-label">INSPECTOR</p>
          {!selected ? <p className="panel-note">Select a layer to edit its data binding, size, typography, position, rotation, and appearance.</p> : <>
            <div className="inspector-section"><p className="inspector-section-title">LAYOUT</p><div className="two-cols"><label>X<input type="number" value={selected.x} onChange={(e) => patchElement({ x: Number(e.target.value) })} /></label><label>Y<input type="number" value={selected.y} onChange={(e) => patchElement({ y: Number(e.target.value) })} /></label><label>Width<input type="number" value={selected.width} onChange={(e) => patchElement({ width: Math.max(20, Number(e.target.value)) })} /></label><label>Height<input type="number" value={selected.height} onChange={(e) => patchElement({ height: Math.max(20, Number(e.target.value)) })} /></label></div><label>Rotation<input type="range" min="-180" max="180" value={selected.rotation} onChange={(e) => patchElement({ rotation: Number(e.target.value) })} /></label></div>

            {selected.type === 'text' && <div className="inspector-section"><p className="inspector-section-title">CONTENT</p><label>Text<textarea rows={4} value={String(selected.props.text || '')} onChange={(e) => patchProps({ text: e.target.value })} /></label></div>}

            {selected.type === 'field' && <div className="inspector-section"><p className="inspector-section-title">DATA BINDING</p><label>Data source<select value={selected.props.source === 'title' ? '__title' : selected.binding_field_id || ''} onChange={(e) => e.target.value === '__title' ? patchElement({ binding_field_id: null, props: { ...selected.props, source: 'title' } }) : patchElement({ binding_field_id: e.target.value, props: { ...selected.props, source: 'field' } })}><option value="__title">Record title</option>{fields.filter((field) => !(field.position === 0 && field.name === 'Name')).map((field) => <option value={field.id} key={field.id}>{field.name}</option>)}</select></label>{fieldForSelected?.type === 'image' && <label className="checkbox-row"><input type="checkbox" checked={Boolean(selected.props.imageMode)} onChange={(e) => patchProps({ imageMode: e.target.checked })} /> Render as image</label>}<div className="binding-preview"><span>Current preview</span><strong>{renderAsImage ? 'Image bound' : selectedValue || 'Empty'}</strong></div></div>}

            {selected.type !== 'shape' && <div className="inspector-section"><p className="inspector-section-title">TYPOGRAPHY</p><label>Font family<select value={String(selected.props.fontFamily || 'inherit')} onChange={(e) => patchProps({ fontFamily: e.target.value })}><option value="inherit">App sans</option><option value="Georgia, serif">Georgia serif</option><option value="'Times New Roman', serif">Classic serif</option><option value="ui-monospace, SFMono-Regular, monospace">Monospace</option></select></label><div className="two-cols"><label>Font size<input type="number" min="8" max="160" value={Number(selected.props.fontSize || 24)} onChange={(e) => patchProps({ fontSize: Number(e.target.value) })} /></label><label>Weight<select value={Number(selected.props.fontWeight || 400)} onChange={(e) => patchProps({ fontWeight: Number(e.target.value) })}><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option></select></label><label>Line height<input type="number" min="0.8" max="3" step="0.1" value={Number(selected.props.lineHeight || 1.2)} onChange={(e) => patchProps({ lineHeight: Number(e.target.value) })} /></label><label>Opacity<input type="number" min="0.1" max="1" step="0.05" value={Number(selected.props.opacity ?? 1)} onChange={(e) => patchProps({ opacity: Number(e.target.value) })} /></label></div><label>Text color<input type="color" value={String(selected.props.color || '#211f1b')} onChange={(e) => patchProps({ color: e.target.value })} /></label><label>Alignment<select value={String(selected.props.align || 'left')} onChange={(e) => patchProps({ align: e.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></div>}

            {selected.type === 'shape' && <div className="inspector-section"><p className="inspector-section-title">APPEARANCE</p><label>Fill<input type="color" value={String(selected.props.fill || '#ddd3c2')} onChange={(e) => patchProps({ fill: e.target.value })} /></label><label>Corner radius<input type="range" min="0" max="120" value={Number(selected.props.radius || 0)} onChange={(e) => patchProps({ radius: Number(e.target.value) })} /></label><label>Opacity<input type="range" min="0.1" max="1" step="0.05" value={Number(selected.props.opacity ?? 1)} onChange={(e) => patchProps({ opacity: Number(e.target.value) })} /></label><div className="two-cols"><label>Border width<input type="number" min="0" max="20" value={Number(selected.props.borderWidth || 0)} onChange={(e) => patchProps({ borderWidth: Number(e.target.value) })} /></label><label>Border color<input type="color" value={String(selected.props.borderColor || '#75624c')} onChange={(e) => patchProps({ borderColor: e.target.value })} /></label></div></div>}

            <div className="inspector-section"><button className="secondary-button" onClick={() => duplicateElement(selected.id)}><Copy size={16} /> Duplicate layer</button><button className="danger-button" onClick={() => removeElement(selected.id)}><Trash2 size={16} /> Delete layer</button></div>
          </>}
        </aside>
      </div>
    </div>
  )
}
