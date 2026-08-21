import { PAGE_TEMPLATES, type AtlasPageTemplate, type TemplateBlock } from './templates'

const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value))
const items=(rows:string[])=>rows.map((text,index)=>({id:`dash-${index+1}`,text,done:false}))
const title=(color:string):TemplateBlock=>({type:'heading',config:{systemBinding:'page_title',x:58,y:42,width:650,height:82,zIndex:20,background:'transparent',textColor:color,fontSize:58,fontWeight:600,fontFamily:'Georgia, serif',lineHeight:1,letterSpacing:-1.2,textAlign:'left'}})
const heading=(text:string,x:number,y:number,width=300,color='#2b2722'):TemplateBlock=>({type:'heading',config:{text,x,y,width,height:48,zIndex:12,background:'transparent',textColor:color,fontSize:24,fontWeight:600,fontFamily:'Georgia, serif',lineHeight:1.08,textAlign:'left'}})
const copy=(text:string,x:number,y:number,width:number,height=54,color='#74695e'):TemplateBlock=>({type:'text',config:{text,x,y,width,height,zIndex:9,background:'transparent',textColor:color,fontSize:14,fontWeight:400,fontFamily:'Georgia, serif',lineHeight:1.45,textAlign:'left'}})
const widget=(widgetType:string,x:number,y:number,width:number,height:number,config:Record<string,unknown>={}):TemplateBlock=>({type:'widget',config:{widgetType,x,y,width,height,zIndex:10,background:'transparent',textColor:'#251f1b',primaryColor:'#251f1b',secondaryColor:'#74695e',accentColor:'#6d5874',surfaceColor:'#fffdfa',borderColor:'#d9cec1',widgetBorderWidth:1,widgetRadius:20,widgetPadding:16,radius:20,padding:0,fontFamily:'Georgia, serif',fontSize:14,...config}})

