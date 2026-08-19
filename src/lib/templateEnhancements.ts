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
const listItems=(rows:string[])=>rows.map((text,index)=>({id:`enh-${index+1}-${text.slice(0,6)}`,text,done:false}))

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
    widget('checklist',514,474,432,218,{label:'Publishing rhythm',items:listItems(['Confirm episode title and hook','Finish edit and final listen','Write description and show notes','Schedule episode and social posts']),surfaceColor:'#e6ded2',primaryColor:'#302922',secondaryColor:'#766c62',accentColor:'#6b576f',borderColor:'#cfc3b5',widgetRadius:20,widgetPadding:18}),
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
  if(!template.blocks.some(block => block.type === 'widget' && block.config.widgetType === 'quick_capture')){
    template.blocks.push(heading('Quick log',520,1050,180,22,'#5a4035'),widget('quick_capture',520,1090,425,96,{databaseId:'$database',placeholder:'Add a book title…',surfaceColor:'#fffaf3',primaryColor:'#382a22',borderColor:'#d7c7b7',widgetRadius:16}))
  }
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

function addReadingSanctuary(){
  if(PAGE_TEMPLATES.some(item=>item.id==='reading-sanctuary')) return
  PAGE_TEMPLATES.push({
    id:'reading-sanctuary',name:'Reading Sanctuary',category:'Books',icon:'📖',description:'A softer reading home with quick logging, recent books, reading intention, discovery, and a visual shelf.',
    settings:{background:'#eee7dc',textColor:'#2d251f',canvasHeight:1360},
    blocks:[
      title(56,42,650,'#2d251f',56),copy('A quiet place to live with the books you are reading, remembering, and reaching for next.',58,112,610,50,'#7c6d62',14),
      widget('quick_capture',56,188,500,100,{databaseId:'$database',placeholder:'Add a book you do not want to forget…',surfaceColor:'#fffaf2',borderColor:'#d8c7b7',widgetRadius:18}),
      widget('database_count',582,188,170,140,{databaseId:'$database',label:'Books',surfaceColor:'#d7c4b3',primaryColor:'#392d25',secondaryColor:'#77675c',borderColor:'#c3ad9a',widgetRadius:22}),
      widget('random_record',776,188,170,140,{databaseId:'$database',label:'Surprise me',surfaceColor:'#d9ccd4',primaryColor:'#392c34',secondaryColor:'#786a73',borderColor:'#c4b2bc',widgetRadius:22}),
      heading('Recently on the shelf',56,382,360,25,'#654b42'),widget('gallery_strip',56,430,890,230,{databaseId:'$database',limit:6,surfaceColor:'#f8f3ec',borderColor:'#d8cdbf',widgetRadius:20,widgetPadding:16}),
      heading('Reading life',56,714,260,25,'#654b42'),widget('goal',56,760,400,155,{databaseId:'$database',dataMode:'database',aggregate:'count',label:'Books logged this season',max:25,accentColor:'#926a5f',surfaceColor:'#fffaf2',borderColor:'#d8c7b7',widgetRadius:20}),
      widget('sticky_note',484,760,462,155,{label:'READING MOOD',text:'What kind of story, feeling, world, or voice are you hungry for right now?',surfaceColor:'#e3cfae',primaryColor:'#3d2f24',secondaryColor:'#78644e',borderColor:'#cdb287',widgetRadius:20}),
      heading('Recently touched',56,970,300,25,'#654b42'),widget('recent_records',56,1016,430,220,{databaseId:'$database',label:'Recent books',limit:6,surfaceColor:'#3a302d',primaryColor:'#fff8ef',secondaryColor:'#d1c2ba',borderColor:'#3a302d',widgetRadius:20,widgetPadding:18}),
      widget('sticky_note',514,1016,432,220,{label:'BOOK NOTES',text:'A line you loved. A character thought. A recommendation for later. Something a book changed in you.',surfaceColor:'#ddd2c7',primaryColor:'#342a25',secondaryColor:'#74675f',borderColor:'#c6b8ab',widgetRadius:20,widgetPadding:18})
    ]
  })
}

