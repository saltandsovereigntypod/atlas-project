import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, CirclePlus, Minus as MinusIcon, Pause, Play, Plus, RotateCcw, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createRecord, getFields, getRecords, updateRecord } from '../lib/data'
import type { Database, Field, RecordRow } from '../types'

type Config = Record<string, unknown>
type TodoItem = { id: string; text: string; done: boolean }
type TabItem = { id: string; title: string; body: string }

type Props = {
  config: Config
  editing: boolean
  databases: Database[]
  save: (patch: Config) => void
}

export const WIDGET_TYPES = [
  ['digital_clock','Digital clock'],['analog_clock','Analog clock'],['date','Date'],['calendar','Calendar'],['countdown','Countdown'],['countup','Count up / since'],
  ['todo','To-do list'],['checklist','Checklist'],['counter','Counter'],['progress_ring','Progress ring'],['goal','Goal tracker'],['streak','Streak'],['habit','Habit tracker'],
  ['pomodoro','Pomodoro'],['stopwatch','Stopwatch'],['daily_focus','Daily focus'],['sticky_note','Sticky note'],['quote','Quote'],['greeting','Greeting'],['moon_phase','Moon phase'],['annual_cycle','Annual cycle'],
  ['database_count','Database count'],['database_aggregate','Database aggregate'],['random_record','Random record'],['featured_record','Featured record'],['recent_records','Recently added'],['upcoming_records','Upcoming'],['timeline','Timeline'],['mini_kanban','Mini kanban'],['mini_table','Mini table'],['gallery_strip','Gallery strip'],
  ['quick_add','Quick add'],['quick_capture','Quick capture'],['form','Database form'],['search','Database search'],['dynamic_text','Dynamic text'],['conditional_text','Conditional text'],
  ['image_carousel','Image carousel'],['slideshow','Slideshow'],['button_group','Button group'],['tabs','Tabs'],['accordion','Accordion'],
] as const

export default function AtlasWidget({ config, editing, databases, save }: Props) {
  const type = String(config.widgetType || 'digital_clock')
  const databaseId = String(config.databaseId || '')
  const { records, fields, setRecords, refresh } = useDatabaseData(databaseId)
  const now = useNow(type === 'digital_clock' || type === 'analog_clock' || type === 'date' || type === 'countdown' || type === 'countup' || type === 'greeting' || type === 'moon_phase' || type === 'annual_cycle')

  const commonStyle: CSSProperties = {
    fontFamily: String(config.fontFamily || 'inherit'),
    fontSize: Number(config.fontSize || 16),
    textAlign: String(config.textAlign || 'left') as CSSProperties['textAlign'],
  }

  if (type === 'digital_clock') return <DigitalClock now={now} config={config} style={commonStyle} />
  if (type === 'analog_clock') return <AnalogClock now={now} config={config} />
  if (type === 'date') return <DateWidget now={now} config={config} style={commonStyle} />
  if (type === 'calendar') return <CalendarWidget config={config} />
  if (type === 'countdown') return <Countdown now={now} config={config} />
  if (type === 'countup') return <Countup now={now} config={config} />
  if (type === 'todo') return <TodoWidget config={config} save={save} records={records} fields={fields} setRecords={setRecords} />
  if (type === 'checklist') return <Checklist config={config} save={save} />
  if (type === 'counter') return <Counter config={config} save={save} />
  if (type === 'progress_ring') return <ProgressRing config={config} records={records} fields={fields} />
  if (type === 'goal') return <GoalWidget config={config} records={records} fields={fields} />
  if (type === 'streak') return <Streak config={config} save={save} />
  if (type === 'habit') return <Habit config={config} save={save} />
  if (type === 'pomodoro') return <Pomodoro config={config} />
  if (type === 'stopwatch') return <Stopwatch />
  if (type === 'daily_focus') return <EditableCard config={config} save={save} field="text" fallback="What matters most today?" editing={editing} />
  if (type === 'sticky_note') return <EditableCard config={config} save={save} field="text" fallback="Write something…" editing={editing} multiline />
  if (type === 'quote') return <QuoteWidget config={config} records={records} />
  if (type === 'greeting') return <Greeting now={now} config={config} />
  if (type === 'moon_phase') return <MoonPhase now={now} />
  if (type === 'annual_cycle') return <AnnualCycle now={now} config={config} />
  if (type === 'database_count') return <DatabaseCount config={config} records={records} />
  if (type === 'database_aggregate') return <DatabaseAggregate config={config} records={records} fields={fields} />
  if (type === 'random_record') return <RandomRecord config={config} records={records} databaseId={databaseId} />
  if (type === 'featured_record') return <FeaturedRecord config={config} records={records} databaseId={databaseId} />
  if (type === 'recent_records') return <RecordList records={records.slice(0, Number(config.limit || 5))} databaseId={databaseId} label={String(config.label || 'Recently added')} />
  if (type === 'upcoming_records') return <Upcoming config={config} records={records} fields={fields} databaseId={databaseId} />
  if (type === 'timeline') return <Timeline config={config} records={records} fields={fields} databaseId={databaseId} />
  if (type === 'mini_kanban') return <MiniKanban config={config} records={records} fields={fields} databaseId={databaseId} />
  if (type === 'mini_table') return <MiniTable config={config} records={records} fields={fields} databaseId={databaseId} />
  if (type === 'gallery_strip') return <GalleryStrip config={config} records={records} fields={fields} databaseId={databaseId} />
  if (type === 'quick_add') return <QuickAdd config={config} databaseId={databaseId} refresh={refresh} />
  if (type === 'quick_capture') return <QuickCapture config={config} databaseId={databaseId} refresh={refresh} />
  if (type === 'form') return <DatabaseForm config={config} databaseId={databaseId} fields={fields} refresh={refresh} />
  if (type === 'search') return <DatabaseSearch records={records} databaseId={databaseId} />
  if (type === 'dynamic_text') return <DynamicText now={now} config={config} records={records} />
  if (type === 'conditional_text') return <ConditionalText config={config} records={records} />
  if (type === 'image_carousel' || type === 'slideshow') return <ImageCarousel config={config} auto={type === 'slideshow'} />
  if (type === 'button_group') return <ButtonGroup config={config} editing={editing} />
  if (type === 'tabs') return <TabsWidget config={config} />
  if (type === 'accordion') return <AccordionWidget config={config} />
  return <div className="atlas-widget-empty">Choose a widget type in Design.</div>
}

