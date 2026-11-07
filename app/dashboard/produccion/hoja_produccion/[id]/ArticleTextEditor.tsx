'use client';
import {useRef,useState} from 'react';
import {ContenidoService} from '@/app/service/ContenidoService';
export default function ArticleTextEditor({content,onSaved}:{content:any;onSaved:(content:any)=>void}){
 const [draft,setDraft]=useState<{titulo_articulo:string;entradilla_articulo:string;texto_articulo:string}>({titulo_articulo:content.titulo_articulo||'',entradilla_articulo:content.entradilla_articulo||'',texto_articulo:content.texto_articulo||''}),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 const input=useRef<HTMLTextAreaElement>(null);
 const patch=(field:string,value:string)=>{setDraft(old=>({...old,[field]:value}));setMessage('');};
 const format=(mark:string)=>{const el=input.current;if(!el)return;const start=el.selectionStart,end=el.selectionEnd;patch('texto_articulo',draft.texto_articulo.slice(0,start)+mark+draft.texto_articulo.slice(start,end)+mark+draft.texto_articulo.slice(end));requestAnimationFrame(()=>{el.focus();el.setSelectionRange(start+mark.length,end+mark.length);});};
 const save=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setMessage('');try{onSaved(await ContenidoService.updateContenido(content.id_contenido,draft));setMessage('Texto guardado.');}catch(e:any){setMessage(e.response?.data?.message||'No se pudo guardar el texto.');}finally{setSaving(false);}};
 const plain=draft.texto_articulo.replace(/\*\*|\*/g,'');
 return <form onSubmit={save} className="mt-5 space-y-3 border-t border-gray-100 pt-4"><h3 className="font-semibold">Texto del artículo</h3><fieldset disabled={saving} className="space-y-3">
  <label className="block text-sm">Título del artículo<input value={draft.titulo_articulo} onChange={e=>patch('titulo_articulo',e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
  <label className="block text-sm">Entradilla<input value={draft.entradilla_articulo} onChange={e=>patch('entradilla_articulo',e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
  <div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor="article-body" className="text-sm">Contenido</label><span className="text-xs text-slate-600">{plain.trim()?plain.trim().split(/\s+/u).length:0} palabras · {Array.from(plain).length} caracteres</span></div>
  <div className="flex gap-2"><button type="button" aria-label="Negrita" onClick={()=>format('**')} className="rounded border px-3 py-1 font-bold enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:opacity-50">N</button><button type="button" aria-label="Cursiva" onClick={()=>format('*')} className="rounded border px-3 py-1 italic enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:opacity-50">C</button></div>
  <textarea ref={input} id="article-body" rows={12} value={draft.texto_articulo} onChange={e=>patch('texto_articulo',e.target.value)} className="w-full rounded border p-3"/>
  <p className="text-xs text-slate-500">Selecciona texto y pulsa N o C. El formato se conserva con **negrita** y *cursiva*.</p>
  {draft.texto_articulo&&<div aria-label="Vista previa del texto" className="whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">{draft.texto_articulo.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part,i)=>part.startsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part.startsWith('*')?<em key={i}>{part.slice(1,-1)}</em>:part)}</div>}
 </fieldset><button disabled={saving} className="rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:opacity-50">{saving?'Guardando…':'Guardar texto'}</button>{message&&<p role="status" className="text-sm">{message}</p>}</form>;
}
