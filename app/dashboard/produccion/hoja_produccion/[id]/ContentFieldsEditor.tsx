'use client';
import { useEffect, useState } from 'react';
import SearchableSelect from '@/app/components/SearchableSelect';
import DatePartsInput from '@/app/components/DatePartsInput';
import { AgenteService } from '@/app/service/AgenteService';
import { ContenidoService } from '@/app/service/ContenidoService';
import { normalizeProductionDeadline } from '@/app/lib/productionContentFields';
import {contentMagazineFormats} from '@/app/lib/contentMagazineFormat';

type Content = { paginas_ocupadas?:number|null;posicion_revista?:number|null; id_contenido:string; especificaciones_contenido?:string; publicacion_num_web?:string; id_agente?:string; deadline_contenido?:string; estado?:string;formato_revista?:string };
type Agent = { id_agente:string; nombre_completo_agente:string };
export default function ContentFieldsEditor({content,onSaved}:{content:Content;onSaved:(content:any)=>void}) {
  const [draft,setDraft]=useState({especificaciones_contenido:content.especificaciones_contenido||'',publicacion_num_web:content.publicacion_num_web||'',id_agente:content.id_agente||'',deadline_contenido:content.deadline_contenido||'',paginas_ocupadas:String(content.paginas_ocupadas??''),posicion_revista:String(content.posicion_revista??''),formato_revista:content.formato_revista||'impreso_digital'});
  const [agents,setAgents]=useState<Agent[]>([]),[loadingAgents,setLoadingAgents]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  useEffect(()=>{let active=true;AgenteService.getAgentes().then((rows:Agent[])=>{if(active)setAgents(Array.from(new Map(rows.map(row=>[row.id_agente,row])).values()));}).catch(()=>{if(active)setError('No se pudieron cargar los agentes. Recarga la página para volver a intentarlo.');}).finally(()=>{if(active)setLoadingAgents(false);});return()=>{active=false;};},[]);
  const patch=(key:keyof typeof draft,value:string)=>{setDraft(previous=>({...previous,[key]:value}));setSaved(false);};
  const submit=async(event:React.FormEvent)=>{event.preventDefault();if(saving)return;setError('');setSaved(false);try{
    const deadline=normalizeProductionDeadline(draft.deadline_contenido);
    if(draft.id_agente&&!agents.some(agent=>agent.id_agente===draft.id_agente))throw new Error('Selecciona un agente válido.');
    setSaving(true);const updated=await ContenidoService.updateContenido(content.id_contenido,{...draft,deadline_contenido:deadline});onSaved(updated);setDraft(previous=>({...previous,deadline_contenido:deadline}));setSaved(true);
  }catch(reason:any){setError(reason.response?.data?.message||reason.message);}finally{setSaving(false);}};
  const control='mt-1 w-full rounded border bg-white p-2 disabled:cursor-not-allowed disabled:bg-gray-100';
  return <form onSubmit={submit} className="mt-4 border-t pt-4 sm:col-span-2 lg:col-span-3">
    <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="sm:col-span-2 lg:col-span-3">Especificaciones<textarea className={control} rows={4} value={draft.especificaciones_contenido} onChange={event=>patch('especificaciones_contenido',event.target.value)}/></label>
      <label>Publicación / Nº web<input className={control} value={draft.publicacion_num_web} onChange={event=>patch('publicacion_num_web',event.target.value)}/></label>
      <div><p className="mb-1">Agente</p><SearchableSelect label="Agente" disabled={saving||loadingAgents} value={draft.id_agente} onChange={value=>patch('id_agente',value)} options={[{value:'',label:'Sin asignar'},...agents.map(agent=>({value:agent.id_agente,label:agent.nombre_completo_agente||'Agente sin nombre'}))]}/></div>
      <DatePartsInput label="Fecha límite" value={draft.deadline_contenido} onChange={value=>patch('deadline_contenido',value)} disabled={saving}/>
      <label>Formato en revista<select className={`${control} enabled:cursor-pointer enabled:hover:border-blue-950`} value={draft.formato_revista} onChange={event=>patch('formato_revista',event.target.value)}>{contentMagazineFormats.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>Páginas ocupadas<input type="number" min="0" step="0.01" className={control} value={draft.paginas_ocupadas} onChange={e=>patch('paginas_ocupadas',e.target.value)}/></label>
      <label>Posición en la revista<input type="number" min="-1" step="1" className={control} value={draft.posicion_revista} onChange={e=>patch('posicion_revista',e.target.value)}/><span className="text-xs text-slate-500">-1: portada; 0: interior de portada; resto: página inicial.</span></label>
    </fieldset>
    {error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}
    {saved&&<p role="status" className="mt-3 text-green-800">Cambios guardados.</p>}
    <button type="submit" disabled={saving||loadingAgents} className="mt-4 rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{saving?'Guardando…':'Guardar cambios'}</button>
  </form>;
}
