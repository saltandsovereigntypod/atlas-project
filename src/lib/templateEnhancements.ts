import { PAGE_TEMPLATES, type TemplateBlock } from './templates'

const heading = (text:string,x:number,y:number,width:number,size=24,color='#2b2722'):TemplateBlock => ({
  type:'heading',config:{text,x,y,width,height:48,zIndex:12,background:'transparent',textColor:color,fontSize:size,fontWeight:600,fontFamily:'Georgia, serif',lineHeight:1.08,textAlign:'left'}
})
const copy = (text:string,x:number,y:number,width:number,height=54,color='#74695e',size=14):TemplateBlock => ({
  type:'text',config:{text,x,y,width,height,zIndex:9,background:'transparent',textColor:color,fontSize:size,fontWeight:400,fontFamily:'Georgia, serif',lineHeight:1.45,textAlign:'left'}
})
const widget = (widgetType:string,x:number,y:number,width:number,height:number,config:Record<string,unknown>={}):TemplateBlock => ({
  type:'widget',config:{widgetType,x,y,width,height,zIndex:10,background:'transparent',textColor:'#251f1b',primaryColor:'#251f1b',secondaryColor:'#74695e',accentColor:'#6d5874',surfaceColor:'#fffdfa',borderColor:'#d9cec1',widgetBorderWidth:1,widgetRadius:20,widgetPadding:16,radius:0,padding:0,fontFamily:'Georgia, serif',fontSize:14,...config}
})
const title = (x:number,y:number,width:number,textColor:string,size=58):TemplateBlock => ({
  type:'heading',config:{systemBinding:'page_title',x,y,width,height:82,zIndex:20,background:'transparent',textColor,fontSize:size,fontWeight:600,fontFamily:'Georgia, serif',lineHeight:1,letterSpacing:-1.2,textAlign:'left'}
})

function replacePodcastHQ(){
  const template = PAGE_TEMPLATES.find(item => item.id === 'podcast-hq' || (item.category === 'Podcast' && /podcast.*hq/i.test(item.name)))
  if(!template) return
  template.description = 'A working podcast command center with idea capture, production flow, on-deck episodes, publishing tasks, and an editable studio scratchpad.'
  template.settings = {...template.settings,background:'#f2eee7',textColor:'#2b2522',canvasHeight:1420}
  template.blocks = [
    title(58,44,620,'#251f1b',58),
    copy('A living studio for ideas, production, publishing, and the things that cannot be allowed to disappear.',60,116,610,44,'#776c63',14),

    heading('Capture',58,184,220,22,'#5b465d'),
    widget('quick_capture',58,228,520,104,{databaseId:'$database',placeholder:'Episode idea, hook, guest, question…',surfaceColor:'#fffaf4',borderColor:'#d9cbbd',widgetRadius:18,widgetPadding:16}),
    widget('database_count',600,184,160,148,{databaseId:'$database',label:'Episodes',surfaceColor:'#d9cfe0',primaryColor:'#352b39',secondaryColor:'#796f7f',borderColor:'#c3b6ca',widgetRadius:24}),
    widget('sticky_note',782,184,164,148,{label:'THIS WEEK',text:'What absolutely needs to move?',surfaceColor:'#ead4b1',primaryColor:'#392d23',secondaryColor:'#7b6856',borderColor:'#d3b98f',widgetRadius:22,widgetPadding:18}),

    heading('On deck',58,386,240,25,'#5b465d'),
    copy('What is coming up next, without opening the master database.',58,424,420,42,'#7a6e66',13),
    widget('upcoming_records',58,474,430,218,{databaseId:'$database',label:'Upcoming episodes',limit:4,surfaceColor:'#fffdfa',borderColor:'#d9cec1',widgetRadius:20,widgetPadding:18}),
    widget('checklist',514,474,432,218,{label:'Publishing rhythm',items:[
      {id:'pod-1',text:'Confirm episode title and hook',done:false},{id:'pod-2',text:'Finish edit and final listen',done:false},{id:'pod-3',text:'Write description and show notes',done:false},{id:'pod-4',text:'Schedule episode and social posts',done:false}
    ],surfaceColor:'#e6ded2',primaryColor:'#302922',secondaryColor:'#766c62',accentColor:'#6b576f',borderColor:'#cfc3b5',widgetRadius:20,widgetPadding:18}),

    heading('Production pipeline',58,748,360,28,'#5b465d'),
    copy('Drag episodes between stages in normal mode. The real database status changes with them.',58,788,610,42,'#7a6e66',13),
    widget('mini_kanban',58,838,888,300,{databaseId:'$database',surfaceColor:'#f8f4ef',borderColor:'#d7cec3',widgetRadius:22,widgetPadding:14}),

    heading('Studio desk',58,1190,260,25,'#5b465d'),
    widget('sticky_note',58,1232,430,150,{label:'WORKING NOTES',text:'Loose hooks, title options, clips, research links, questions, reminders…',surfaceColor:'#dfd5c7',primaryColor:'#302822',secondaryColor:'#76695d',borderColor:'#c8b9a8',widgetRadius:18,widgetPadding:18}),
    widget('recent_records',514,1232,432,150,{databaseId:'$database',label:'Recently touched episodes',limit:4,surfaceColor:'#302a31',primaryColor:'#fff9f2',secondaryColor:'#cdbfc8',borderColor:'#302a31',widgetRadius:18,widgetPadding:18})
  ]
}

function enrichBooks(){
  const template = PAGE_TEMPLATES.find(item => item.id === 'book-library')
  if(!template) return
  template.description = 'A reading sanctuary with a living library, quick logging, reading mood, progress, and book discovery.'
  if(template.blocks.some(block => block.type === 'widget' && block.config.widgetType === 'quick_capture')) return
  template.blocks.push(
    heading('Quick log',520,1050,180,22,'#5a4035'),
    widget('quick_capture',520,1090,425,96,{databaseId:'$database',placeholder:'Add a book title…',surfaceColor:'#fffaf3',primaryColor:'#382a22',borderColor:'#d7c7b7',widgetRadius:16}),
  )
  template.settings = {...template.settings,canvasHeight:1320}
}

function enrichBudget(){
  const template = PAGE_TEMPLATES.find(item => item.id === 'budget-dashboard')
  if(!template) return
  template.description = 'A calm money cockpit with fast transaction logging, commitments, recent activity, and goals you can actually use.'
  template.settings = {...template.settings,canvasHeight:1320}
}

function enrichWitchy(){
  const template = PAGE_TEMPLATES.find(item => item.id === 'witchy-dashboard')
  if(!template) return
  template.description = 'A living daily spiritual dashboard with editable intention, ritual practice, timing, notes, and personal rhythm.'
}

export function installTemplateEnhancements(){
  replacePodcastHQ()
  enrichBooks()
  enrichBudget()
  enrichWitchy()
}