function useNow(active: boolean) {
  const [now, setNow] = useState(new Date())
  useEffect(() => { if (!active) return; const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id) }, [active])
  return now
}

function useDatabaseData(databaseId: string) {
  const [records, setRecords] = useState<RecordRow[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const refresh = async () => {
    if (!databaseId) { setRecords([]); setFields([]); return }
    const [nextRecords, nextFields] = await Promise.all([getRecords(databaseId), getFields(databaseId)])
    setRecords(nextRecords); setFields(nextFields)
  }
  useEffect(() => { void refresh() }, [databaseId])
  return { records, fields, setRecords, refresh }
}

function DigitalClock({ now, config, style }: { now: Date; config: Config; style: CSSProperties }) {
  const format = String(config.timeFormat || '12h')
  return <div className="widget-digital-clock" style={style}><strong>{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: config.showSeconds === false ? undefined : '2-digit', hour12: format !== '24h' })}</strong>{config.showDate !== false && <span>{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>}</div>
}

function AnalogClock({ now, config }: { now: Date; config: Config }) {
  const seconds = now.getSeconds(), minutes = now.getMinutes() + seconds / 60, hours = (now.getHours() % 12) + minutes / 60
  return <div className="widget-analog" style={{ background: String(config.faceColor || 'transparent') }}><div className="analog-hand hour" style={{ transform: `rotate(${hours * 30}deg)` }} /><div className="analog-hand minute" style={{ transform: `rotate(${minutes * 6}deg)` }} />{config.showSeconds !== false && <div className="analog-hand second" style={{ transform: `rotate(${seconds * 6}deg)` }} />}<div className="analog-dot" />{[12,3,6,9].map((n,i)=><span className={`analog-number n${i}`} key={n}>{n}</span>)}</div>
}

function DateWidget({ now, config, style }: { now: Date; config: Config; style: CSSProperties }) {
  const mode = String(config.dateFormat || 'full')
  const options: Intl.DateTimeFormatOptions = mode === 'short' ? { month:'short', day:'numeric', year:'numeric' } : mode === 'weekday' ? { weekday:'long' } : { weekday:'long', month:'long', day:'numeric', year:'numeric' }
  return <div className="widget-date" style={style}>{now.toLocaleDateString(undefined, options)}</div>
}

