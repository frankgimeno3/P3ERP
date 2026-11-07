'use client';
import {useEffect,useState} from 'react';
import {productionStates} from '@/app/lib/productionContentFields';
import {productionPhaseName,productionStatesByType} from '@/app/lib/productionWorkflow';
import {ContenidoService} from '@/app/service/ContenidoService';
const names:Record<string,string>={articulos:'Artículo',anuncios:'Anuncio',otros:'Contenido'};
const adStates=new Set(['Contratado pendiente de recibir','Material inválido','Pendiente de gestionar Charly','Material OK - pendiente de publicar','Publicado','Anulado']);
export default function ProductionManagementEditor({content,materials,onSaved}:{content:any;materials:any[];onSaved:(content:any)=>void}){
 const stateKey=JSON.stringify(productionStatesByType(content));
 const [states,setStates]=useState<Record<string,string>>(()=>JSON.parse(stateKey)),[destination,setDestination]=useState(content.correccion_destino||'otros'),[url,setUrl]=useState(content.url_indesign_recurso7||''),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{setStates(JSON.parse(stateKey));setDestination(content.correccion_destino||'otros');setUrl(content.url_indesign_recurso7||'');},[stateKey,content.correccion_destino,content.url_indesign_recurso7]);
 const save=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setMessage('');try{onSaved(await ContenidoService.updateContenido(content.id_contenido,{estados_produccion:states,correccion_destino:destination,url_indesign_recurso7:url,expectedVersion:content.updated_at}));setMessage('Gestión guardada.');}catch(e:any){setMessage(e.response?.data?.message||'No se pudo guardar.');}finally{setSaving(false);}};
 return <section className="mt-6 rounded-xl border border-gray-100 bg-white p-5"><h2 className="text-lg font-semibold">3 · Gestiones de producción</h2>
  {Object.keys(states).map(type=><p key={type} className="mt-2 text-sm text-slate-600">{Object.keys(states).length>1?names[type]+' · ':''}{productionPhaseName({...content,tipo:type,materiales:materials.filter(m=>!m.tipo||m.tipo===type)})}</p>)}
  <form onSubmit={save} className="mt-4 space-y-4"><fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
   {Object.entries(states).map(([type,state])=><label key={type} className="text-sm">{Object.keys(states).length>1?`Estado del ${names[type].toLowerCase()}`:'Estado del contenido'}<select value={state} onChange={e=>setStates(old=>({...old,[type]:e.target.value}))} className="mt-1 w-full rounded border bg-white p-2 enabled:cursor-pointer enabled:hover:border-blue-900"><option value="">Sin estado</option>{productionStates.filter(value=>type!=='anuncios'||adStates.has(value)).map(value=><option key={value}>{value}</option>)}</select></label>)}
   {Object.values(states).includes('Pendiente corrección')&&<label className="text-sm">Destino de corrección<select value={destination} onChange={e=>setDestination(e.target.value)} className="mt-1 w-full rounded border bg-white p-2 enabled:cursor-pointer enabled:hover:border-blue-900"><option value="gm">Corrección GM</option><option value="otros">Corrección otros</option></select></label>}
   <label className="text-sm sm:col-span-2">URL InDesign (Recurso 7)<input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://" className="mt-1 w-full rounded border p-2 focus:border-blue-900 focus:outline-blue-900"/></label>
  </fieldset><div className="flex flex-wrap items-center gap-4"><button disabled={saving} className="rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:opacity-50">Guardar gestión</button>{/^https?:\/\//i.test(content.url_indesign_recurso7||'')&&<a href={content.url_indesign_recurso7} target="_blank" rel="noopener noreferrer" className="cursor-pointer text-blue-900 hover:underline">Abrir InDesign (Recurso 7)</a>}</div>{message&&<p role="status">{message}</p>}</form></section>;
}
