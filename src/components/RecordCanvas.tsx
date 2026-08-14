import { useMemo } from 'react'
import { displayValue } from '../lib/value'
import type { Field, Layout, LayoutElement, RecordRow } from '../types'

interface RecordCanvasProps {
  layout: Layout
  elements: LayoutElement[]
  fields: Field[]
  record: RecordRow
  maxWidth?: number
  className?: string
}

export default function RecordCanvas({ layout, elements, fields, record, maxWidth = 1100, className = '' }: RecordCanvasProps) {
  const scale = Math.min(1, maxWidth / layout.canvas_width)
  const sorted = useMemo(() => [...elements].sort((a, b) => a.z_index - b.z_index), [elements])

  const resolveContent = (element: LayoutElement) => {
    if (element.type === 'text') return String(element.props.text || '')
    if (element.type === 'shape') return ''
    if (element.props.source === 'title') return record.title || 'Untitled'
    const field = fields.find((candidate) => candidate.id === element.binding_field_id)
    return field ? displayValue(record.data[field.id], field) : ''
  }

  return (
    <div className={`record-canvas-frame ${className}`} style={{ width: layout.canvas_width * scale, height: layout.canvas_height * scale }}>
      <div
        className="record-canvas-render"
        style={{
          width: layout.canvas_width,
          height: layout.canvas_height,
          background: layout.background,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {sorted.map((element) => {
          const field = element.binding_field_id ? fields.find((candidate) => candidate.id === element.binding_field_id) : undefined
          const imageMode = element.type === 'field' && field?.type === 'image' && Boolean(element.props.imageMode)
          const content = resolveContent(element)
          const baseStyle = {
            left: element.x,
            top: element.y,
            width: element.width,
            height: element.height,
            transform: `rotate(${element.rotation}deg)`,
            zIndex: element.z_index,
          }

          if (element.type === 'shape') {
            return (
              <div
                key={element.id}
                className="rendered-element rendered-shape"
                style={{
                  ...baseStyle,
                  background: String(element.props.fill || '#ddd3c2'),
                  borderRadius: Number(element.props.radius || 0),
                  opacity: Number(element.props.opacity ?? 1),
                  border: element.props.borderColor ? `${Number(element.props.borderWidth || 1)}px solid ${String(element.props.borderColor)}` : undefined,
                }}
              />
            )
          }

          return (
            <div
              key={element.id}
              className="rendered-element rendered-content"
              style={{
                ...baseStyle,
                fontSize: Number(element.props.fontSize || 24),
                fontWeight: Number(element.props.fontWeight || 400),
                color: String(element.props.color || '#211f1b'),
                textAlign: String(element.props.align || 'left') as 'left' | 'center' | 'right',
                fontFamily: String(element.props.fontFamily || 'inherit'),
                lineHeight: Number(element.props.lineHeight || 1.2),
                opacity: Number(element.props.opacity ?? 1),
              }}
            >
              {imageMode && content ? <img src={content} alt={field?.name || 'Bound image'} draggable={false} /> : content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