function addMoneyStudio(){
  if(PAGE_TEMPLATES.some(item=>item.id==='money-studio')) return
  PAGE_TEMPLATES.push({
    id:'money-studio',name:'Money Studio',category:'Budget',icon:'◌',description:'A useful money workspace built around fast logging, visibility, commitments, recent activity, and a calmer sense of control.',
    settings:{background:'#edf0e9',textColor:'#253027',canvasHeight:1340},
    blocks:[
      title(56,42,650,'#253027',56),copy('A money system should make the next decision clearer, not make you afraid to open it.',58,112,620,48,'#6c786e',14),
      heading('Log it fast',56,184,220,23,'#405448'),widget('quick_capture',56,226,520,96,{databaseId:'$database',placeholder:'Coffee, groceries, invoice, subscription…',surfaceColor:'#fbfaf5',borderColor:'#d0d7ce',widgetRadius:17}),
      widget('database_count',602,184,160,138,{databaseId:'$database',label:'Transactions',surfaceColor:'#d5dfd5',primaryColor:'#28352d',secondaryColor:'#6a796f',borderColor:'#bdcbbf',widgetRadius:22}),
      widget('sticky_note',788,184,158,138,{label:'MONEY NOTE',text:'What matters this month?',surfaceColor:'#e5d3b9',primaryColor:'#392f25',secondaryColor:'#776754',borderColor:'#ccb28b',widgetRadius:20}),
      heading('Snapshot',56,372,220,25,'#405448'),widget('goal',56,418,420,150,{label:'Spending boundary',value:0,max:2500,accentColor:'#8b6e52',surfaceColor:'#fbfaf5',borderColor:'#d0d7ce',widgetRadius:20}),widget('goal',504,418,442,150,{label:'Savings goal',value:0,max:5000,accentColor:'#607b69',surfaceColor:'#dfe8df',borderColor:'#c2d0c5',widgetRadius:20}),
      heading('Recent money movement',56,626,330,25,'#405448'),widget('mini_table',56,674,890,260,{databaseId:'$database',limit:8,surfaceColor:'#fbfaf5',borderColor:'#d0d7ce',widgetRadius:20,widgetPadding:18}),
      heading('Keep an eye on',56,990,260,25,'#405448'),widget('checklist',56,1036,430,230,{label:'Monthly commitments',items:listItems(['Review recurring bills','Check subscriptions worth keeping','Move money toward savings','Look at upcoming irregular expenses']),surfaceColor:'#fbfaf5',primaryColor:'#283129',secondaryColor:'#6d786f',accentColor:'#607b69',borderColor:'#d0d7ce',widgetRadius:20}),
      widget('sticky_note',514,1036,432,230,{label:'DECISION DESK',text:'What purchase, bill, goal, or tradeoff deserves a real decision instead of another vague worry?',surfaceColor:'#d9e1d7',primaryColor:'#29342d',secondaryColor:'#68766c',borderColor:'#c0cbc2',widgetRadius:20,widgetPadding:18})
    ]
  })
}

function addTravelCommand(){
  if(PAGE_TEMPLATES.some(item=>item.id==='travel-command-center')) return
  PAGE_TEMPLATES.push({
    id:'travel-command-center',name:'Travel Command Center',category:'Travel',icon:'✈',description:'A trip-planning HQ for destinations, dates, packing, loose ideas, reservations, and what is coming next.',
    settings:{background:'#eef0ed',textColor:'#29302d',canvasHeight:1360},
    blocks:[
      title(56,42,650,'#29302d',56),copy('One place for the beautiful part of planning and the boring details that keep the beautiful part possible.',58,112,660,48,'#707a75',14),
      widget('quick_capture',56,188,520,98,{databaseId:'$database',placeholder:'Add a trip, weekend, place, or travel idea…',surfaceColor:'#fffdfa',borderColor:'#d1d7d2',widgetRadius:18}),
      widget('database_count',604,188,160,142,{databaseId:'$database',label:'Trips',surfaceColor:'#d5e0dc',primaryColor:'#2b3934',secondaryColor:'#6e7d77',borderColor:'#bdcdc7',widgetRadius:22}),
      widget('sticky_note',790,188,156,142,{label:'DREAM LIST',text:'Where are you craving?',surfaceColor:'#e8d7b8',primaryColor:'#3b3024',secondaryColor:'#786957',borderColor:'#cfb892',widgetRadius:22}),
      heading('Coming up',56,386,240,25,'#4b6057'),widget('upcoming_records',56,434,430,220,{databaseId:'$database',label:'Upcoming trips',limit:5,surfaceColor:'#fffdfa',borderColor:'#d1d7d2',widgetRadius:20,widgetPadding:18}),
      widget('checklist',514,434,432,220,{label:'Before you leave',items:listItems(['Confirm transportation','Confirm lodging','Save reservation details','Check weather and packing','Download anything needed offline']),surfaceColor:'#e1e7e3',primaryColor:'#2c3732',secondaryColor:'#69776f',accentColor:'#627d70',borderColor:'#c6d0ca',widgetRadius:20}),
      heading('Trip shelf',56,712,220,25,'#4b6057'),widget('gallery_strip',56,760,890,250,{databaseId:'$database',limit:6,surfaceColor:'#f9f7f2',borderColor:'#d6d7d0',widgetRadius:20,widgetPadding:16}),
      heading('Planning desk',56,1064,260,25,'#4b6057'),widget('sticky_note',56,1110,430,180,{label:'LOOSE PLANS',text:'Restaurants, neighborhoods, museums, little shops, walks, daydreams, things someone mentioned once…',surfaceColor:'#d7dfdb',primaryColor:'#2d3732',secondaryColor:'#69736e',borderColor:'#bfcac4',widgetRadius:20}),
      widget('recent_records',514,1110,432,180,{databaseId:'$database',label:'Recently updated trips',limit:5,surfaceColor:'#34413c',primaryColor:'#f7fbf8',secondaryColor:'#c4d0ca',borderColor:'#34413c',widgetRadius:20,widgetPadding:18})
    ]
  })
}