function CalendarWidget({ config }: { config: Config }) {
  const [cursor, setCursor] = useState(() => new Date())
  const year=cursor.getFullYear(), month=cursor.getMonth(), first=new Date(year,month,1).getDay(), days=new Date(year,month+1,0).getDate(), today=new Date()
  const cells = Array.from({length:first+days},(_,i)=>i<first?null:i-first+1)
  return <div className="widget-calendar"><div className="widget-calendar-head"><button onClick={()=>setCursor(new Date(year,month-1,1))}><ChevronLeft/></button><strong>{cursor.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</strong><button onClick={()=>setCursor(new Date(year,month+1,1))}><ChevronRight/></button></div><div className="calendar-weekdays">{'SMTWTFS'.split('').map((d,i)=><span key={i}>{d}</span>)}</div><div className="calendar-grid">{cells.map((d,i)=><span key={i} className={d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear()?'today':''}>{d||''}</span>)}</div>{config.label && <small>{String(config.label)}</small>}</div>
}

function Countdown({ now, config }: { now: Date; config: Config }) {
  const target = new Date(String(config.targetDate || new Date(Date.now()+86400000).toISOString()))
  const diff=Math.max(0,target.getTime()-now.getTime()),days=Math.floor(diff/86400000),hours=Math.floor(diff%86400000/3600000),minutes=Math.floor(diff%3600000/60000),seconds=Math.floor(diff%60000/1000)
  return <div className="widget-countdown"><span>{String(config.label || 'Countdown')}</span><strong>{days}<small>d</small> {hours}<small>h</small> {minutes}<small>m</small> {seconds}<small>s</small></strong></div>
}
function Countup({ now, config }: { now: Date; config: Config }) { const start=new Date(String(config.targetDate||new Date().toISOString())),days=Math.max(0,Math.floor((now.getTime()-start.getTime())/86400000));return <div className="widget-countdown"><span>{String(config.label||'Since')}</span><strong>{days}<small> days</small></strong></div> }

function TodoWidget({ config, save, records, fields, setRecords }: { config: Config; save:(p:Config)=>void; records:RecordRow[]; fields:Field[]; setRecords:(r:RecordRow[])=>void }) {
  const mode=String(config.dataMode||'simple')
  if(mode==='database'){
    const status=fields.find(f=>f.id===String(config.statusFieldId||'')) || fields.find(f=>f.type==='checkbox')
    const toggle=async(record:RecordRow)=>{if(!status)return;const updated=await updateRecord(record.id,{data:{...record.data,[status.id]:!Boolean(record.data?.[status.id])}});setRecords(records.map(r=>r.id===updated.id?updated:r))}
    return <div className="widget-list"><strong>{String(config.label||'To do')}</strong>{records.slice(0,Number(config.limit||8)).map(r=><label key={r.id}><input type="checkbox" checked={status?Boolean(r.data?.[status.id]):false} disabled={!status} onChange={()=>void toggle(r)}/><span>{r.title}</span></label>)}{!status&&<small>Select a checkbox property in Design.</small>}</div>
  }
  return <SimpleItems config={config} save={save} label={String(config.label||'To do')} />
}
function Checklist({config,save}:{config:Config;save:(p:Config)=>void}){return <SimpleItems config={config} save={save} label={String(config.label||'Checklist')}/>}
function SimpleItems({config,save,label}:{config:Config;save:(p:Config)=>void;label:string}){
  const items=(Array.isArray(config.items)?config.items:[]) as TodoItem[];const[text,setText]=useState('')
  const persist=(next:TodoItem[])=>save({items:next})
  return <div className="widget-list"><strong>{label}</strong>{items.map(item=><label key={item.id}><input type="checkbox" checked={item.done} onChange={()=>persist(items.map(x=>x.id===item.id?{...x,done:!x.done}:x))}/><span className={item.done?'done':''}>{item.text}</span><button onClick={()=>persist(items.filter(x=>x.id!==item.id))}>×</button></label>)}<div className="widget-add-row"><input value={text} placeholder="Add item" onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&text.trim()){persist([...items,{id:crypto.randomUUID(),text:text.trim(),done:false}]);setText('')}}}/><button onClick={()=>{if(text.trim()){persist([...items,{id:crypto.randomUUID(),text:text.trim(),done:false}]);setText('')}}}><Plus/></button></div></div>
}

