import { useEffect, useState } from 'react'
import { getFields } from '../lib/data'
import type { Database, Field } from '../types'
import { WIDGET_TYPES } from './AtlasWidget'

type Config = Record<string, unknown>

type Props = {
  config: Config
  databases: Database[]
  save: (patch: Config) => void
}

const databaseWidgets = new Set(['todo','progress_ring','goal','quote','database_count','database_aggregate','random_record','featured_record','recent_records','upcoming_records','timeline','mini_kanban','mini_table','gallery_strip','quick_add','quick_capture','form','search','dynamic_text','conditional_text'])
const labelWidgets = new Set(['digital_clock','calendar','countdown','countup','todo','checklist','counter','progress_ring','goal','habit','daily_focus','sticky_note','quote','greeting','annual_cycle','database_count','database_aggregate','recent_records','upcoming_records','quick_add','form'])

export default function WidgetSettings({ config, databases, save }: Props) {
  const type = String(config.widgetType || 'digital_clock')
  const databaseId = String(config.databaseId || '')
  const [fields, setFields] = useState<Field[]>([])
  useEffect(() => { if (!databaseId) { setFields([]); return }; getFields(databaseId).then(setFields).catch(console.error) }, [databaseId])

  const dateFields = fields.filter(field => field.type === 'date')
  const numberFields = fields.filter(field => field.type === 'number')
  const checkboxFields = fields.filter(field => field.type === 'checkbox')
  const selectFields = fields.filter(field => field.type === 'select')
  const imageFields = fields.filter(field => field.type === 'image')

  return <div className="widget-settings">
    <label className="atlas-edit-control"><span>Widget type</span><select value={type} onChange={event => save({ widgetType: event.target.value })}>{WIDGET_TYPES.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>

    {databaseWidgets.has(type) && <label className="atlas-edit-control"><span>Database</span><select value={databaseId} onChange={event => save({ databaseId: event.target.value })}><option value="">None</option>{databases.map(db => <option key={db.id} value={db.id}>{db.name}</option>)}</select></label>}

    {(type === 'todo' || type === 'progress_ring' || type === 'goal' || type === 'quote') && <label className="atlas-edit-control"><span>Data source</span><select value={String(config.dataMode || 'simple')} onChange={event => save({ dataMode: event.target.value })}><option value="simple">Standalone / manual</option><option value="database">Database</option></select></label>}

    {labelWidgets.has(type) && <label className="atlas-edit-control"><span>Label</span><input value={String(config.label || '')} onChange={event => save({ label: event.target.value })} /></label>}

    {type === 'digital_clock' && <><label className="atlas-edit-control"><span>Time format</span><select value={String(config.timeFormat || '12h')} onChange={event => save({ timeFormat: event.target.value })}><option value="12h">12 hour</option><option value="24h">24 hour</option></select></label><Check label="Show seconds" checked={config.showSeconds !== false} onChange={value => save({ showSeconds: value })}/><Check label="Show date" checked={config.showDate !== false} onChange={value => save({ showDate: value })}/></>}
    {type === 'analog_clock' && <><label className="atlas-edit-control"><span>Face color</span><input type="color" value={safeColor(config.faceColor,'#ffffff')} onChange={event => save({ faceColor:event.target.value })}/></label><Check label="Show seconds" checked={config.showSeconds !== false} onChange={value => save({ showSeconds:value })}/></>}
    {type === 'date' && <label className="atlas-edit-control"><span>Date format</span><select value={String(config.dateFormat || 'full')} onChange={event => save({ dateFormat:event.target.value })}><option value="full">Full</option><option value="short">Short</option><option value="weekday">Weekday only</option></select></label>}
    {(type === 'countdown' || type === 'countup') && <label className="atlas-edit-control"><span>{type === 'countdown' ? 'Target date/time' : 'Start date/time'}</span><input type="datetime-local" value={toLocalInput(config.targetDate)} onChange={event => save({ targetDate:new Date(event.target.value).toISOString() })}/></label>}
    {type === 'todo' && String(config.dataMode || 'simple') === 'database' && <FieldSelect label="Completed checkbox" value={String(config.statusFieldId || '')} fields={checkboxFields} onChange={value => save({ statusFieldId:value })}/>} 
    {type === 'counter' && <div className="atlas-control-grid two"><Num label="Value" value={Number(config.value || 0)} onChange={value => save({ value })}/><Num label="Step" value={Number(config.step || 1)} onChange={value => save({ step:value })}/></div>}
    {(type === 'progress_ring' || type === 'goal') && <><div className="atlas-control-grid two"><Num label="Value" value={Number(config.value || 0)} onChange={value => save({ value })}/><Num label="Maximum" value={Number(config.max || 100)} onChange={value => save({ max:value })}/></div>{String(config.dataMode || 'manual') === 'database' && <><label className="atlas-edit-control"><span>Calculation</span><select value={String(config.aggregate || 'count')} onChange={event => save({ aggregate:event.target.value })}><option value="count">Record count</option><option value="sum">Sum</option><option value="average">Average</option></select></label>{String(config.aggregate || 'count') !== 'count' && <FieldSelect label="Number field" value={String(config.fieldId || '')} fields={numberFields} onChange={value => save({ fieldId:value })}/>}</>}</>}
    {type === 'streak' && <Num label="Current days" value={Number(config.value || 0)} onChange={value => save({ value })}/>} 
    {type === 'habit' && <label className="atlas-edit-control"><span>Habit name</span><input value={String(config.label || 'Habit')} onChange={event => save({ label:event.target.value })}/></label>}
    {type === 'pomodoro' && <div className="atlas-control-grid two"><Num label="Focus minutes" value={Number(config.focusMinutes || 25)} onChange={value => save({ focusMinutes:value })}/><Num label="Break minutes" value={Number(config.breakMinutes || 5)} onChange={value => save({ breakMinutes:value })}/></div>}
    {(type === 'daily_focus' || type === 'sticky_note') && <label className="atlas-edit-control"><span>Text</span><textarea value={String(config.text || '')} onChange={event => save({ text:event.target.value })}/></label>}
    {type === 'quote' && <><label className="atlas-edit-control"><span>Quote</span><textarea value={String(config.text || '')} onChange={event => save({ text:event.target.value })}/></label><label className="atlas-edit-control"><span>Author</span><input value={String(config.author || '')} onChange={event => save({ author:event.target.value })}/></label></>}
    {type === 'greeting' && <><label className="atlas-edit-control"><span>Name</span><input value={String(config.name || '')} onChange={event => save({ name:event.target.value })}/></label><label className="atlas-edit-control"><span>Custom greeting (optional)</span><input value={String(config.prefix || '')} onChange={event => save({ prefix:event.target.value })}/></label><label className="atlas-edit-control"><span>Subtitle</span><input value={String(config.subtitle || '')} onChange={event => save({ subtitle:event.target.value })}/></label></>}
    {type === 'annual_cycle' && <label className="atlas-edit-control"><span>Cycle labels, comma separated</span><input value={String(config.labels || 'Winter,Spring,Summer,Autumn')} onChange={event => save({ labels:event.target.value })}/></label>}
    {type === 'database_aggregate' && <><label className="atlas-edit-control"><span>Calculation</span><select value={String(config.aggregate || 'sum')} onChange={event => save({ aggregate:event.target.value })}><option value="count">Count</option><option value="sum">Sum</option><option value="average">Average</option></select></label>{String(config.aggregate || 'sum') !== 'count' && <FieldSelect label="Number field" value={String(config.fieldId || '')} fields={numberFields} onChange={value => save({ fieldId:value })}/>}</>}
    {(type === 'recent_records' || type === 'upcoming_records' || type === 'timeline' || type === 'mini_table' || type === 'gallery_strip' || type === 'todo') && <Num label="Maximum records" value={Number(config.limit || 6)} onChange={value => save({ limit:value })}/>} 
    {(type === 'upcoming_records' || type === 'timeline') && <FieldSelect label="Date field" value={String(config.fieldId || '')} fields={dateFields} onChange={value => save({ fieldId:value })}/>} 
    {type === 'mini_kanban' && <FieldSelect label="Group by select field" value={String(config.fieldId || '')} fields={selectFields} onChange={value => save({ fieldId:value })}/>} 
    {type === 'gallery_strip' && <FieldSelect label="Image field" value={String(config.fieldId || '')} fields={imageFields} onChange={value => save({ fieldId:value })}/>} 
    {type === 'mini_table' && <label className="atlas-edit-control"><span>Field IDs (comma separated)</span><input value={String(config.fieldIds || '')} onChange={event => save({ fieldIds:event.target.value })}/></label>}
    {type === 'quick_add' && <label className="atlas-edit-control"><span>Default record title</span><input value={String(config.defaultTitle || 'Untitled')} onChange={event => save({ defaultTitle:event.target.value })}/></label>}
    {type === 'quick_capture' && <label className="atlas-edit-control"><span>Placeholder</span><input value={String(config.placeholder || 'Capture something…')} onChange={event => save({ placeholder:event.target.value })}/></label>}
    {type === 'form' && <Num label="Fields shown" value={Number(config.limit || 5)} onChange={value => save({ limit:value })}/>} 
    {type === 'dynamic_text' && <><label className="atlas-edit-control"><span>Template</span><textarea value={String(config.text || 'Today is {date}. You have {count} records.')} onChange={event => save({ text:event.target.value })}/></label><p className="atlas-helper">Tokens: {'{date}'}, {'{time}'}, {'{count}'}</p></>}
    {type === 'conditional_text' && <><Num label="Record threshold" value={Number(config.threshold || 1)} onChange={value => save({ threshold:value })}/><label className="atlas-edit-control"><span>When true</span><input value={String(config.trueText || 'You have things to do.')} onChange={event => save({ trueText:event.target.value })}/></label><label className="atlas-edit-control"><span>When false</span><input value={String(config.falseText || 'All clear.')} onChange={event => save({ falseText:event.target.value })}/></label></>}
    {(type === 'image_carousel' || type === 'slideshow') && <><label className="atlas-edit-control"><span>Image URLs, one per line</span><textarea value={String(config.images || '')} onChange={event => save({ images:event.target.value })}/></label>{type === 'slideshow' && <Num label="Seconds per slide" value={Number(config.interval || 5)} onChange={value => save({ interval:value })}/>}</>}
    {type === 'button_group' && <label className="atlas-edit-control"><span>Buttons, one per line as Label|URL</span><textarea value={String(config.buttons || 'Open|#\nAnother|#')} onChange={event => save({ buttons:event.target.value })}/></label>}
    {(type === 'tabs' || type === 'accordion') && <label className="atlas-edit-control"><span>Sections, one per line as Title|Content</span><textarea value={String(config.sections || 'First|Add content here\nSecond|More content')} onChange={event => save({ sections:event.target.value })}/></label>}

    <div className="atlas-control-grid two"><label className="atlas-edit-control"><span>Widget font</span><input value={String(config.fontFamily || '')} placeholder="inherit" onChange={event => save({ fontFamily:event.target.value })}/></label><Num label="Font size" value={Number(config.fontSize || 16)} onChange={value => save({ fontSize:value })}/></div>
  </div>
}

function FieldSelect({label,value,fields,onChange}:{label:string;value:string;fields:Field[];onChange:(value:string)=>void}){return <label className="atlas-edit-control"><span>{label}</span><select value={value} onChange={event=>onChange(event.target.value)}><option value="">Choose field</option>{fields.map(field=><option value={field.id} key={field.id}>{field.name}</option>)}</select></label>}
function Num({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){return <label className="atlas-edit-control"><span>{label}</span><input type="number" value={value} onChange={event=>onChange(Number(event.target.value))}/></label>}
function Check({label,checked,onChange}:{label:string;checked:boolean;onChange:(value:boolean)=>void}){return <label className="atlas-check"><input type="checkbox" checked={checked} onChange={event=>onChange(event.target.checked)}/>{label}</label>}
function safeColor(value:unknown,fallback:string){const text=String(value||'');return /^#[0-9a-fA-F]{6}$/.test(text)?text:fallback}
function toLocalInput(value:unknown){if(!value)return '';const d=new Date(String(value));if(Number.isNaN(d.getTime()))return '';const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16)}
