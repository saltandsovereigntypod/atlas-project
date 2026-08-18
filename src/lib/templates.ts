import type { PageBlockType } from '../types'

export type TemplateCategory = 'Witchy' | 'Books' | 'Budget' | 'Podcast' | 'Travel' | 'Boards'
export type TemplateBlock = { type: PageBlockType; config: Record<string, unknown> }
export type AtlasPageTemplate = {
  id: string
  name: string
  category: TemplateCategory
  description: string
  icon: string
  settings: Record<string, unknown>
  blocks: TemplateBlock[]
}

const title = (x:number,y:number,width:number,textColor='#211e1a'):TemplateBlock => ({ type:'heading', config:{ systemBinding:'page_title', x,y,width,height:90,zIndex:20,background:'transparent',textColor,fontSize:58,fontWeight:600,fontFamily:'Georgia, serif',lineHeight:1,letterSpacing:-1,textAlign:'left' } })
const heading = (text:string,x:number,y:number,width=360,size=30,color='#211e1a'):TemplateBlock => ({ type:'heading', config:{ text,x,y,width,height:60,zIndex:10,background:'transparent',textColor:color,fontSize:size,fontWeight:600,fontFamily:'Georgia, serif',lineHeight:1.1,textAlign:'left' } })
const text = (value:string,x:number,y:number,width=360,height=100,color='#5f574e'):TemplateBlock => ({ type:'text', config:{ text:value,x,y,width,height,zIndex:8,background:'transparent',textColor:color,fontSize:16,fontWeight:400,fontFamily:'Georgia, serif',lineHeight:1.5,textAlign:'left' } })
const widget = (widgetType:string,x:number,y:number,width:number,height:number,config:Record<string,unknown>={}):TemplateBlock => ({ type:'widget', config:{ widgetType,x,y,width,height,zIndex:9,background:'#ffffff',textColor:'#211e1a',primaryColor:'#211e1a',secondaryColor:'#74695e',accentColor:'#665477',surfaceColor:'#ffffff',borderColor:'#ded4c7',borderWidth:1,radius:18,padding:18,fontFamily:'Georgia, serif',fontSize:16,...config } })
const dbView = (x:number,y:number,width:number,height:number,titleText:string):TemplateBlock => ({ type:'database_view', config:{ databaseId:'$database',mode:'gallery',recordLayoutMode:'auto',title:titleText,limit:12,x,y,width,height,zIndex:7,background:'transparent',textColor:'#211e1a',radius:0,padding:0 } })
const section = (x:number,y:number,width:number,height:number,background:string='#f2ede6'):TemplateBlock => ({ type:'section', config:{ title:'',x,y,width,height,zIndex:2,background,border:'#ded4c7',radius:24,padding:24 } })

