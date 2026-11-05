'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import SearchableSelect from '@/app/components/SearchableSelect';
import SortableTable from '@/app/components/SortableTable';
import RecurringChargeModal from '@/app/dashboard/contabilidad/RecurringChargeModal';
import RecurringChargeManageModal from '@/app/dashboard/contabilidad/RecurringChargeManageModal';
import {PropertyService} from '@/app/service/PropertyService';
import {button,input,euros,propertyTypes,type Catalog,type Detail,type Property,type LinkedCharge} from './types';

const empty:Property={id_propiedad:'',tipo:'parking',nombre:'',identificador:'',direccion:'',conjunto:'',plaza:'',direccion_catastral:'',referencia_catastral:'',marca:'',modelo:'',notas:'',activo:true,updated_at:''};
type Props={id:string;catalog:Catalog;onClose:()=>void;onChanged:()=>void;onCreated:(id:string)=>void};
export default function PropertyModal({id,catalog,onClose,onChanged,onCreated}:Props){
 const [value,setValue]=useState<Property>(empty),[detail,setDetail]=useState<Detail|null>(null),[loading,setLoading]=useState(id!=='new');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[chargeId,setChargeId]=useState(''),[ruleId,setRuleId]=useState('all'),[state,setState]=useState<'vigente'|'historico'>('vigente'),[notes,setNotes]=useState(''),[createCharge,setCreateCharge]=useState(false);
 const [manageCharge,setManageCharge]=useState<string|null>(null);
 const closeRef=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLElement>(null),closed=useRef(false);
 const refresh=useCallback(async(signal?:AbortSignal,keepDraft=false)=>{
  const next:Detail=await PropertyService.get(id,signal);
  if(!closed.current){setDetail(next);if(!keepDraft)setValue(next.propiedad);}return next;
 },[id]);
 useEffect(()=>{
  closed.current=false;
  const controller=new AbortController();
  if(id!=='new')refresh(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>{closed.current=true;controller.abort();};
 },[id,refresh]);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  closeRef.current?.focus();
  const key=(event:KeyboardEvent)=>{
   if(createCharge||manageCharge)return;
   if(event.key==='Escape'){event.preventDefault();onClose();}
   if(event.key!=='Tab')return;
   const fields=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]');
   if(!fields?.length)return;
   const first=fields[0],last=fields[fields.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key);previous?.focus();};
 },[onClose,createCharge,manageCharge]);
 const mutate=async(action:()=>Promise<unknown>,success:string)=>{
  setBusy(true);setError('');setMessage('');
  try{await action();onChanged();if(!closed.current){await refresh(undefined,true);setMessage(success);}}
  catch(e:unknown){if(!closed.current)setError(e instanceof Error?e.message:'No se pudo guardar.');}
  finally{if(!closed.current)setBusy(false);}
 };
 const save=async(event:React.FormEvent)=>{
  event.preventDefault();setError('');setMessage('');setBusy(true);
  try{
   const saved:Property=await PropertyService.save(id==='new'?null:id,{...value,expectedVersion:detail?.propiedad.updated_at});
   onChanged();if(!closed.current){if(id==='new')onCreated(saved.id_propiedad);else{setValue(saved);setDetail(d=>d?{...d,propiedad:saved}:d);setMessage('Propiedad guardada.');}}
  }catch(e:unknown){if(!closed.current)setError(e instanceof Error?e.message:'No se pudo guardar la propiedad.');}
  finally{if(!closed.current)setBusy(false);}
 };
 const association=(charge:LinkedCharge,estado:LinkedCharge['estado'])=>mutate(()=>PropertyService.associate(id,{id_cargo_recurrente:charge.id_cargo_recurrente,id_regla:charge.id_regla,estado,notas:charge.notas,expectedVersion:detail?.propiedad.updated_at}),'Vínculo actualizado.');
 const selected=catalog.cargos.find(c=>String(c.id_cargo_recurrente)===chargeId);
 return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="property-title" className="mx-auto my-4 max-w-5xl space-y-6 rounded-xl bg-white p-6 text-slate-900 shadow-xl">
   <header className="flex items-start justify-between gap-4"><div><h2 id="property-title" className="text-xl font-semibold">{id==='new'?'Registrar propiedad':detail?.propiedad.nombre||'Propiedad'}</h2><p className="mt-1 text-sm text-slate-500">Inventario, cargos previstos e historial bancario.</p></div><button ref={closeRef} type="button" aria-label="Cerrar" onClick={onClose} className="cursor-pointer rounded-lg px-3 py-1 text-2xl transition hover:bg-blue-50">×</button></header>
   {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}<button type="button" disabled={loading||busy||id==='new'} className={`${button} ml-3`} onClick={()=>void refresh().then(()=>setError('')).catch(e=>setError(e.message))}>Recargar ficha</button></p>}
   {message&&<p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
   {loading?<p>Cargando propiedad…</p>:<>
    <form onSubmit={save} className="space-y-4">
     <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Nombre<input required maxLength={200} className={input} value={value.nombre} onChange={e=>setValue({...value,nombre:e.target.value})}/></label>
      <label className="text-sm">Tipo<select className={`${input} enabled:cursor-pointer enabled:hover:border-blue-900`} value={value.tipo} onChange={e=>setValue({...value,tipo:e.target.value as Property['tipo']})}>{Object.entries(propertyTypes).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-sm">{value.tipo==='vehiculo'?'Matrícula / identificador':'Plaza / identificador'}<input maxLength={100} className={input} value={value.identificador} onChange={e=>setValue({...value,identificador:e.target.value})}/></label>
      <label className="text-sm sm:col-span-2">Dirección / ubicación<input maxLength={500} className={input} value={value.direccion} onChange={e=>setValue({...value,direccion:e.target.value})}/></label>
      {value.tipo==='parking'&&<><label className="text-sm">Parking / conjunto<input maxLength={200} placeholder="Parking Casp, 50-52" className={input} value={value.conjunto||''} onChange={e=>setValue({...value,conjunto:e.target.value})}/></label><label className="text-sm">Plaza<input maxLength={100} placeholder="A23" className={input} value={value.plaza||''} onChange={e=>setValue({...value,plaza:e.target.value})}/></label><label className="text-sm sm:col-span-2">Dirección catastral<input maxLength={500} className={input} value={value.direccion_catastral||''} onChange={e=>setValue({...value,direccion_catastral:e.target.value})}/></label></>}
      <label className="text-sm">Referencia catastral<input maxLength={100} className={input} value={value.referencia_catastral} onChange={e=>setValue({...value,referencia_catastral:e.target.value})}/></label>
      {value.tipo==='vehiculo'&&<><label className="text-sm">Marca<input maxLength={100} className={input} value={value.marca} onChange={e=>setValue({...value,marca:e.target.value})}/></label><label className="text-sm">Modelo<input maxLength={100} className={input} value={value.modelo} onChange={e=>setValue({...value,modelo:e.target.value})}/></label></>}
      <label className="text-sm">Estado<select value={String(value.activo)} onChange={e=>setValue({...value,activo:e.target.value==='true'})} className={`${input} enabled:cursor-pointer enabled:hover:border-blue-900`}><option value="true">Activa</option><option value="false">Archivada</option></select></label>
      <label className="text-sm sm:col-span-2 lg:col-span-3">Notas<textarea rows={3} maxLength={10000} className={input} value={value.notas} onChange={e=>setValue({...value,notas:e.target.value})}/></label>
     </fieldset>
     <div className="flex justify-end"><button disabled={busy} type="submit" className={`${button} bg-blue-950 text-white enabled:hover:bg-blue-900`}>{busy?'Guardando…':id==='new'?'Registrar propiedad':'Guardar propiedad'}</button></div>
    </form>
    {detail&&<>
     <section className="space-y-3 border-t pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Cargos previstos y recurrentes</h3><button type="button" disabled={busy||!detail.propiedad.activo} onClick={()=>setCreateCharge(true)} className={button}>Crear cargo asociado</button></div>
      <p className="text-sm text-slate-600">Los vínculos reutilizan la previsión existente. Un cargo compartido mantiene un único importe; el vínculo puede limitarse a una regla o plaza.</p>
      {!detail.cargos.length&&<p className="rounded-lg bg-slate-50 p-4 text-sm">Sin cargos asociados.</p>}
      {detail.cargos.map(charge=><article key={charge.id_cargo_recurrente} className="space-y-2 rounded-lg border border-slate-200 p-4">
       <div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">Cargo #{charge.id_cargo_recurrente} · {charge.nombre_proveedor||'Otro'}</strong><span className="text-xs text-slate-600">{charge.estado==='vigente'?'Vínculo vigente':'Histórico'} · {charge.activo?'Activo':'Inactivo'} · {charge.banco_pago||'Sin banco'}</span></div>
       {charge.programacion.map(rule=><p key={rule.id_regla} className="text-sm">{rule.descripcion||'Cargo previsto'} · <strong>{euros(rule.total_iva)}</strong> · {charge.tipo_programacion==='periodicidad'?`Cada ${rule.cada} ${rule.unidad}`:`${rule.dia}/${rule.mes}/${rule.anio||'cada año'}`}</p>)}
       {charge.propiedades_vinculadas>1&&<p className="text-xs text-slate-600">Cargo compartido entre {charge.propiedades_vinculadas} propiedades.{charge.id_regla?' Se muestra solo la regla vinculada a esta propiedad.':''}</p>}
       {charge.notas&&<p className="whitespace-pre-wrap text-sm text-slate-600">{charge.notas}</p>}
       <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} className={button} onClick={()=>setManageCharge(charge.id_cargo_recurrente)}>Editar cargo</button><button type="button" disabled={busy||!detail.propiedad.activo||(charge.estado==='historico'&&!charge.activo)} className={button} onClick={()=>void association(charge,charge.estado==='vigente'?'historico':'vigente')}>{charge.estado==='vigente'?'Marcar histórico':'Marcar vigente'}</button><button type="button" disabled={busy} className={button} onClick={()=>void mutate(()=>PropertyService.detach(id,charge.id_cargo_recurrente,detail.propiedad.updated_at),'Cargo desvinculado; se conserva su previsión.')}>Desvincular</button></div>
      </article>)}
      <fieldset disabled={busy||!detail.propiedad.activo} className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
       <label className="text-sm">Asociar un cargo existente<SearchableSelect label="Cargo previsto existente" value={chargeId} disabled={busy||!detail.propiedad.activo} onChange={id=>{setChargeId(id);setRuleId('all');}} options={catalog.cargos.map(c=>({value:String(c.id_cargo_recurrente),label:`#${c.id_cargo_recurrente} · ${c.nombre_proveedor||'Otro'} · ${c.programacion.map(r=>r.descripcion||'Cargo previsto').join(' / ')}${c.activo?'':' (inactivo)'}`}))}/></label>
       <label className="text-sm">Alcance del vínculo<select value={ruleId} onChange={e=>setRuleId(e.target.value)} className={`${input} enabled:cursor-pointer enabled:hover:border-blue-900`}><option value="all">Cargo completo</option>{selected?.programacion.map(r=><option key={r.id_regla} value={r.id_regla}>{r.descripcion||r.id_regla} · {euros(r.total_iva)}</option>)}</select></label>
       <label className="text-sm">Vigencia<select value={state} onChange={e=>setState(e.target.value as typeof state)} className={`${input} enabled:cursor-pointer enabled:hover:border-blue-900`}><option value="vigente">Vigente</option><option value="historico">Histórico</option></select></label>
       <label className="text-sm">Notas del vínculo<input maxLength={10000} className={input} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
       <div className="flex justify-end sm:col-span-2"><button type="button" disabled={busy||!chargeId||!detail.propiedad.activo} className={button} onClick={()=>void mutate(async()=>{await PropertyService.associate(id,{id_cargo_recurrente:chargeId,id_regla:ruleId==='all'?'':ruleId,estado:state,notas:notes,expectedVersion:detail.propiedad.updated_at});setChargeId('');setRuleId('all');setNotes('');},'Cargo asociado.')}>Asociar cargo</button></div>
      </fieldset>
     </section>
     <section className="space-y-3 border-t pt-5"><h3 className="text-lg font-semibold">Historial bancario</h3><p className="text-sm text-slate-600">Las fechas de operación y valor se conservan por separado. Las devoluciones no crean recurrencia.</p><div className="overflow-x-auto rounded-lg border"><SortableTable className="w-full text-left text-sm"><thead className="bg-slate-100"><tr>{['Operación / valor','Banco','Concepto','Relación','Importe','Revisión'].map(label=><th className="px-3 py-2" key={label}>{label}</th>)}</tr></thead><tbody>{!detail.movimientos.length?<tr><td colSpan={6} className="p-4 text-slate-500">Sin movimientos asociados.</td></tr>:detail.movimientos.map(m=><tr key={m.id_linea_banco} className="border-t"><td className="whitespace-nowrap px-3 py-3">{m.fecha_operativa}<span className="block text-xs text-slate-500">Valor: {m.fecha_valor||'—'}</span></td><td className="px-3 py-3">{m.banco}</td><td className="min-w-56 px-3 py-3"><Link href={`/dashboard/contabilidad/extractos/${encodeURIComponent(m.id_linea_banco)}`} className="cursor-pointer text-blue-900 underline decoration-blue-200 transition hover:text-blue-600 hover:decoration-blue-600">{m.concepto}</Link>{m.notas&&<p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{m.notas}</p>}</td><td className="px-3 py-3 capitalize">{m.relacion}</td><td className="whitespace-nowrap px-3 py-3 text-right">{euros(m.importe)}</td><td className="px-3 py-3">{m.estado_revision?'Revisado':'Pendiente'}</td></tr>)}</tbody></SortableTable></div></section>
    </>}
   </>}
   <footer className="flex justify-end border-t pt-4"><button type="button" className={button} onClick={onClose}>Cerrar</button></footer>
  </section>
  {createCharge&&detail&&<RecurringChargeModal allowedKinds={['proveedor','otro']} providers={catalog.proveedores} endpoint={`/api/v1/direccion/propiedades/${encodeURIComponent(id)}/cargos`} close={()=>setCreateCharge(false)} done={()=>{setCreateCharge(false);onChanged();void refresh(undefined,true).then(()=>setMessage('Cargo creado y asociado.')).catch(e=>setError(e.message));}}/>}
  {manageCharge&&<RecurringChargeManageModal id={manageCharge} action="edit" onClose={()=>setManageCharge(null)} onSaved={()=>{setManageCharge(null);onChanged();void refresh(undefined,true).then(()=>setMessage('Cargo actualizado.')).catch(e=>setError(e.message));}}/>}
 </div>;
}