function addGrimoireStudy(){
  if(PAGE_TEMPLATES.some(item=>item.id==='grimoire-study')) return
  PAGE_TEMPLATES.push({
    id:'grimoire-study',name:'Grimoire Study',category:'Witchy',icon:'✧',description:'A research-forward magical workspace for capturing entries, finding correspondences, recent work, notes, and practice.',
    settings:{background:'#eee8df',textColor:'#2d252e',canvasHeight:1360},
    blocks:[
      title(56,42,650,'#2d252e',56),copy('For the things you are learning, practicing, testing, and wanting to find again later.',58,112,640,48,'#766b76',14),
      widget('quick_capture',56,188,520,98,{databaseId:'$database',placeholder:'Capture a ritual, correspondence, question, result…',surfaceColor:'#fffaf4',borderColor:'#d6c9d5',widgetRadius:18}),
      widget('database_count',604,188,160,142,{databaseId:'$database',label:'Entries',surfaceColor:'#d8cddd',primaryColor:'#342c38',secondaryColor:'#786d7c',borderColor:'#c3b5c8',widgetRadius:22}),
      widget('moon_phase',790,188,156,142,{surfaceColor:'#302935',primaryColor:'#fff8ee',secondaryColor:'#cdbfce',borderColor:'#4e4453',widgetRadius:22}),
      heading('Find it again',56,386,260,25,'#5b465d'),widget('search',56,434,430,220,{databaseId:'$database',surfaceColor:'#fffaf4',borderColor:'#d6c9d5',widgetRadius:20,widgetPadding:18}),
      widget('recent_records',514,434,432,220,{databaseId:'$database',label:'Recent workings and notes',limit:6,surfaceColor:'#342d38',primaryColor:'#fff8ef',secondaryColor:'#cbbdcd',borderColor:'#342d38',widgetRadius:20,widgetPadding:18}),
      heading('Practice desk',56,712,260,25,'#5b465d'),widget('checklist',56,760,430,240,{label:'Working rhythm',items:listItems(['Name the question or intention','Record what you actually used','Note timing and conditions','Write what happened afterward','Add what you would change next time']),surfaceColor:'#faf6f0',primaryColor:'#302832',secondaryColor:'#746b76',accentColor:'#6d5874',borderColor:'#d7cec7',widgetRadius:20}),
      widget('sticky_note',514,760,432,240,{label:'OBSERVATIONS',text:'Patterns, dreams, correspondences that keep repeating, things that surprised you, things worth testing again…',surfaceColor:'#ded3c5',primaryColor:'#342b2e',secondaryColor:'#75696a',borderColor:'#c7b8a8',widgetRadius:20,widgetPadding:18}),
      heading('A thread to follow',56,1058,300,25,'#5b465d'),widget('random_record',56,1106,330,170,{databaseId:'$database',label:'Open something unexpected',surfaceColor:'#d9cedd',primaryColor:'#352c39',secondaryColor:'#796e7d',borderColor:'#c2b5c7',widgetRadius:22}),
      widget('sticky_note',414,1106,532,170,{label:'NEXT QUESTION',text:'What do you want to understand more clearly next?',surfaceColor:'#fff9f2',primaryColor:'#332a2e',secondaryColor:'#786c70',borderColor:'#d7c9bd',widgetRadius:20,widgetPadding:18})
    ]
  })
}

export function installTemplateEnhancements(){
  replacePodcastHQ()
  enrichBooks()
  enrichBudget()
  enrichWitchy()
  addReadingSanctuary()
  addMoneyStudio()
  addTravelCommand()
  addGrimoireStudy()
}
