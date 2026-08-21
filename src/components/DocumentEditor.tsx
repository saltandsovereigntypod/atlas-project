import { useEffect, useRef, useState } from 'react'
import { Bold, Heading2, Italic, Link, List, ListOrdered, Minus, Quote, X } from 'lucide-react'
import { getDocument, updateDocument } from '../lib/data'
import type { DocumentObject } from '../types'

export default function DocumentEditor({id,onClose,onSaved}:{id:string;onClose:()=>void;onSaved?:()=>void}){
 const [document,setDocument]=useState<DocumentObject|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState('')
 const editor=useRef<HTMLDivElement>(null)
 useEffect(()=>{getDocument(id).then(setDocument).catch(e=>setError(e instanceof Error?e.message:String(e)))},[id])
 const command=(name:string,value?:string)=>{editor.current?.focus();window.document.execCommand(name,false,value)}
 const save=async()=>{if(!document)return;setSaving(true);try{const next=await updateDocument(id,{title:document.title,body:editor.current?.innerHTML||''});setDocument(next);onSaved?.()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setSaving(false)}}
 if(!document&&!error)return <div className="document-focus"><div className="document-sheet">Opening document…</div></div>
 return <div className="document-focus" role="dialog" aria-modal="true"><div className="document-sheet"><header><input aria-label="Document title" value={document?.title||''} onChange={e=>document&&setDocument({...document,title:e.target.value})}/><div><span>{saving?'Saving…':'Workspace document'}</span><button onClick={()=>{void save().then(onClose)}}><X/></button></div></header>{error&&<p className="document-error">{error}</p>}<nav aria-label="Text formatting"><button onClick={()=>command('formatBlock','h2')} title="Heading"><Heading2/></button><button onClick={()=>command('bold')} title="Bold"><Bold/></button><button onClick={()=>command('italic')} title="Italic"><Italic/></button><button onClick={()=>command('insertUnorderedList')} title="Bullet list"><List/></button><button onClick={()=>command('insertOrderedList')} title="Numbered list"><ListOrdered/></button><button onClick={()=>command('formatBlock','blockquote')} title="Quote"><Quote/></button><button onClick={()=>{const url=window.prompt('Link URL');if(url)command('createLink',url)}} title="Link"><Link/></button><button onClick={()=>command('insertHorizontalRule')} title="Divider"><Minus/></button><button className="document-save" onClick={()=>void save()}>{saving?'Saving…':'Save'}</button></nav><div ref={editor} className="document-body" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{__html:document?.body||'<p>Start writing…</p>'}} onBlur={()=>void save()}/></div></div>
}
