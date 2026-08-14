import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Copy, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, RefreshCw, Square, Trash2, Type } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  createLayoutElement,
  deleteLayoutElement,
  getDatabase,
  getFields,
  getLayoutElements,
  getOrCreateSurfaceLayout,
  getRecords,
  updateLayout,
  updateLayoutElement,
} from '../lib/data'
import { displayValue } from '../lib/value'
import type { Database, Field, Layout, LayoutElement, LayoutSurface, RecordRow } from '../types'

type Interaction =
  | { mode: 'drag'; id: string; startX: number; startY: number; x: number; y: number }
  | { mode: 'resize'; id: string; startX: number; startY: number; width: number; height: number }
  | null

const labels: Record<LayoutSurface, string> = { record: 'Record page', gallery: 'Gallery card', board: 'Board card' }

export default function SurfaceDesignerPage() {
  const { databaseId = '', surface: rawSurface = 'record' } = useParams()
  const [search] = useSearchParams()
  const recordId = search.get('recordId')
  const surface: LayoutSurface = rawSurface === 'gallery' || rawSurface === 'board' ? rawSurface : 'record'
  const [database, setDatabase] = useState<Database | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [records, setRecords] = useState<RecordRow[]>([])
  const [layout, setLayout] = useState<Layout | null>(null)
  const [elements, setElements] = useState<LayoutElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState(recordId || '')
  const [leftOpen, setLeftOpen] = useState(() => localStorage.getItem('atlas:designer-left-open') !== 'false')
  const [rightOpen, setRightOpen] = useState(() => localStorage.getItem('atlas:designer-right-open') !== 'false')
  const interaction = useRef<Interaction>(null)

  const load = async () => {
    const [db, f, r, l] = await Promise.all([
      getDatabase(databaseId), getFields(databaseId), getRecords(databaseId), getOrCreateSurfaceLayout(databaseId, surface, recordId),
    ])
    setDatabase(db)
    setFields(f)
    setRecords(r)
    setLayout(l)
    setPreviewId((v) => v || recordId || r[0]?.id || '')
    setElements(await getLayoutElements(l.id))
  }

  const refreshProperties = async () => setFields(await getFields(databaseId))

  useEffect(() => { load().catch((e) => alert(e instanceof Error ? e.message : String(e))) }, [databaseId, surface, recordId])
  useEffect(() => { localStorage.setItem('atlas:designer-left-open', String(leftOpen)) }, [leftOpen])
  useEffect(() => { localStorage.setItem('atlas:designer-right-open', String(rightOpen)) }, [rightOpen])

  const selected = elements.find((item) => item.id === selectedId) || null
  const preview = records.find((item) => item.id === previewId) || records[0] || null
  const sorted = useMemo(() => [...elements].sort((a, b) => a.z_index - b.z_index), [elements])
  const designFields = fields.filter((field) => !(field.position === 0 && field.name === 'Name'))

  const resolve = (element: LayoutElement) => {
    if (element.type === 'text') return String(element.props.text || '')
    if (element.type === 'shape') return ''
    if (element.props.source === 'title') return preview?.title || 'Untitled'
    const field = fields.find((candidate) => candidate.id === element.binding_field_id)
    return field && preview ? displayValue(preview.data[field.id], field) : field?.name || 'Property'
  }

  const createElement = async (type: LayoutElement['type'], field?: Field | 'title') => {
    if (!layout) return
    const boundField = typeof field === 'object' ? field : undefined
    const sourceTitle = field === 'title'
    const item = await createLayoutElement(layout.id, {
      type,
      binding_field_id: type === 'field' ? boundField?.id || null : null,
      x: 50 + elements.length * 12,
      y: 50 + elements.length * 12,
      width: type === 'shape' ? 220 : boundField?.type === 'image' ? 240 : 280,
      height: type === 'shape' ? 120 : boundField?.type === 'image' ? 280 : 64,
      rotation: 0,
      z_index: elements.length ? Math.max(...elements.map((x) => x.z_index)) + 1 : 1,
      props: type === 'shape'
        ? { fill: '#ddd3c2', radius: 18, opacity: 1 }
        : type === 'text'
          ? { text: 'Add your text', fontSize: 28, fontWeight: 600, color: '#211f1b', align: 'left', fontFamily: 'Georgia, serif', opacity: 1 }
          : { source: sourceTitle ? 'title' : 'field', fontSize: 24, fontWeight: 600, color: '#211f1b', align: 'left', fontFamily: 'inherit', opacity: 1, imageMode: boundField?.type === 'image' },
    })
    setElements((current) => [...current, item])
    setSelectedId(item.id)
  }

  const patch = async (patchValue: Partial<LayoutElement>) => {
    if (!selected) return
    setElements((current) => current.map((item) => item.id === selected.id ? { ...item, ...patchValue } : item))
    const { id: _id, layout_id: _layout, ...dbPatch } = patchValue as Partial<LayoutElement> & { id?: string; layout_id?: string }
    void _id
    void _layout
    await updateLayoutElement(selected.id, dbPatch)
  }

  const patchProps = (value: Record<string, unknown>) => selected ? patch({ props: { ...selected.props, ...value } }) : Promise.resolve()

  const duplicate = async () => {
    if (!layout || !selected) return
    const { id: _id, layout_id: _layout, ...copy } = selected
    void _id
    void _layout
    const created = await createLayoutElement(layout.id, { ...copy, x: copy.x + 18, y: copy.y + 18, z_index: Math.max(0, ...elements.map((x) => x.z_index)) + 1 })
    setElements((current) => [...current, created])
    setSelectedId(created.id)
  }

  const remove = async () => {
    if (!selected) return
    await deleteLayoutElement(selected.id)
    setElements((current) => current.filter((item) => item.id !== selected.id))
    setSelectedId(null)
  }

  const dragStart = (event: PointerEvent<HTMLDivElement>, element: LayoutElement) => {
    if ((event.target as HTMLElement).classList.contains('resize-handle')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    interaction.current = { mode: 'drag', id: element.id, startX: event.clientX, startY: event.clientY, x: element.x, y: element.y }
    setSelectedId(element.id)
  }

  const resizeStart = (event: PointerEvent<HTMLDivElement>, element: LayoutElement) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    interaction.current = { mode: 'resize', id: element.id, startX: event.clientX, startY: event.clientY, width: element.width, height: element.height }
    setSelectedId(element.id)
  }

  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = interaction.current
    if (!state) return
    if (state.mode === 'drag') {
      const x = Math.max(0, Math.round(state.x + event.clientX - state.startX))
      const y = Math.max(0, Math.round(state.y + event.clientY - state.startY))
      setElements((current) => current.map((item) => item.id === state.id ? { ...item, x, y } : item))
    } else {
      const width = Math.max(30, Math.round(state.width + event.clientX - state.startX))
      const height = Math.max(30, Math.round(state.height + event.clientY - state.startY))
      setElements((current) => current.map((item) => item.id === state.id ? { ...item, width, height } : item))
    }
  }

  const pointerUp = async () => {
    const state = interaction.current
    if (!state) return
    interaction.current = null
    const item = elements.find((x) => x.id === state.id)
    if (!item) return
    await updateLayoutElement(item.id, state.mode === 'drag' ? { x: item.x, y: item.y } : { width: item.width, height: item.height })
  }

  if (!layout) return <div className="page-wrap"><p>Loading designer…</p></div>

  return (
    <div className="surface-designer">
      <header className="surface-designer-topbar">
        <div className="designer-topbar-left">
          <Link className="back-link" to={`/database/${databaseId}/design`}><ArrowLeft size={17} /> Design system</Link>
          <button className="panel-toggle-button" onClick={() => setLeftOpen((v) => !v)} title={leftOpen ? 'Hide tools' : 'Show tools'}>{leftOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}</button>
        </div>
        <div><strong>{labels[surface]}</strong><span>{recordId ? `Custom override for ${preview?.title || 'record'}` : `Default for ${database?.name || 'database'}`}</span></div>
        <div className="designer-topbar-right">
          <label>Preview<select value={previewId} disabled={Boolean(recordId)} onChange={(e) => setPreviewId(e.target.value)}>{records.map((record) => <option value={record.id} key={record.id}>{record.title}</option>)}</select></label>
          <button className="panel-toggle-button" onClick={() => setRightOpen((v) => !v)} title={rightOpen ? 'Hide inspector' : 'Show inspector'}>{rightOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}</button>
        </div>
      </header>

      <div className={`surface-designer-body ${!leftOpen ? 'left-panel-closed' : ''} ${!rightOpen ? 'right-panel-closed' : ''}`}>
        {leftOpen && <aside className="surface-tools">
          <p className="panel-label">ADD</p>
          <button onClick={() => createElement('text')}><Type size={16} /> Free text</button>
          <button onClick={() => createElement('shape')}><Square size={16} /> Shape</button>

          <div className="property-library-heading">
            <p className="panel-label">DATABASE PROPERTIES</p>
            <button className="property-refresh" onClick={() => refreshProperties().catch((e) => alert(e instanceof Error ? e.message : String(e)))} title="Refresh properties"><RefreshCw size={14} /></button>
          </div>
          <p className="panel-note property-help">These are live fields from {database?.name || 'this database'}. Click one to place it on the design.</p>
          <div className="property-library">
            <button onClick={() => createElement('field', 'title')}><span>Record title</span><small>title</small></button>
            {designFields.map((field) => <button key={field.id} onClick={() => createElement('field', field)}><span>{field.name}</span><small>{field.type.replace('_', ' ')}</small></button>)}
            {!designFields.length && <p className="panel-note">Add properties from the database page, then refresh here.</p>}
          </div>

          <p className="panel-label gap-top">CANVAS</p>
          <label>Background<input type="color" value={layout.background} onChange={async (e) => { const background = e.target.value; setLayout({ ...layout, background }); await updateLayout(layout.id, { background }) }} /></label>
          <div className="two-cols"><label>Width<input type="number" value={layout.canvas_width} onChange={async (e) => { const canvas_width = Number(e.target.value); setLayout({ ...layout, canvas_width }); await updateLayout(layout.id, { canvas_width }) }} /></label><label>Height<input type="number" value={layout.canvas_height} onChange={async (e) => { const canvas_height = Number(e.target.value); setLayout({ ...layout, canvas_height }); await updateLayout(layout.id, { canvas_height }) }} /></label></div>
          <p className="panel-label gap-top">LAYERS</p>
          <div className="layer-list">{[...sorted].reverse().map((item) => <button className={selectedId === item.id ? 'active' : ''} key={item.id} onClick={() => setSelectedId(item.id)}>{item.type === 'field' ? (item.props.source === 'title' ? 'Record title' : fields.find((f) => f.id === item.binding_field_id)?.name || 'Missing property') : item.type === 'text' ? String(item.props.text || 'Text').slice(0, 20) : 'Shape'}</button>)}</div>
        </aside>}

        <main className="surface-canvas-stage" onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null) }}>
          <div className="design-canvas show-grid" style={{ width: layout.canvas_width, height: layout.canvas_height, backgroundColor: layout.background }}>
            {sorted.map((item) => {
              const field = item.binding_field_id ? fields.find((f) => f.id === item.binding_field_id) : undefined
              const imageMode = item.type === 'field' && field?.type === 'image' && Boolean(item.props.imageMode)
              const content = resolve(item)
              const selectedNow = selectedId === item.id
              const common = { left: item.x, top: item.y, width: item.width, height: item.height, transform: `rotate(${item.rotation}deg)`, zIndex: item.z_index }
              if (item.type === 'shape') return <div key={item.id} className={`canvas-element shape-element ${selectedNow ? 'selected' : ''}`} style={{ ...common, background: String(item.props.fill || '#ddd3c2'), borderRadius: Number(item.props.radius || 0), opacity: Number(item.props.opacity ?? 1) }} onPointerDown={(e) => dragStart(e, item)} onPointerMove={pointerMove} onPointerUp={pointerUp}>{selectedNow && <div className="resize-handle" onPointerDown={(e) => resizeStart(e, item)} onPointerMove={pointerMove} onPointerUp={pointerUp} />}</div>
              return <div key={item.id} className={`canvas-element text-element ${selectedNow ? 'selected' : ''}`} style={{ ...common, fontSize: Number(item.props.fontSize || 24), fontWeight: Number(item.props.fontWeight || 400), color: String(item.props.color || '#211f1b'), textAlign: String(item.props.align || 'left') as 'left' | 'center' | 'right', fontFamily: String(item.props.fontFamily || 'inherit'), opacity: Number(item.props.opacity ?? 1) }} onPointerDown={(e) => dragStart(e, item)} onPointerMove={pointerMove} onPointerUp={pointerUp}>{imageMode && content ? <img src={content} alt={field?.name || ''} draggable={false} /> : content}{selectedNow && <div className="resize-handle" onPointerDown={(e) => resizeStart(e, item)} onPointerMove={pointerMove} onPointerUp={pointerUp} />}</div>
            })}
          </div>
        </main>

        {rightOpen && <aside className="surface-inspector">
          <p className="panel-label">INSPECTOR</p>
          {!selected ? <p className="panel-note">Select a layer to change what it shows and how it looks.</p> : <>
            <div className="inspector-actions"><button onClick={duplicate}><Copy size={15} /> Duplicate</button><button onClick={remove}><Trash2 size={15} /> Delete</button></div>
            <div className="two-cols"><label>X<input type="number" value={selected.x} onChange={(e) => patch({ x: Number(e.target.value) })} /></label><label>Y<input type="number" value={selected.y} onChange={(e) => patch({ y: Number(e.target.value) })} /></label><label>Width<input type="number" value={selected.width} onChange={(e) => patch({ width: Number(e.target.value) })} /></label><label>Height<input type="number" value={selected.height} onChange={(e) => patch({ height: Number(e.target.value) })} /></label></div>
            {selected.type === 'text' && <label>Text<textarea rows={4} value={String(selected.props.text || '')} onChange={(e) => patchProps({ text: e.target.value })} /></label>}
            {selected.type === 'field' && <label>Property<select value={selected.props.source === 'title' ? '__title' : selected.binding_field_id || ''} onChange={(e) => e.target.value === '__title' ? patch({ binding_field_id: null, props: { ...selected.props, source: 'title', imageMode: false } }) : (() => { const field = fields.find((f) => f.id === e.target.value); return patch({ binding_field_id: e.target.value, props: { ...selected.props, source: 'field', imageMode: field?.type === 'image' } }) })()}><option value="__title">Record title</option>{designFields.map((f) => <option value={f.id} key={f.id}>{f.name} · {f.type.replace('_', ' ')}</option>)}</select></label>}
            {selected.type !== 'shape' && <><div className="two-cols"><label>Font size<input type="number" value={Number(selected.props.fontSize || 24)} onChange={(e) => patchProps({ fontSize: Number(e.target.value) })} /></label><label>Weight<select value={Number(selected.props.fontWeight || 400)} onChange={(e) => patchProps({ fontWeight: Number(e.target.value) })}><option value="300">Light</option><option value="400">Regular</option><option value="600">Semibold</option><option value="700">Bold</option></select></label></div><label>Color<input type="color" value={String(selected.props.color || '#211f1b')} onChange={(e) => patchProps({ color: e.target.value })} /></label>{selected.type === 'field' && fields.find((f) => f.id === selected.binding_field_id)?.type === 'image' && <label className="checkbox-row"><input type="checkbox" checked={Boolean(selected.props.imageMode)} onChange={(e) => patchProps({ imageMode: e.target.checked })} /> Render as image</label>}</>}
            {selected.type === 'shape' && <><label>Fill<input type="color" value={String(selected.props.fill || '#ddd3c2')} onChange={(e) => patchProps({ fill: e.target.value })} /></label><label>Corner radius<input type="range" min="0" max="80" value={Number(selected.props.radius || 0)} onChange={(e) => patchProps({ radius: Number(e.target.value) })} /></label></>}
            <label>Rotation<input type="range" min="-180" max="180" value={selected.rotation} onChange={(e) => patch({ rotation: Number(e.target.value) })} /></label>
          </>}
        </aside>}
      </div>
    </div>
  )
}
