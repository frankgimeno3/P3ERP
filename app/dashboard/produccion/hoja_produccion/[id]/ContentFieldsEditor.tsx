'use client';
import { useEffect, useState } from 'react';
import SearchableSelect from '@/app/components/SearchableSelect';
import DatePartsInput from '@/app/components/DatePartsInput';
import { AgenteService } from '@/app/service/AgenteService';
import { ContenidoService } from '@/app/service/ContenidoService';
import { normalizeProductionDeadline, productionStates } from '@/app/lib/productionContentFields';

type Content = { id_contenido:string; especificaciones_contenido?:string; publicacion_num_web?:string; id_agente?:string; deadline_contenido?:string; estado?:string };
type Agent = { id_agente:string; nombre_completo_agente:string };
export default function ContentFieldsEditor({content,onSaved}:{content:Content;onSaved:(content:any)=>void}) {
  const [draft,setDraft]=useState({especificaciones_contenido:content.especificaciones_contenido||'',publicacion_num_web:content.publicacion_num_web||'',id_agente:content.id_agente||'',deadline_contenido:content.deadline_contenido||'',estado:content.estado||''});
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
      <label>Estado<select className={`${control} enabled:cursor-pointer enabled:hover:border-blue-950`} value={draft.estado} onChange={event=>patch('estado',event.target.value)}><option value="">Sin estado</option>{Array.from(new Set([...productionStates,...(content.estado?[content.estado]:[])])).map(state=><option key={state} value={state}>{state}</option>)}</select></label>
    </fieldset>
    {error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}
    {saved&&<p role="status" className="mt-3 text-green-800">Cambios guardados.</p>}
    <button type="submit" disabled={saving||loadingAgents} className="mt-4 rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{saving?'Guardando…':'Guardar cambios'}</button>
  </form>;
}
