'use client';
import { useEffect, useState, type ReactNode } from 'react';
import SearchableSelect from '@/app/components/SearchableSelect';
import DatePartsInput from '@/app/components/DatePartsInput';
import { AgenteService } from '@/app/service/AgenteService';
import { ContenidoService } from '@/app/service/ContenidoService';
import { normalizeProductionDeadline } from '@/app/lib/productionContentFields';
import {contentMagazineFormats} from '@/app/lib/contentMagazineFormat';

type Content = { paginas_ocupadas?:number|null;posicion_revista?:number|null; id_contenido:string; nombre_contenido?:string; descripcion_contenido?:string; especificaciones_contenido?:string; publicacion_num_web?:string; id_agente?:string; deadline_contenido?:string; estado?:string;formato_revista?:string };
type Agent = { id_agente:string; nombre_completo_agente:string };
export default function ContentFieldsEditor({content,details,onSaved}:{content:Content;details:Array<[string, ReactNode]>;onSaved:(content:any)=>void}) {
  const [draft,setDraft]=useState({descripcion_contenido:content.descripcion_contenido||'',especificaciones_contenido:content.especificaciones_contenido||'',publicacion_num_web:content.publicacion_num_web||'',id_agente:content.id_agente||'-',deadline_contenido:content.deadline_contenido||'',paginas_ocupadas:String(content.paginas_ocupadas??''),posicion_revista:String(content.posicion_revista??''),formato_revista:content.formato_revista||'impreso_digital'});
  const [agents,setAgents]=useState<Agent[]>([]),[loadingAgents,setLoadingAgents]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  useEffect(()=>{let active=true;AgenteService.getAgentes().then((rows:Agent[])=>{if(active)setAgents(Array.from(new Map(rows.map(row=>[row.id_agente,row])).values()));}).catch(()=>{if(active)setError('No se pudieron cargar los agentes. Recarga la página para volver a intentarlo.');}).finally(()=>{if(active)setLoadingAgents(false);});return()=>{active=false;};},[]);
  const patch=(key:keyof typeof draft,value:string)=>{setDraft(previous=>({...previous,[key]:value}));setSaved(false);};
  const submit=async(event:React.FormEvent)=>{event.preventDefault();if(saving)return;setError('');setSaved(false);try{
    const deadline=normalizeProductionDeadline(draft.deadline_contenido);
    if(!draft.id_agente||(draft.id_agente!=='-'&&!agents.some(agent=>agent.id_agente===draft.id_agente)))throw new Error('Selecciona un agente válido.');
    setSaving(true);const updated=await ContenidoService.updateContenido(content.id_contenido,{...draft,id_agente:draft.id_agente==='-'?'':draft.id_agente,deadline_contenido:deadline});onSaved(updated);setDraft(previous=>({...previous,deadline_contenido:deadline}));setSaved(true);
  }catch(reason:any){setError(reason.response?.data?.message||reason.message);}finally{setSaving(false);}};
  const control='mt-1 w-full rounded border bg-white p-2 disabled:cursor-not-allowed disabled:bg-gray-100';
  return <form onSubmit={submit} className="space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">{content.nombre_contenido || content.id_contenido}</h1><p className="text-sm text-slate-600">{content.id_contenido}</p></div>
      <div className="w-full sm:w-72"><p className="mb-1 text-sm">Agente de gestión</p><SearchableSelect label="Agente de gestión" required disabled={saving||loadingAgents} value={draft.id_agente} onChange={value=>patch('id_agente',value)} options={[{value:'-',label:'Sin asignar'},...agents.map(agent=>({value:agent.id_agente,label:agent.nombre_completo_agente||'Agente sin nombre'}))]}/></div>
    </header>
    <fieldset disabled={saving} className="space-y-4 rounded-xl border bg-white p-5">
      <legend className="px-2 text-lg font-semibold">Datos y detalles</legend>
      <div className="grid gap-4 md:grid-cols-2">
        <dl className="space-y-2">{details.map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
        <div className="grid gap-3">
          <label>Descripción<textarea className={control} rows={4} value={draft.descripcion_contenido} onChange={event=>patch('descripcion_contenido',event.target.value)}/></label>
          <label>Especificaciones<textarea className={control} rows={4} value={draft.especificaciones_contenido} onChange={event=>patch('especificaciones_contenido',event.target.value)}/></label>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="grid content-start gap-3 rounded-lg border p-4">
          <h2 className="font-semibold">Otros datos del contenido</h2>
          <label>Publicación / Nº web<input className={control} value={draft.publicacion_num_web} onChange={event=>patch('publicacion_num_web',event.target.value)}/></label>
          <DatePartsInput label="Fecha límite de recepción de materiales" value={draft.deadline_contenido} onChange={value=>patch('deadline_contenido',value)} disabled={saving}/>
        </section>
        <section className="grid gap-3 rounded-lg border p-4">
          <h2 className="font-semibold">Sobre el contenido en la revista</h2>
          <label>Formato en revista<select className={`${control} enabled:cursor-pointer enabled:hover:border-blue-950`} value={draft.formato_revista} onChange={event=>patch('formato_revista',event.target.value)}>{contentMagazineFormats.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label>Páginas ocupadas<input type="number" min="0" step="0.01" className={control} value={draft.paginas_ocupadas} onChange={e=>patch('paginas_ocupadas',e.target.value)}/></label>
          <label>Posición en la revista<input type="number" min="-1" step="1" className={control} value={draft.posicion_revista} onChange={e=>patch('posicion_revista',e.target.value)}/><span className="text-xs text-slate-500">−1: portada. 0: interior de portada.</span></label>
        </section>
      </div>
    </fieldset>
    {error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}
    {saved&&<p role="status" className="mt-3 text-green-800">Cambios guardados.</p>}
    <button type="submit" disabled={saving||loadingAgents} className="mt-4 rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{saving?'Guardando…':'Guardar cambios'}</button>
  </form>;
}