export const PAGE_TEMPLATES: AtlasPageTemplate[] = [
  {
    id:'witchy-dashboard', name:'Witchy Dashboard', category:'Witchy', icon:'☾', description:'A lunar, devotional dashboard with time, moon phase, intentions and ritual notes.',
    settings:{ background:'#f4f0e8',textColor:'#241f26',canvasHeight:1250 },
    blocks:[
      title(54,48,620,'#241f26'),
      widget('moon_phase',54,170,310,145,{surfaceColor:'#2c2530',background:'#2c2530',primaryColor:'#f6efe4',secondaryColor:'#cabcd2',textColor:'#f6efe4',borderColor:'#55465d'}),
      widget('digital_clock',386,170,310,145,{showDate:true,surfaceColor:'#ded3c5',background:'#ded3c5',primaryColor:'#2d2530',secondaryColor:'#6d5f72'}),
      heading('Today’s intention',54,350,330,28,'#4b3a52'),
      widget('daily_focus',54,402,420,175,{label:'INTENTION',surfaceColor:'#fffaf3',background:'#fffaf3',borderColor:'#c9b8cf'}),
      heading('Ritual & practice',510,350,340,28,'#4b3a52'),
      widget('checklist',510,402,390,235,{label:'Ritual checklist',items:[{id:'1',text:'Ground and center',done:false},{id:'2',text:'Light candle / offering',done:false},{id:'3',text:'Journal or divination',done:false}]}),
      widget('quote',54,625,846,180,{text:'The path becomes visible by walking it.',author:'Daily reminder',surfaceColor:'#342c38',background:'#342c38',primaryColor:'#fff7ec',secondaryColor:'#cabbd0',textColor:'#fff7ec',borderColor:'#342c38'}),
      heading('Sacred dates',54,850,320,28,'#4b3a52'),
      widget('countdown',54,900,390,180,{label:'Next sacred day'}),
      widget('annual_cycle',474,900,300,180,{label:'Seasonal cycle',labels:'Winter,Spring,Summer,Autumn'})
    ]
  },
  {
    id:'lunar-journal', name:'Lunar Journal', category:'Witchy', icon:'◐', description:'A soft page for lunar observations, reflection and ritual planning.',
    settings:{ background:'#17151b',textColor:'#f5eee7',canvasHeight:1150 },
    blocks:[title(55,50,620,'#f5eee7'),widget('moon_phase',55,170,320,170,{surfaceColor:'#242029',background:'#242029',primaryColor:'#f7efe7',secondaryColor:'#bfb0c6',borderColor:'#44394d'}),widget('date',405,170,440,170,{surfaceColor:'#242029',background:'#242029',primaryColor:'#f7efe7',borderColor:'#44394d'}),heading('Reflection',55,390,320,30,'#dccfe2'),widget('sticky_note',55,445,790,260,{label:'LUNAR NOTES',surfaceColor:'#f2e9df',background:'#f2e9df',primaryColor:'#28222d',secondaryColor:'#76677f',textColor:'#28222d'}),heading('Ritual intentions',55,760,330,30,'#dccfe2'),widget('checklist',55,815,390,220,{label:'This cycle',surfaceColor:'#242029',background:'#242029',primaryColor:'#f7efe7',secondaryColor:'#bfb0c6',borderColor:'#44394d'}),widget('countdown',475,815,370,220,{label:'Next working',surfaceColor:'#302837',background:'#302837',primaryColor:'#f7efe7',secondaryColor:'#bfb0c6',borderColor:'#51435c'})]
  },
  {
    id:'book-library', name:'Book Library', category:'Books', icon:'✦', description:'A visual library with reading goal, totals and a reusable database gallery.',
    settings:{ background:'#f6f1e8',textColor:'#241f1a',canvasHeight:1250 },
    blocks:[title(55,45,620),widget('goal',55,165,390,150,{label:'Reading goal',dataMode:'database',aggregate:'count',max:50,databaseId:'$database',accentColor:'#7d4f46'}),widget('database_count',475,165,220,150,{label:'Books logged',databaseId:'$database'}),widget('database_aggregate',725,165,220,150,{label:'Average rating',databaseId:'$database',aggregate:'average'}),heading('Library',55,355,320),dbView(55,415,890,650,'')]
  },
  {
    id:'tbr-board', name:'TBR Board', category:'Books', icon:'📚', description:'A Milanote-inspired reading board for a TBR database, notes and goals.',
    settings:{ background:'#eee7dc',textColor:'#251f1a',canvasHeight:1200 },
    blocks:[title(55,45,620),section(45,160,920,720,'#f8f3eb'),heading('To be read',75,190,300),dbView(75,250,590,560,''),widget('goal',700,250,230,170,{label:'TBR goal',dataMode:'database',aggregate:'count',max:30,databaseId:'$database',accentColor:'#73564a'}),widget('sticky_note',700,450,230,230,{label:'READING NOTES',text:'What are you craving next?',surfaceColor:'#e8d5b7',background:'#e8d5b7',borderColor:'#d0b78f'}),widget('random_record',700,710,230,130,{label:'Pick my next read',databaseId:'$database'})]
  },
  {
    id:'budget-dashboard', name:'Budget Dashboard', category:'Budget', icon:'$', description:'Income, spending, savings and quick expense capture in one page.',
    settings:{ background:'#f5f2ea',textColor:'#1f2823',canvasHeight:1200 },
    blocks:[title(55,45,650,'#1f2823'),widget('database_aggregate',55,165,250,150,{label:'Income',databaseId:'$database',aggregate:'sum',accentColor:'#52705a'}),widget('database_aggregate',330,165,250,150,{label:'Spent',databaseId:'$database',aggregate:'sum',accentColor:'#9d594f'}),widget('goal',605,165,340,150,{label:'Savings goal',value:0,max:5000,accentColor:'#6d7892'}),heading('Quick expense',55,355,300,28,'#405048'),widget('quick_capture',55,410,500,90,{databaseId:'$database',placeholder:'Coffee, groceries, subscription…'}),heading('Transactions',55,545,300,28,'#405048'),widget('mini_table',55,600,890,360,{databaseId:'$database',limit:8}),widget('progress_ring',680,355,190,190,{label:'Monthly budget',value:35,max:100,accentColor:'#7d674e'})]
  },
  {
    id:'monthly-budget', name:'Monthly Budget', category:'Budget', icon:'◒', description:'A focused monthly spending board with category goals and bills.',
    settings:{ background:'#faf7f0',textColor:'#2a2924',canvasHeight:1100 },
    blocks:[title(55,45,650),widget('goal',55,170,410,155,{label:'Monthly spending',value:0,max:2500,accentColor:'#7a654d'}),widget('progress_ring',500,170,180,180,{label:'Budget used',value:0,max:100,accentColor:'#7a654d'}),widget('countdown',710,170,235,180,{label:'Month ends'}),heading('Bills & expenses',55,410,340),widget('todo',55,465,390,300,{label:'Bills due'}),widget('quick_capture',480,465,465,90,{databaseId:'$database',placeholder:'Log an expense…'}),widget('recent_records',480,585,465,250,{label:'Recent expenses',databaseId:'$database',limit:6})]
  },
  {
    id:'podcast-hq', name:'Podcast HQ', category:'Podcast', icon:'◉', description:'A visual production command center with pipeline, notes and quick capture.',
    settings:{ background:'#f4f0e9',textColor:'#211f1b',canvasHeight:1300 },
    blocks:[title(55,45,650),widget('greeting',55,165,390,140,{prefix:'Make something worth hearing',subtitle:'Your production desk'}),widget('database_count',475,165,220,140,{label:'Episodes',databaseId:'$database'}),widget('quick_capture',725,165,220,140,{databaseId:'$database',placeholder:'Capture an episode idea…'}),heading('Production pipeline',55,355,420),widget('mini_kanban',55,415,890,390,{databaseId:'$database'}),heading('Next actions',55,855,300),widget('todo',55,910,390,250,{label:'Podcast tasks'}),widget('sticky_note',480,910,465,250,{label:'NOTES',text:'Guest ideas, hooks, clips, research…',surfaceColor:'#e8ddca',background:'#e8ddca'})]
  },
  {
    id:'travel-hq', name:'Travel HQ', category:'Travel', icon:'⌖', description:'A travel planning canvas for itinerary records, countdowns and packing.',
    settings:{ background:'#edf1ed',textColor:'#22312a',canvasHeight:1200 },
    blocks:[title(55,45,650,'#22312a'),widget('countdown',55,165,360,160,{label:'Trip countdown',accentColor:'#52705e'}),widget('date',450,165,300,160,{primaryColor:'#32483b'}),widget('checklist',55,380,360,320,{label:'Packing list'}),heading('Itinerary',450,380,300,28,'#32483b'),widget('timeline',450,440,495,320,{databaseId:'$database',label:'Upcoming',limit:8}),widget('gallery_strip',55,755,890,250,{databaseId:'$database',limit:6})]
  },
  {
    id:'moodboard', name:'Blank Moodboard', category:'Boards', icon:'◇', description:'A Milanote-style visual board with starter notes, frames and open space.',
    settings:{ background:'#eeeae3',textColor:'#25211d',canvasHeight:1400 },
    blocks:[title(55,45,650),section(45,160,430,300,'#f8f5ef'),heading('Ideas',75,190,260),widget('sticky_note',75,245,340,170,{label:'NOTE',text:'Drop an idea here…',surfaceColor:'#f0dcae',background:'#f0dcae',borderColor:'#d9bd7d'}),section(505,160,430,300,'#f8f5ef'),heading('References',535,190,280),text('Add images, links, quotes, database cards and anything else you want to collect.',535,245,330,130),section(45,500,890,380,'#f8f5ef'),heading('Workspace',75,530,300),text('This area is intentionally open. Move, layer and overlap elements however you want.',75,585,430,100),widget('checklist',600,570,270,220,{label:'Next steps'})]
  },
  {
    id:'project-board', name:'Project Board', category:'Boards', icon:'▦', description:'A freeform project board with focus, tasks, notes and database activity.',
    settings:{ background:'#f5f3ef',textColor:'#22201d',canvasHeight:1200 },
    blocks:[title(55,45,650),widget('daily_focus',55,165,520,150,{label:'CURRENT FOCUS'}),widget('progress_ring',610,165,185,185,{label:'Progress',value:25,max:100,accentColor:'#665477'}),widget('todo',55,370,390,300,{label:'Next actions'}),widget('sticky_note',480,370,465,300,{label:'WORKING NOTES',text:'Ideas, blockers, links and scraps…',surfaceColor:'#e7ddce',background:'#e7ddce'}),widget('recent_records',55,725,890,280,{label:'Recent activity',databaseId:'$database',limit:7})]
  }
]

export function resolveTemplateConfig(config:Record<string,unknown>, databaseId:string){
  const out:Record<string,unknown>={...config}
  if(out.databaseId==='$database') out.databaseId=databaseId
  return out
}
