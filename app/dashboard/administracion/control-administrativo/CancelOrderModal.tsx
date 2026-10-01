'use client';
import {useEffect,useRef,useState} from 'react';
import {OrdenService} from '@/app/service/OrdenService';
const button='rounded border px-4 py-2 enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:opacity-50';
export default function CancelOrderModal({idOrden,onClose,onCancelled}:{idOrden:string;onClose:()=>void;onCancelled:(order:any)=>void}){
  const [phase,setPhase]=useState(1),[plan,setPlan]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  async function review(){setBusy(true);setError('');try{setPlan(await OrdenService.previewCancellation(idOrden));setPhase(2);}catch(e:any){setError(e?.data?.detail||e?.message||'No se pudo comprobar la cancelación.');}finally{setBusy(false);}}
  async function confirm(){setBusy(true);setError('');try{onCancelled(await OrdenService.cancelOrden(idOrden,plan.version));}catch(e:any){setError(e?.data?.detail||e?.message||'No se pudo cancelar.');setPhase(1);setPlan(null);}finally{setBusy(false);}}
  return <dialog ref={dialog} onCancel={event=>{event.preventDefault();onClose();}} className="m-auto w-[min(95vw,640px)] rounded-xl p-6 text-gray-700 shadow-xl backdrop:bg-black/40" aria-labelledby="cancel-order-title">
    <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-sm text-gray-500">Fase {phase} de 2</p><h2 id="cancel-order-title" className="text-xl font-semibold text-blue-950">Cancelar orden {idOrden}</h2></div><button type="button" aria-label="Cerrar" onClick={onClose} className="cursor-pointer rounded px-3 py-1 text-2xl hover:bg-gray-100">×</button></div>
    {phase===1?<div className="space-y-3"><p>La orden pasará a <strong>Cancelada</strong> y se conservará en el control administrativo.</p><p>Se eliminarán sus recibos y su factura pendiente, si no está compartida con otras órdenes. Sus transferencias pendientes dejarán de aparecer como ingresos previstos.</p><p>Una factura compartida se conservará. Si existen cobros confirmados o una factura emitida o contabilizada, tendrás que resolverlos antes de cancelar.</p></div>:<div className="space-y-3">
      <h3 className="font-semibold">Revisa los documentos afectados</h3><p>Recibos que se eliminarán: {plan.recibos.length||'ninguno'}.</p>
      {plan.recibos.length>0&&<ul className="max-h-40 list-disc overflow-auto pl-5">{plan.recibos.map((r:any)=><li key={r.numero_recibo}>{r.numero_recibo}{r.id_remesa?` · Remesa ${r.id_remesa}`:''}</li>)}</ul>}
      <p>{plan.factura?`Factura ${plan.factura.numero}: ${plan.factura.accion==='eliminar'?'se eliminará y se conservará una copia en el historial de la orden':'se conservará porque está compartida'}.`:'Sin factura asociada.'}</p>
      {plan.factura?.otras_ordenes?.length>0&&<p className="text-sm">Otras órdenes: {plan.factura.otras_ordenes.join(', ')}.</p>}
      {plan.transferencia_pendiente&&<p>Se retirará la transferencia pendiente de las previsiones.</p>}<p>La orden conservará sus datos y dejará de sumar en la previsión de liquidez.</p>
      {plan.bloqueos.map((message:string)=><p key={message} role="alert" className="rounded bg-amber-50 p-3 text-amber-900">{message}</p>)}
    </div>}
    {error&&<p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} className={button} onClick={phase===1?onClose:()=>setPhase(1)}>{phase===1?'Volver a la orden':'Atrás'}</button>{phase===1?<button type="button" disabled={busy} className={button+' bg-blue-950 text-white enabled:hover:bg-blue-800'} onClick={review}>{busy?'Comprobando…':'Revisar cancelación'}</button>:<button type="button" disabled={busy||plan.bloqueos.length>0} className={button+' bg-red-700 text-white enabled:hover:bg-red-800'} onClick={confirm}>{busy?'Cancelando…':'Confirmar cancelación'}</button>}</div>
  </dialog>;
}
