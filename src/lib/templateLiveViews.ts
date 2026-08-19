import { PAGE_TEMPLATES, type TemplateBlock } from './templates'

const liveView=(x:number,y:number,width:number,height:number,mode:'gallery'|'list'|'rail'|'board'|'table',config:Record<string,unknown>={}):TemplateBlock=>({
  type:'database_view',
  config:{
    databaseId:'$database',mode,recordLayoutMode:'auto',title:'',limit:8,x,y,width,height,zIndex:9,
    background:'transparent',textColor:'#2b2522',radius:0,padding:0,
    inlineEditing:true,allowCreate:false,showLabels:true,showOpenButton:true,
    defaultCardStyle:{background:'#fffdfa',borderColor:'#d8cec2',borderWidth:1,radius:16,textColor:'#2b2522',fontSize:16,fontFamily:'Georgia, serif',fontWeight:600,textAlign:'left',padding:14,shadow:false,gap:7},
    ...config,
  }
})

export function installTemplateLiveViews(){
  const podcast=PAGE_TEMPLATES.find(item=>item.id==='podcast-hq')
  if(!podcast)return
  podcast.blocks=podcast.blocks.map(block=>{
    if(block.type!=='widget')return block
    const type=String(block.config.widgetType||'')
    if(type==='upcoming_records')return liveView(58,474,430,218,'rail',{limit:4,title:'Upcoming episodes',defaultCardStyle:{background:'#fffdfa',borderColor:'#d9cec1',borderWidth:1,radius:18,textColor:'#302922',fontSize:16,fontFamily:'Georgia, serif',fontWeight:600,textAlign:'left',padding:15,shadow:false,gap:7}})
    if(type==='mini_kanban')return liveView(58,838,888,300,'board',{limit:18,allowCreate:true,title:'',defaultCardStyle:{background:'#fffdfa',borderColor:'#d7cec3',borderWidth:1,radius:13,textColor:'#302922',fontSize:14,fontFamily:'Georgia, serif',fontWeight:600,textAlign:'left',padding:11,shadow:false,gap:6}})
    if(type==='recent_records')return liveView(514,1232,432,150,'list',{limit:4,title:'Recently touched episodes',defaultCardStyle:{background:'#302a31',borderColor:'#302a31',borderWidth:1,radius:13,textColor:'#fff9f2',fontSize:14,fontFamily:'Georgia, serif',fontWeight:600,textAlign:'left',padding:10,shadow:false,gap:5}})
    return block
  })
}