function Counter({config,save}:{config:Config;save:(p:Config)=>void}){const value=Number(config.value||0),step=Number(config.step||1);return <div className="widget-counter"><span>{String(config.label||'Counter')}</span><strong>{value}</strong><div><button onClick={()=>save({value:value-step})}><MinusIcon/></button><button onClick={()=>save({value:value+step})}><Plus/></button></div></div>}
function ProgressRing({config,records,fields}:{config:Config;records:RecordRow[];fields:Field[]}){const value=resolveNumber(config,records,fields),max=Math.max(1,Number(config.max||100)),pct=Math.max(0,Math.min(100,value/max*100));return <div className="widget-ring" style={{'--pct':`${pct*3.6}deg`} as CSSProperties}><div><strong>{Math.round(pct)}%</strong><span>{String(config.label||'Progress')}</span></div></div>}
function GoalWidget({config,records,fields}:{config:Config;records:RecordRow[];fields:Field[]}){const value=resolveNumber(config,records,fields),max=Math.max(1,Number(config.max||100)),pct=Math.max(0,Math.min(100,value/max*100));return <div className="widget-goal"><div><span>{String(config.label||'Goal')}</span><strong>{value} / {max}</strong></div><div className="widget-goal-track"><i style={{width:`${pct}%`}}/></div></div>}
function resolveNumber(config:Config,records:RecordRow[],fields:Field[]){if(String(config.dataMode||'manual')==='database'){if(String(config.aggregate||'count')==='count')return records.length;const field=fields.find(f=>f.id===String(config.fieldId||''));const nums=field?records.map(r=>Number(r.data?.[field.id])).filter(Number.isFinite):[];return String(config.aggregate)==='average'?(nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:0):nums.reduce((a,b)=>a+b,0)}return Number(config.value||0)}

function Streak({config,save}:{config:Config;save:(p:Config)=>void}){const value=Number(config.value||0);return <div className="widget-streak"><span>🔥</span><strong>{value} days</strong><button onClick={()=>save({value:value+1})}>Check in</button></div>}
function Habit({config,save}:{config:Config;save:(p:Config)=>void}){const days=(Array.isArray(config.days)?config.days:Array(7).fill(false)) as boolean[];return <div className="widget-habit"><strong>{String(config.label||'Habit')}</strong><div>{days.map((done,i)=><button key={i} className={done?'done':''} onClick={()=>save({days:days.map((x,j)=>j===i?!x:x)})}>{'SMTWTFS'[i]}{done&&<Check/>}</button>)}</div></div>}

