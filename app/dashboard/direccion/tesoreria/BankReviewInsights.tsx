'use client';
import { useEffect, useState, type ReactNode } from 'react';
import SearchableSelect from '@/app/components/SearchableSelect';
import { reviewButton as button } from './RecurringChargeForm';

export type ReviewMemoryPlan = { allocations: any[]; decisions: any[] };
const money = (v: any) => Number(v || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const endpoint = '/api/v1/direccion/bancos/revision/memoria';
const analysisTitle = 'Análisis de potenciales riesgos de duplicado o error';
function AnalysisItem({ title, summary, children, warning = false }: { title: string; summary: string; children: ReactNode; warning?: boolean }) {
  return <section className={`rounded-lg border p-2 ${warning?'border-amber-300 bg-amber-50/40':'border-slate-200 bg-white'}`}>
    <h4 className="p-2 font-semibold">{title}</h4><p className="px-2 pb-2 text-sm text-slate-600">{summary}</p>
    <div className="space-y-3 border-t border-slate-200 p-3">{children}</div>
  </section>;
}
export default function BankReviewInsights({ lines, drafts, preview, phase, plan, onPlan, disabled = false }: {
  lines: any[]; drafts: any; preview: boolean; phase: number; plan: ReviewMemoryPlan;
  onPlan: (value: ReviewMemoryPlan) => void; disabled?: boolean;
}) {
  const [data, setData] = useState<any>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  const [reasons, setReasons] = useState<Record<string, string>>({}), [reuse, setReuse] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, any[]>>({});
  const request = JSON.stringify({ ids: lines.map(l=>l.id_linea_banco), drafts: preview ? lines.map(l=>({id:l.id_linea_banco,entityType:drafts[l.id_linea_banco]?.entityType,entityId:drafts[l.id_linea_banco]?.entityId,chargeId:drafts[l.id_linea_banco]?.chargeId})) : [], allocations: plan.allocations });
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError('');
    fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:request, signal:controller.signal, cache:'no-store' })
      .then(async r=>{const result=await r.json();if(!r.ok || !Array.isArray(result.alerts))throw Error(result.message || 'No se pudo cargar la comparación.');return result;})
      .then(result=>setData(result))
      .catch(e=>{if(e.name!=='AbortError')setError(e.message);})
      .finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return ()=>controller.abort();
  }, [request, revision]);
  const mutate = async (body:any) => {
    setBusy(true);setError('');
    try {const r=await fetch(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,ids:lines.map(l=>l.id_linea_banco),token:data.token})});const result=await r.json();if(!r.ok)throw Error(result.message);setData(result);setRevision(v=>v+1);}
    catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  const selectedIds = new Set(lines.map(l=>l.id_linea_banco));
  const visibleHistory = data?.history.filter((h:any)=>h.occurrenceId||h.ids.some((id:string)=>!selectedIds.has(id))) || [];
  const lineLinks = (ids:string[], movementId:string) => ids.filter(id=>!selectedIds.has(id)).map(id=>{
    const l=data.lines.find((row:any)=>row.id_linea_banco===id);
    const reasons=data.coincidences?.[movementId]?.[id] || [];
    return <div key={id} className="rounded border border-slate-200 p-2"><p className="px-2 text-sm font-medium text-slate-700">Coincidencia: {reasons.length?reasons.join(' · '):'Incluido en la misma incidencia'}</p><a href={`/dashboard/direccion/tesoreria/extractos/${encodeURIComponent(id)}`} target="_blank" rel="noopener noreferrer" className="block cursor-pointer rounded p-2 text-sm text-blue-950 hover:bg-blue-100">{l?`${l.fecha_valor} · ${money(l.importe)} · ${l.concepto} · ${id}`:id} ↗</a></div>;
  });
  const planned = (alert:any) => plan.decisions.find(d=>d.key===alert.key && d.fingerprint===alert.fingerprint);
  const pendingAlerts = data?.alerts.filter((a:any)=>!planned(a)) || [];
  const summary = <><span>{analysisTitle}</span>{data && <span className="mt-1 block text-sm font-normal text-slate-600">{pendingAlerts.length?`${pendingAlerts.length} aviso(s) por comprobar.`:'Sin avisos pendientes.'} {visibleHistory.length>0?`${visibleHistory.length} comparación(es) o previsión(es) para consultar.`:''}</span>}</>;
  const content = <div className="space-y-4">
    {busy && <p role="status">Actualizando comparación…</p>}
    {error && <div role="alert" className="rounded bg-amber-50 p-3"><p>{error}</p><button type="button" className={button} onClick={()=>setRevision(v=>v+1)} disabled={busy}>Reintentar comparación</button></div>}
    {data && <>
      {!pendingAlerts.length && <p className="rounded bg-green-50 p-3">No hay avisos pendientes con los datos disponibles.{plan.decisions.length>0 && ' Las decisiones preparadas se guardarán al confirmar la revisión.'}</p>}
      {plan.decisions.filter(d=>!data.alerts.some((a:any)=>a.key===d.key&&a.fingerprint===d.fingerprint)).map(d=><div key={d.key} role="alert" className="rounded bg-amber-50 p-3">Una decisión preparada ha quedado desactualizada. Retírala y comprueba los avisos actuales.<button className={button} onClick={()=>onPlan({...plan,decisions:plan.decisions.filter(p=>p.key!==d.key)})}>Retirar decisión</button></div>)}
      {lines.map(movement=>{
        const movementId=movement.id_linea_banco;
        const charge=String((preview?drafts[movementId]?.chargeId:movement.id_cargo_recurrente)||'');
        const alerts=data.alerts.filter((a:any)=>a.ids.includes(movementId));
        const pending=alerts.filter((a:any)=>!planned(a));
        const resolved=data.resolved.filter((r:any)=>r.ids.includes(movementId));
        const notes=data.notes.filter((n:any)=>charge&&String(n.chargeId)===charge);
        const criteria=data.criteria.filter((c:any)=>charge&&c.condiciones?.charges?.some(([id]:any[])=>String(id)===charge));
        const history=visibleHistory.filter((h:any)=>h.ids.includes(movementId)||h.occurrenceId&&data.occurrences.some((o:any)=>o.id===h.occurrenceId&&charge&&String(o.id_cargo_recurrente)===charge));
        const status=pending.length?'Posibles incidencias por revisar':notes.length?'Análisis incompleto: faltan datos':'Sin incidencias pendientes detectadas';
        return <details key={movementId} aria-label={`Análisis de ${movementId}`} className={`rounded-lg border p-3 ${pending.length?'border-amber-300':'border-slate-200'}`}>
          <summary className="cursor-pointer rounded p-2 hover:bg-blue-50"><span className="font-semibold">{movement.fecha_valor} · {money(movement.importe)} · {movement.concepto||'Sin concepto'}</span><span className="mt-1 block text-sm text-slate-600">{status}.{pending.length>0&&` ${pending.length} aviso(s).`}{history.length>0&&` ${history.length} comparación(es) o previsión(es) relacionada(s).`}</span><span className="mt-1 block break-all text-xs text-slate-600">Referencia: {movementId}</span></summary>
          <div className="mt-3 space-y-3 border-t pt-3">
            <p className={`rounded p-3 ${pending.length||notes.length?'bg-amber-50':'bg-green-50'}`}>{pending.length?`Este movimiento tiene ${pending.length} aviso(s) que podrían indicar un duplicado, una diferencia de importe o un problema de asociación. Revisa los motivos antes de decidir.`:notes.length?'No hay avisos pendientes, pero faltan datos de su programación para completar la comprobación de vencimientos.':resolved.length||alerts.length?'Las incidencias de este movimiento están explicadas o tienen una decisión preparada. No quedan avisos pendientes con los datos disponibles.':'No se han detectado incidencias para este movimiento con los datos disponibles.'}</p>
            {!pending.length&&history.length>0&&<p className="text-sm text-slate-600">Hay información relacionada para contrastar este movimiento. Una coincidencia histórica o una previsión sin asociar no demuestra por sí sola un duplicado ni un impago.</p>}
      {alerts.map((alert:any)=><AnalysisItem key={alert.key} title={alert.title} summary={`${alert.ids.length} movimiento(s) implicado(s). ${planned(alert)?'Decisión preparada para confirmar.':'Pendiente de comprobar.'}`} warning><p>{alert.detail}</p>{lineLinks(alert.ids,movementId)}
        {alert.ids.length>1&&<p className="text-sm text-slate-600">Este aviso afecta a varios movimientos. La decisión se comparte entre ellos; los que ya están seleccionados tienen su propio análisis y no se repiten como relacionados.</p>}
        {planned(alert) ? <><p>Decisión preparada: {planned(alert).reason}</p><button type="button" disabled={disabled||busy} className={button} onClick={()=>onPlan({...plan,decisions:plan.decisions.filter(d=>d.key!==alert.key)})}>Deshacer decisión preparada</button></> : <>
          {alert.type==='repeat' && <a href="/dashboard/direccion/tesoreria/extractos/conciliacion/duplicados" target="_blank" rel="noopener noreferrer" className="inline-block cursor-pointer rounded p-2 text-blue-950 hover:bg-blue-100">Gestionar duplicados ↗</a>}
          <label className="block">Motivo para aceptar este aviso<textarea aria-label={`Motivo ${alert.key} para ${movementId}`} maxLength={3000} rows={2} value={reasons[alert.key]||''} onChange={e=>setReasons({...reasons,[alert.key]:e.target.value})} className="mt-1 w-full rounded border bg-white p-2" disabled={disabled||busy}/></label>
          {alert.reusable && <label className="flex items-center gap-2"><input type="checkbox" className="enabled:cursor-pointer enabled:hover:ring-2" checked={!!reuse[alert.key]} onChange={e=>setReuse({...reuse,[alert.key]:e.target.checked})} disabled={disabled||busy}/>Aplicar a futuros recibos de estos mismos cargos, con iguales importes, conceptos y cantidad de movimientos, separados por hasta 10 días.</label>}
          <button type="button" className={button} disabled={disabled||busy||!reasons[alert.key]?.trim()} onClick={()=>onPlan({...plan,decisions:[...plan.decisions.filter(d=>d.key!==alert.key),{key:alert.key,fingerprint:alert.fingerprint,reason:reasons[alert.key],reuse:!!reuse[alert.key]}]})}>Aceptar aviso al confirmar revisión</button>
        </>}
      </AnalysisItem>)}
      {(phase===1||phase===3||phase===4) && data.occurrences.some((o:any)=>String(o.id_cargo_recurrente)===charge&&!o.orphaned) && <details className="rounded border p-3"><summary className="cursor-pointer rounded p-2 font-semibold hover:bg-blue-50">Asociar este movimiento a vencimientos</summary><p className="my-2 text-sm">Puedes repartir un movimiento entre varios vencimientos o aplicar un pago parcial. Se guarda junto con la revisión; asociar no marca el movimiento como revisado.</p>
        {[movement].filter(l=>Number(l.importe)<0).map(line=>{
          const id=line.id_linea_banco, charge=preview?drafts[id]?.chargeId:line.id_cargo_recurrente;
          const options=data.occurrences.filter((o:any)=>String(o.id_cargo_recurrente)===String(charge)&&!o.orphaned);
          if(!options.length)return null;
          const values=editing[id] || plan.allocations.find(a=>a.lineId===id)?.allocations || data.applications.filter((a:any)=>a.id_linea_banco===id).map((a:any)=>({id:a.id_vencimiento,amount:a.importe}));
          const change=(next:any[])=>setEditing({...editing,[id]:next});
          const total=values.reduce((n:number,a:any)=>n+Number(a.amount||0),0);
          return <section key={id} className="my-3 space-y-2 rounded border p-3"><h4>{line.fecha_valor} · {money(line.importe)} · {id}</h4>
            {values.map((value:any,index:number)=><div key={index} className="flex flex-wrap items-end gap-2"><div className="min-w-64 flex-1"><SearchableSelect label={`Vencimiento ${id} ${index+1}`} value={value.id} disabled={disabled||busy} onChange={chosen=>change(values.map((a:any,i:number)=>i===index?{...a,id:chosen}:a))} options={options.filter((o:any)=>o.id===value.id||!values.some((a:any)=>a.id===o.id)).map((o:any)=>({value:o.id,label:`${o.fecha} · ${o.descripcion} · ${money(o.importe)} · sin aplicar ${money(o.remaining)}`}))}/></div><label>Importe<input aria-label={`Importe aplicado ${id} ${index+1}`} type="number" min="0.01" step="0.01" value={value.amount} disabled={disabled||busy} className="block w-32 rounded border p-2" onChange={e=>change(values.map((a:any,i:number)=>i===index?{...a,amount:e.target.value}:a))}/></label><button type="button" className={button} disabled={disabled||busy} onClick={()=>change(values.filter((_:any,i:number)=>i!==index))}>Quitar</button></div>)}
            <p>Aplicado: {money(total)} · Por aplicar: {money(Math.abs(Number(line.importe))-total)}</p>
            <button type="button" disabled={disabled||busy} className={button} onClick={()=>change([...values,{id:'',amount:Math.max(0,Math.abs(Number(line.importe))-total).toFixed(2)}])}>Añadir vencimiento</button>{' '}
            <button type="button" className={button} disabled={disabled||busy||values.some((a:any)=>!a.id||!(Number(a.amount)>0))||Math.round(total*100)>Math.round(Math.abs(Number(line.importe))*100)} onClick={()=>{onPlan({...plan,allocations:[...plan.allocations.filter(a=>a.lineId!==id),{lineId:id,allocations:values}]});setEditing(current=>{const next={...current};delete next[id];return next;});}}>Preparar asociaciones</button>
            {plan.allocations.some(a=>a.lineId===id)&&<p className="text-sm text-green-800">Asociaciones preparadas para confirmar junto con la revisión.</p>}
          </section>;
        })}
      </details>}
      {resolved.map((r:any,i:number)=><AnalysisItem key={r.key||`resolved-${i}`} title={r.title} summary={`${r.ids.length} movimiento(s) explicado(s). No requiere una nueva decisión.`}><p>{r.reason}</p>{lineLinks(r.ids,movementId)}{r.decisionId&&!preview&&<button type="button" disabled={disabled||busy} className={button} onClick={()=>void mutate({action:'revoke-decision',decisionId:r.decisionId})}>Reabrir aviso</button>}</AnalysisItem>)}
      {criteria.map((c:any)=><AnalysisItem key={c.id} title="Criterio de revisión guardado" summary={c.motivo}><p>Este criterio se utiliza para reconocer futuras situaciones que cumplan las condiciones aceptadas. Puedes dejar de aplicarlo sin borrar la decisión histórica.</p><p className="text-sm">Guardado el {new Date(c.created_at).toLocaleDateString('es-ES')} · {c.actor||'Usuario registrado sin identificador'}</p>{!preview&&<button type="button" disabled={disabled||busy} className={button} onClick={()=>void mutate({action:'revoke-criterion',criterionId:c.id})}>Dejar de aplicar criterio</button>}</AnalysisItem>)}
      {notes.map((n:any,i:number)=><AnalysisItem key={`note-${i}`} title="Programación pendiente de completar" summary={`Cargo previsto ${n.chargeId}: falta la fecha de inicio.`}><p>{n.message}</p><a className="inline-block cursor-pointer rounded p-2 text-blue-950 hover:bg-blue-50" href={`/dashboard/direccion/tesoreria/cargos-recurrentes/${n.chargeId}`} target="_blank" rel="noopener noreferrer">Completar programación ↗</a></AnalysisItem>)}
      {history.map((h:any,i:number)=>{
        const related=h.ids.filter((id:string)=>!selectedIds.has(id)).map((id:string)=>data.lines.find((l:any)=>l.id_linea_banco===id)).filter(Boolean);
        const short=h.occurrenceId?'Hay un importe previsto que todavía no tiene un movimiento asociado.':related.length?related.map((l:any)=>`${l.fecha_valor} · ${money(l.importe)}`).join(' / '):'Movimientos relacionados en el histórico.';
        return <AnalysisItem key={`history-${i}`} title={h.occurrenceId?'Previsión sin asociar':`Comparación de ${h.ids.length} movimientos relacionados`} summary={short}><p>{h.detail}</p>{!h.occurrenceId&&<p className="text-sm text-slate-600">Esta relación aporta contexto para tu revisión; por sí sola no indica un cobro duplicado.</p>}{lineLinks(h.ids,movementId)}</AnalysisItem>;
      })}
          </div></details>;
      })}
      {phase===5&&(plan.allocations.length>0||plan.decisions.length>0)&&<p>{plan.allocations.length} movimiento(s) con asociaciones preparadas y {plan.decisions.length} decisión(es). Se guardarán en la misma operación que la revisión.</p>}
    </>}
  </div>;
  if (![1,3,4,5].includes(phase)) return null;
  if (phase===1) return <section aria-label={analysisTitle} className="my-4 rounded-lg border p-3"><h3 className="p-2 font-semibold">{summary}</h3><div className="mt-3">{content}</div></section>;
  return <details aria-label={analysisTitle} className="my-4 rounded-lg border p-3" open={pendingAlerts.length>0||!!error}><summary className="cursor-pointer rounded p-2 font-semibold hover:bg-blue-50">{summary}</summary><div className="mt-3">{content}</div></details>;
}