const dashboards:Record<string,AtlasPageTemplate>={
 'witchy-dashboard':{
  id:'witchy-dashboard',name:'Daily Compass',category:'Boards',icon:'✦',description:'A calm everyday dashboard for time, priorities, focus, routines, notes, and what needs your attention now.',settings:{background:'#f2eee7',textColor:'#29231f',canvasHeight:1320},blocks:[
   title('#29231f'),copy('One page for the shape of today, without turning your whole life into a spreadsheet.',60,116,650,44,'#766b62'),
   widget('digital_clock',58,184,210,136,{showDate:false,showSeconds:false,surfaceColor:'#2f2a26',primaryColor:'#fff9f1',secondaryColor:'#cfc4b9',borderColor:'#2f2a26',widgetRadius:26,radius:26}),
   widget('date',292,184,312,136,{dateFormat:'full',surfaceColor:'#ded3c4',primaryColor:'#342b25',secondaryColor:'#776a60',borderColor:'#c7b9a8',widgetRadius:26,radius:26}),
   widget('sticky_note',628,184,318,136,{label:'TODAY',text:'What deserves your attention before everything gets loud?',surfaceColor:'#d8c9da',primaryColor:'#352b38',secondaryColor:'#766b78',borderColor:'#c2b0c4',widgetRadius:26,radius:26}),
   heading('Focus',58,378,220,'#5b465d'),widget('daily_focus',58,426,430,190,{label:'ONE THING',text:'What would make today feel meaningfully moved forward?',surfaceColor:'#fffaf4',borderColor:'#d8cbbd',widgetRadius:20,radius:20}),
   heading('Keep moving',516,378,260,'#5b465d'),widget('checklist',516,426,430,250,{label:'Today\'s rhythm',items:items(['Do the thing that matters most','Handle one small admin task','Take one real break','Close one open loop']),surfaceColor:'#e5ddd2',primaryColor:'#302922',secondaryColor:'#766c62',accentColor:'#6b576f',borderColor:'#cfc3b5',widgetRadius:20,radius:20}),
   heading('Notes to self',58,744,260,'#5b465d'),widget('sticky_note',58,792,430,210,{label:'BRAIN PARKING LOT',text:'Things to remember, ideas that arrived sideways, errands, questions, and loose threads.',surfaceColor:'#e3d3b7',primaryColor:'#3a3025',secondaryColor:'#756654',borderColor:'#ceb38b',widgetRadius:18,radius:18}),
   widget('quote',516,792,430,210,{text:'You do not need to carry the entire week inside one afternoon.',author:'Dashboard reminder',surfaceColor:'#342e35',primaryColor:'#fff8f0',secondaryColor:'#cfc2cc',borderColor:'#342e35',widgetRadius:22,radius:22}),
   heading('Looking ahead',58,1062,260,'#5b465d'),widget('countdown',58,1110,280,160,{label:'Next important thing',showSeconds:false,surfaceColor:'#ddd4c8',primaryColor:'#332b25',secondaryColor:'#766b61',borderColor:'#c7bbad',widgetRadius:20,radius:20}),widget('calendar',366,1110,580,160,{surfaceColor:'#fffaf4',primaryColor:'#302923',secondaryColor:'#766b62',accentColor:'#665477',borderColor:'#d8cbbd',widgetRadius:20,radius:20})
  ]
 },
 'budget-dashboard':{
  id:'budget-dashboard',name:'Life Admin HQ',category:'Boards',icon:'⌂',description:'A practical dashboard for errands, household tasks, appointments, reminders, routines, and the boring things that keep life running.',settings:{background:'#edf0eb',textColor:'#273029',canvasHeight:1320},blocks:[
   title('#273029'),copy('The boring things deserve a beautiful place too.',60,116,560,44,'#68736b'),
   widget('date',58,184,280,130,{dateFormat:'full',surfaceColor:'#dbe3dc',primaryColor:'#2d3931',secondaryColor:'#69776e',borderColor:'#c2cec5',widgetRadius:24,radius:24}),widget('calendar',362,184,584,210,{surfaceColor:'#fbfaf6',primaryColor:'#29322b',secondaryColor:'#6c776f',accentColor:'#5b7565',borderColor:'#d5dad3',widgetRadius:24,radius:24}),
   heading('Household',58,452,240,'#405448'),widget('checklist',58,500,430,270,{label:'Keep the wheels on',items:items(['Groceries / household restock','One cleaning reset','Bills and mail','Appointments or calls','Anything that must leave the house']),surfaceColor:'#fbfaf6',primaryColor:'#29322b',secondaryColor:'#6c776f',accentColor:'#5b7565',borderColor:'#d5dad3',widgetRadius:20,radius:20}),
   heading('Remember this',516,452,260,'#405448'),widget('sticky_note',516,500,430,270,{label:'ADMIN DESK',text:'Renewals, forms, phone calls, things to buy, things to return, people to follow up with, future-you problems worth solving early.',surfaceColor:'#e3d2b6',primaryColor:'#392f25',secondaryColor:'#756553',borderColor:'#ccb189',widgetRadius:20,radius:20}),
   heading('Routine anchors',58,830,260,'#405448'),widget('habit',58,878,280,160,{label:'Daily anchor',surfaceColor:'#dbe4dc',primaryColor:'#29352e',secondaryColor:'#6a786f',accentColor:'#607b69',borderColor:'#c3d0c6',widgetRadius:20,radius:20}),widget('countdown',366,878,280,160,{label:'Next appointment',showSeconds:false,surfaceColor:'#fbfaf6',borderColor:'#d5dad3',widgetRadius:20,radius:20}),widget('sticky_note',674,878,272,160,{label:'ON THE WAY OUT',text:'Keys. Wallet. Water. That thing you absolutely cannot forget.',surfaceColor:'#d7c7d8',primaryColor:'#352b38',secondaryColor:'#766b78',borderColor:'#c1afc3',widgetRadius:20,radius:20}),
   widget('quote',58,1096,888,150,{text:'A system is useful when it helps you stop thinking about the system.',author:'Life admin rule',surfaceColor:'#34413a',primaryColor:'#f8fbf8',secondaryColor:'#c5d0c9',borderColor:'#34413a',widgetRadius:22,radius:22})
  ]
 },
 'book-library':{
  id:'book-library',name:'Cozy Personal HQ',category:'Boards',icon:'☕',description:'A softer dashboard that mixes focus, rest, personal notes, reading, little joys, and enough structure to be useful.',settings:{background:'#efe8dd',textColor:'#302820',canvasHeight:1340},blocks:[
   title('#302820'),copy('Useful enough to run your day. Soft enough to want to open it.',60,116,620,44,'#7b6d61'),
   widget('greeting',58,184,430,150,{name:'friend',subtitle:'What kind of day do you want to have?',surfaceColor:'#fff9f1',primaryColor:'#352b24',secondaryColor:'#806e61',borderColor:'#dccbbb',widgetRadius:24,radius:24}),widget('moon_phase',516,184,200,150,{surfaceColor:'#3a323a',primaryColor:'#fff8ef',secondaryColor:'#cdbfca',borderColor:'#3a323a',widgetRadius:24,radius:24}),widget('sticky_note',744,184,202,150,{label:'LITTLE JOY',text:'Put something here that makes the page feel like yours.',surfaceColor:'#dfc9a8',primaryColor:'#3b2f24',secondaryColor:'#78654f',borderColor:'#c9ae80',widgetRadius:24,radius:24}),
   heading('What matters',58,394,260,'#684f43'),widget('daily_focus',58,442,430,190,{label:'TODAY',text:'Choose one meaningful thing. Everything else can orbit around it.',surfaceColor:'#fff9f1',borderColor:'#dccbbb',widgetRadius:20,radius:20}),heading('Gentle list',516,394,260,'#684f43'),widget('checklist',516,442,430,250,{label:'Things I would like to do',items:items(['One important thing','One practical thing','One nourishing thing','One thing purely because I want to']),surfaceColor:'#e3d6c8',primaryColor:'#342a24',secondaryColor:'#776a61',accentColor:'#8a6256',borderColor:'#d0c1b1',widgetRadius:20,radius:20}),
   heading('Leave it here',58,752,260,'#684f43'),widget('sticky_note',58,800,430,220,{label:'BRAIN DUMP',text:'Thoughts, errands, book titles, podcast ideas, things someone said, random little sparks.',surfaceColor:'#d8cbd4',primaryColor:'#352b32',secondaryColor:'#766a72',borderColor:'#c2b2bd',widgetRadius:20,radius:20}),widget('quote',516,800,430,220,{text:'A life can be organized without becoming clinical.',author:'Personal HQ',surfaceColor:'#44362f',primaryColor:'#fff7ed',secondaryColor:'#d6c5b9',borderColor:'#44362f',widgetRadius:20,radius:20}),
   heading('Tiny rituals',58,1080,260,'#684f43'),widget('habit',58,1128,270,155,{label:'Something for me',surfaceColor:'#fff9f1',accentColor:'#8a6256',borderColor:'#dccbbb',widgetRadius:20,radius:20}),widget('counter',356,1128,270,155,{label:'Little wins',value:0,step:1,surfaceColor:'#e3d6c8',primaryColor:'#342a24',borderColor:'#d0c1b1',widgetRadius:20,radius:20}),widget('countdown',654,1128,292,155,{label:'Something I am looking forward to',showSeconds:false,surfaceColor:'#d8cbd4',primaryColor:'#352b32',borderColor:'#c2b2bd',widgetRadius:20,radius:20})
  ]
 },
 'podcast-hq':{
  id:'podcast-hq',name:'Creator Command Center',category:'Boards',icon:'✎',description:'A cross-project creative dashboard for capturing ideas, choosing the next thing, protecting focus, and keeping several creative threads visible.',settings:{background:'#f0ece6',textColor:'#27221f',canvasHeight:1360},blocks:[
   title('#27221f'),copy('For the person with several good ideas and only one nervous system.',60,116,620,44,'#766b63'),
   widget('digital_clock',58,184,190,130,{showDate:false,showSeconds:false,surfaceColor:'#302b28',primaryColor:'#fff9f1',borderColor:'#302b28',widgetRadius:24,radius:24}),widget('date',272,184,310,130,{dateFormat:'full',surfaceColor:'#ded4c8',primaryColor:'#332b26',borderColor:'#c8bbac',widgetRadius:24,radius:24}),widget('sticky_note',606,184,340,130,{label:'CURRENT SEASON',text:'What are you actually making right now?',surfaceColor:'#d9cdda',primaryColor:'#352b37',secondaryColor:'#776c78',borderColor:'#c3b3c4',widgetRadius:24,radius:24}),
   heading('Capture before it disappears',58,370,360,'#5b465d'),widget('sticky_note',58,418,430,210,{label:'IDEA INBOX',text:'Hooks, scenes, episode thoughts, project ideas, lines, titles, questions, visual concepts, weird sparks.',surfaceColor:'#fffaf4',borderColor:'#d8cbbd',widgetRadius:20,radius:20}),heading('Make next',516,370,240,'#5b465d'),widget('checklist',516,418,430,250,{label:'Creative queue',items:items(['Choose the next concrete output','Do the smallest useful next step','Protect one block of deep work','Leave a note for where to resume']),surfaceColor:'#e4dbd1',primaryColor:'#302922',secondaryColor:'#766c62',accentColor:'#6b576f',borderColor:'#cec1b4',widgetRadius:20,radius:20}),
   heading('Focus desk',58,728,260,'#5b465d'),widget('pomodoro',58,776,280,190,{focusMinutes:25,breakMinutes:5,surfaceColor:'#302b30',primaryColor:'#fff8f1',secondaryColor:'#cbbfc8',accentColor:'#b395b7',borderColor:'#302b30',widgetRadius:22,radius:22}),widget('daily_focus',366,776,580,190,{label:'THE WORK',text:'What are you making during this block, specifically enough that you will know when it is done?',surfaceColor:'#fffaf4',borderColor:'#d8cbbd',widgetRadius:22,radius:22}),
   heading('Project weather',58,1024,260,'#5b465d'),widget('progress_ring',58,1072,260,190,{label:'Current project',value:40,max:100,accentColor:'#765b7c',surfaceColor:'#e0d4e2',primaryColor:'#352c38',borderColor:'#c7b5ca',widgetRadius:22,radius:22}),widget('sticky_note',346,1072,600,190,{label:'RESUME HERE',text:'Write the exact next thought, decision, edit, or action before you stop. Make restarting stupidly easy.',surfaceColor:'#ddcfb7',primaryColor:'#392f24',secondaryColor:'#756653',borderColor:'#c8ae84',widgetRadius:22,radius:22})
  ]
 }
}

export function installDashboardTemplateEnhancements(){
 const ids=Object.keys(dashboards)
 for(const id of ids){
  const index=PAGE_TEMPLATES.findIndex(template=>template.id===id)
  if(index<0)continue
  const original=PAGE_TEMPLATES[index]
  const preservedId=`${id}-page`
  if(!PAGE_TEMPLATES.some(template=>template.id===preservedId)){
   const preserved=clone(original)
   preserved.id=preservedId
   PAGE_TEMPLATES.push(preserved)
  }
  PAGE_TEMPLATES[index]=clone(dashboards[id])
 }
}