function Pomodoro({config}:{config:Config}){const focus=Math.max(1,Number(config.focusMinutes||25))*60,breakSecs=Math.max(1,Number(config.breakMinutes||5))*60;const[remaining,setRemaining]=useState(focus),[running,setRunning]=useState(false),[mode,setMode]=useState<'focus'|'break'>('focus');useEffect(()=>{if(!running)return;const id=window.setInterval(()=>setRemaining(v=>{if(v>1)return v-1;const next=mode==='focus'?'break':'focus';setMode(next);return next==='focus'?focus:breakSecs}),1000);return()=>clearInterval(id)},[running,mode,focus,breakSecs]);return <div className="widget-timer"><span>{mode==='focus'?'Focus':'Break'}</span><strong>{formatSeconds(remaining)}</strong><div><button onClick={()=>setRunning(v=>!v)}>{running?<Pause/>:<Play/>}</button><button onClick={()=>{setRunning(false);setRemaining(mode==='focus'?focus:breakSecs)}}><RotateCcw/></button></div></div>}
function Stopwatch(){const[elapsed,setElapsed]=useState(0),[running,setRunning]=useState(false);useEffect(()=>{if(!running)return;const id=window.setInterval(()=>setElapsed(v=>v+1),1000);return()=>clearInterval(id)},[running]);return <div className="widget-timer"><span>Stopwatch</span><strong>{formatSeconds(elapsed)}</strong><div><button onClick={()=>setRunning(v=>!v)}>{running?<Pause/>:<Play/>}</button><button onClick={()=>{setRunning(false);setElapsed(0)}}><RotateCcw/></button></div></div>}
function formatSeconds(s:number){const m=Math.floor(s/60),sec=s%60;return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`}

function EditableCard({config,save,field,fallback,editing,multiline=false}:{config:Config;save:(p:Config)=>void;field:string;fallback:string;editing:boolean;multiline?:boolean}){const text=String(config[field]||fallback);return <div className="widget-editable"><span>{String(config.label||'')}</span>{multiline?<textarea value={text} readOnly={!editing} onChange={e=>save({[field]:e.target.value})}/>:<input value={text} readOnly={!editing} onChange={e=>save({[field]:e.target.value})}/>}</div>}
function QuoteWidget({config,records}:{config:Config;records:RecordRow[]}){const manual=String(config.text||'Add a quote in Design.'),record=records.length?records[Math.abs(Number(config.seed||0))%records.length]:null;return <blockquote className="widget-quote">“{String(config.dataMode)==='database'&&record?record.title:manual}”{config.author&&<cite>{String(config.author)}</cite>}</blockquote>}
function Greeting({now,config}:{now:Date;config:Config}){const h=now.getHours(),g=h<12?'Good morning':h<18?'Good afternoon':'Good evening';return <div className="widget-greeting"><strong>{String(config.prefix||g)}{config.name?`, ${String(config.name)}`:''}</strong>{config.subtitle&&<span>{String(config.subtitle)}</span>}</div>}
function MoonPhase({now}:{now:Date}){const phase=moonPhase(now);return <div className="widget-moon"><span>{phase.emoji}</span><div><strong>{phase.name}</strong><small>{phase.age.toFixed(1)} days into cycle</small></div></div>}
function moonPhase(date:Date){const lunar=29.53058867,known=new Date('2000-01-06T18:14:00Z').getTime(),age=(((date.getTime()-known)/86400000)%lunar+lunar)%lunar;const index=Math.floor((age/lunar)*8+0.5)%8,names=['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'],emoji=['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];return{name:names[index],emoji:emoji[index],age}}
function AnnualCycle({now,config}:{now:Date;config:Config}){const labels=String(config.labels||'Winter,Spring,Summer,Autumn').split(',').map(s=>s.trim()),idx=Math.floor(now.getMonth()/3)%Math.max(1,labels.length);return <div className="widget-cycle"><span>{String(config.label||'Current season')}</span><strong>{labels[idx]||'Cycle'}</strong><small>{now.toLocaleDateString(undefined,{month:'long',day:'numeric'})}</small></div>}

function DatabaseCount({config,records}:{config:Config;records:RecordRow[]}){return <div className="widget-db-count"><strong>{records.length}</strong><span>{String(config.label||'records')}</span></div>}
function DatabaseAggregate({config,records,fields}:{config:Config;records:RecordRow[];fields:Field[]}){const value=resolveNumber({...config,dataMode:'database'},records,fields);return <div className="widget-db-count"><strong>{Number.isInteger(value)?value:value.toFixed(1)}</strong><span>{String(config.label||String(config.aggregate||'Total'))}</span></div>}
function RandomRecord({config,records,databaseId}:{config:Config;records:RecordRow[];databaseId:string}){const[index,setIndex]=useState(0);const r=records.length?records[index%records.length]:null;return <div className="widget-featured">{r?<><Link to={`/database/${databaseId}/record/${r.id}`}>{r.title}</Link><button onClick={()=>setIndex(Math.floor(Math.random()*records.length))}>Another</button></>:<span>No records</span>}{config.label&&<small>{String(config.label)}</small>}</div>}
function FeaturedRecord({config,records,databaseId}:{config:Config;records:RecordRow[];databaseId:string}){const id=String(config.recordId||''),r=records.find(x=>x.id===id)||records[0];return <div className="widget-featured">{r?<Link to={`/database/${databaseId}/record/${r.id}`}>{r.title}</Link>:<span>No record selected</span>}{config.label&&<small>{String(config.label)}</small>}</div>}
function RecordList({records,databaseId,label}:{records:RecordRow[];databaseId:string;label:string}){return <div className="widget-record-list"><strong>{label}</strong>{records.map(r=><Link key={r.id} to={`/database/${databaseId}/record/${r.id}`}>{r.title}</Link>)}</div>}
function Upcoming({config,records,fields,databaseId}:{config:Config;records:RecordRow[];fields:Field[];databaseId:string}){const field=fields.find(f=>f.id===String(config.fieldId||''))||fields.find(f=>f.type==='date'),up=field?records.filter(r=>r.data?.[field.id]&&new Date(String(r.data[field.id]))>=new Date()).sort((a,b)=>new Date(String(a.data[field.id])).getTime()-new Date(String(b.data[field.id])).getTime()).slice(0,Number(config.limit||5)):[];return <div className="widget-record-list"><strong>{String(config.label||'Upcoming')}</strong>{up.map(r=><Link key={r.id} to={`/database/${databaseId}/record/${r.id}`}><span>{r.title}</span><small>{field?new Date(String(r.data[field.id])).toLocaleDateString():''}</small></Link>)}{!field&&<small>Choose a date field in Design.</small>}</div>}
function Timeline({config,records,fields,databaseId}:{config:Config;records:RecordRow[];fields:Field[];databaseId:string}){const field=fields.find(f=>f.id===String(config.fieldId||''))||fields.find(f=>f.type==='date');const sorted=field?[...records].filter(r=>r.data?.[field.id]).sort((a,b)=>new Date(String(a.data[field.id])).getTime()-new Date(String(b.data[field.id])).getTime()).slice(0,Number(config.limit||8)):records.slice(0,8);return <div className="widget-timeline">{sorted.map(r=><Link key={r.id} to={`/database/${databaseId}/record/${r.id}`}><i/><div><strong>{r.title}</strong>{field&&<small>{new Date(String(r.data[field.id])).toLocaleDateString()}</small>}</div></Link>)}</div>}
function MiniKanban({config,records,fields,databaseId}:{config:Config;records:RecordRow[];fields:Field[];databaseId:string}){const field=fields.find(f=>f.id===String(config.fieldId||''))||fields.find(f=>f.type==='select');const groups=field?Array.from(new Set(records.map(r=>String(r.data?.[field.id]||'Unassigned')))):['Records'];return <div className="widget-kanban">{groups.slice(0,4).map(g=><div key={g}><strong>{g}</strong>{records.filter(r=>!field||String(r.data?.[field.id]||'Unassigned')===g).slice(0,5).map(r=><Link key={r.id} to={`/database/${databaseId}/record/${r.id}`}>{r.title}</Link>)}</div>)}</div>}
function MiniTable({config,records,fields,databaseId}:{config:Config;records:RecordRow[];fields:Field[];databaseId:string}){const selected=fields.filter(f=>String(config.fieldIds||'').split(',').includes(f.id));return <div className="widget-mini-table">{records.slice(0,Number(config.limit||6)).map(r=><Link key={r.id} to={`/database/${databaseId}/record/${r.id}`}><strong>{r.title}</strong>{selected.map(f=><span key={f.id}>{String(r.data?.[f.id]??'')}</span>)}</Link>)}</div>}
function GalleryStrip({config,records,fields,databaseId}:{config:Config;records:RecordRow[];fields:Field[];databaseId:string}){const image=fields.find(f=>f.id===String(config.fieldId||''))||fields.find(f=>f.type==='image');return <div className="widget-gallery-strip">{records.slice(0,Number(config.limit||6)).map(r=><Link key={r.id} to={`/database/${databaseId}/record/${r.id}`}>{image&&r.data?.[image.id]?<img src={String(r.data[image.id])} alt=""/>:<div/>}<span>{r.title}</span></Link>)}</div>}

function QuickAdd({config,databaseId,refresh}:{config:Config;databaseId:string;refresh:()=>Promise<void>}){const[busy,setBusy]=useState(false);return <button className="widget-quick-button" disabled={!databaseId||busy} onClick={async()=>{setBusy(true);await createRecord(databaseId,String(config.defaultTitle||'Untitled'));await refresh();setBusy(false)}}><CirclePlus/>{String(config.label||'Add record')}</button>}
function QuickCapture({config,databaseId,refresh}:{config:Config;databaseId:string;refresh:()=>Promise<void>}){const[text,setText]=useState('');return <div className="widget-capture"><input value={text} placeholder={String(config.placeholder||'Capture something…')} onChange={e=>setText(e.target.value)} onKeyDown={async e=>{if(e.key==='Enter'&&text.trim()&&databaseId){await createRecord(databaseId,text.trim());setText('');await refresh()}}}/><button disabled={!databaseId||!text.trim()} onClick={async()=>{await createRecord(databaseId,text.trim());setText('');await refresh()}}><Plus/></button></div>}
function DatabaseForm({config,databaseId,fields,refresh}:{config:Config;databaseId:string;fields:Field[];refresh:()=>Promise<void>}){const[title,setTitle]=useState(''),[values,setValues]=useState<Record<string,unknown>>({});return <div className="widget-form"><strong>{String(config.label||'Add record')}</strong><input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)}/>{fields.filter(f=>f.type!=='relation').slice(0,Number(config.limit||5)).map(f=><input key={f.id} type={f.type==='date'?'date':f.type==='number'?'number':'text'} placeholder={f.name} value={String(values[f.id]??'')} onChange={e=>setValues(v=>({...v,[f.id]:f.type==='number'?Number(e.target.value):e.target.value}))}/>)}<button disabled={!databaseId||!title.trim()} onClick={async()=>{const r=await createRecord(databaseId,title.trim());if(Object.keys(values).length)await updateRecord(r.id,{data:values});setTitle('');setValues({});await refresh()}}>Save</button></div>}
function DatabaseSearch({records,databaseId}:{records:RecordRow[];databaseId:string}){const[q,setQ]=useState('');const found=q.trim()?records.filter(r=>r.title.toLowerCase().includes(q.toLowerCase())).slice(0,8):[];return <div className="widget-search"><div><Search/><input value={q} placeholder="Search" onChange={e=>setQ(e.target.value)}/></div>{found.map(r=><Link key={r.id} to={`/database/${databaseId}/record/${r.id}`}>{r.title}</Link>)}</div>}
function DynamicText({now,config,records}:{now:Date;config:Config;records:RecordRow[]}){const template=String(config.text||'Today is {date}. You have {count} records.');const text=template.replaceAll('{date}',now.toLocaleDateString()).replaceAll('{time}',now.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})).replaceAll('{count}',String(records.length));return <div className="widget-dynamic-text">{text}</div>}
function ConditionalText({config,records}:{config:Config;records:RecordRow[]}){const threshold=Number(config.threshold||1),ok=records.length>=threshold;return <div className="widget-dynamic-text">{ok?String(config.trueText||'You have things to do.'):String(config.falseText||'All clear.')}</div>}

function ImageCarousel({config,auto}:{config:Config;auto:boolean}){const images=String(config.images||'').split(/\n|,/).map(s=>s.trim()).filter(Boolean);const[index,setIndex]=useState(0);useEffect(()=>{if(!auto||images.length<2)return;const id=window.setInterval(()=>setIndex(i=>(i+1)%images.length),Math.max(1000,Number(config.interval||5)*1000));return()=>clearInterval(id)},[auto,images.length,config.interval]);if(!images.length)return <div className="atlas-widget-empty">Add image URLs in Design.</div>;return <div className="widget-carousel"><img src={images[index%images.length]} alt=""/><button className="prev" onClick={()=>setIndex(i=>(i-1+images.length)%images.length)}><ChevronLeft/></button><button className="next" onClick={()=>setIndex(i=>(i+1)%images.length)}><ChevronRight/></button><small>{index+1} / {images.length}</small></div>}
function ButtonGroup({config,editing}:{config:Config;editing:boolean}){const rows=String(config.buttons||'Open|#\nAnother|#').split('\n').map(x=>x.split('|'));return <div className="widget-button-group">{rows.map(([label,url],i)=><a key={i} href={editing?undefined:(url||'#')} onClick={editing?e=>e.preventDefault():undefined}>{label||'Button'}</a>)}</div>}
function TabsWidget({config}:{config:Config}){const tabs=parseTabs(config),[active,setActive]=useState(0);return <div className="widget-tabs"><div>{tabs.map((t,i)=><button className={i===active?'active':''} key={t.id} onClick={()=>setActive(i)}>{t.title}</button>)}</div><p>{tabs[active]?.body||''}</p></div>}
function AccordionWidget({config}:{config:Config}){const tabs=parseTabs(config),[open,setOpen]=useState<number|null>(0);return <div className="widget-accordion">{tabs.map((t,i)=><section key={t.id}><button onClick={()=>setOpen(open===i?null:i)}>{t.title}<span>{open===i?'−':'+'}</span></button>{open===i&&<p>{t.body}</p>}</section>)}</div>}
function parseTabs(config:Config):TabItem[]{const raw=String(config.sections||'First|Add content here\nSecond|More content');return raw.split('\n').filter(Boolean).map((row,i)=>{const[title,...body]=row.split('|');return{id:String(i),title:title||`Tab ${i+1}`,body:body.join('|')}})}
