'use client';
import { useState } from 'react';
import SearchableSelect from '@/app/components/SearchableSelect';

const money = (v: any) => Number(v || 0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const day = (s: string) => { const [d,m,y]=String(s || '').split('/').map(Number); return Date.UTC(y,m-1,d)/86400000; };
export default function IncomeReviewFields({ line, draft, remesas, orders, onChange }: { line:any; draft:any; remesas:any[]; orders:any[]; onChange:(value:any)=>void }) {
  const [suggestions,setSuggestions]=useState<string[] | null>(null);
  const available=remesas.filter(r=>!r.cobrada && r.numero_recibos>0 && !r.recibos_sin_orden);
  const selected:string[]=draft.remesaIds || [];
  const match=()=>{
    const ranked=available.filter(r=>Math.round(Number(r.importe_total)*100)===Math.round(Number(line.importe)*100))
      .map(r=>({id:r.id_remesa,distance:Math.abs(day(r.fecha_teorica)-day(line.fecha_valor || line.fecha_operativa))}))
      .filter(r=>Number.isFinite(r.distance) && r.distance<=7).sort((a,b)=>a.distance-b.distance);
    setSuggestions(ranked.filter(r=>r.distance===ranked[0]?.distance).map(r=>r.id));
  };
  return <div className="space-y-3 rounded border border-blue-200 bg-blue-50/30 p-4">
    <h3 className="font-semibold">Ingreso {line.id_linea_banco} · {money(line.importe)} · {line.fecha_valor}</h3>
    <label className="block text-sm font-medium">Tipo de ingreso<select aria-label={'Tipo de ingreso '+line.id_linea_banco} value={draft.incomeType || ''} onChange={e=>{setSuggestions(null);onChange({incomeType:e.target.value,remesaIds:[],orderId:'',entityType:'cliente',entityId:''});}} className="mt-1 w-full cursor-pointer rounded border bg-white p-2 transition hover:border-blue-950"><option value="">Selecciona el tipo</option><option value="transferencia">Transferencia</option><option value="remesa">Remesa</option><option value="otro">Otro</option></select></label>
    {draft.incomeType==='remesa' && <>
      <div className="flex items-end gap-3"><div className="min-w-0 flex-1"><SearchableSelect label="Remesa registrada" value="" onChange={id=>{if(id)onChange({remesaIds:[...selected,id]});}} options={available.filter(r=>!selected.includes(r.id_remesa) && (suggestions===null || suggestions.includes(r.id_remesa))).map(r=>({value:r.id_remesa,label:`${r.id_remesa} · ${money(r.importe_total)} · ${r.fecha_teorica || 'Sin fecha'} · ${r.clientes || ''}`}))} /></div><button type="button" onClick={match} className="cursor-pointer rounded border bg-white px-3 py-2 text-sm transition hover:bg-blue-100">Cuadrar por fecha e importe</button></div>
      {suggestions!==null && <div className="text-sm"><p>{suggestions.length ? `${suggestions.length} coincidencia(s) por importe exacto y fecha más próxima (hasta 7 días). Selecciona y confirma la remesa.` : 'Sin coincidencias por importe exacto y fecha próxima.'}</p><button type="button" onClick={()=>setSuggestions(null)} className="cursor-pointer rounded px-2 py-1 text-blue-950 hover:bg-blue-100">Mostrar todas</button></div>}
      {selected.map(id=><div key={id} className="flex items-center justify-between rounded border bg-white p-2"><span>{id} · {money(remesas.find(r=>r.id_remesa===id)?.importe_total)}</span><button type="button" aria-label={'Quitar remesa '+id} onClick={()=>onChange({remesaIds:selected.filter(value=>value!==id)})} className="cursor-pointer rounded px-2 text-xl hover:bg-red-50">×</button></div>)}
      <p className="text-sm">Total seleccionado: {money(selected.reduce((sum,id)=>sum+Number(remesas.find(r=>r.id_remesa===id)?.importe_total || 0),0))}. Puedes asociar una o varias remesas al movimiento.</p>
    </>}
    {draft.incomeType==='transferencia' && <SearchableSelect required label="Orden de transferencia" value={draft.orderId || ''} onChange={id=>onChange({orderId:id,entityId:orders.find(o=>o.id_orden===id)?.id_cuenta || '',entityType:'cliente'})} options={orders.filter(o=>/transf/i.test(o.forma_cobro || '') && !o.cobrada).map(o=>({value:o.id_orden,label:`${o.id_orden} · ${o.cliente || ''} · ${money(o.cobro_total)} · ${o.fecha_teorica_cobro}`}))} />}
    {draft.incomeType==='otro' && <p className="text-sm">Este ingreso se registrará sin marcar una orden como cobrada.</p>}
  </div>;
}
