'use client';
import {useEffect,useRef,useState} from 'react';
import {FacturaService} from '@/app/service/FacturaService';
export default function DeleteDraftModal({invoice,onClose,onDeleted}:{invoice:any;onClose:()=>void;onDeleted:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{dialog.current?.showModal();},[]);
  async function confirm(){setBusy(true);setError('');try{await FacturaService.deleteFacturaCliente(invoice.id_factura_cliente,invoice.updated_at);onDeleted();}catch(e:any){setError(e?.data?.detail||e?.message||'No se pudo eliminar la factura.');}finally{setBusy(false);}}
  return <dialog ref={dialog} onCancel={event=>{event.preventDefault();onClose();}} aria-labelledby="delete-draft-title" className="m-auto w-[min(95vw,560px)] rounded-xl p-6 text-gray-700 shadow-xl backdrop:bg-black/40">
    <div className="mb-4 flex items-center justify-between gap-3"><h2 id="delete-draft-title" className="text-lg font-semibold text-red-800">Eliminar factura borrador {invoice.numero_factura||invoice.id_factura_cliente}</h2><button type="button" onClick={onClose} aria-label="Cerrar" className="cursor-pointer rounded px-2 text-2xl hover:bg-gray-100">×</button></div>
    <p>Se eliminarán la factura y sus líneas. Esta acción no se puede deshacer.</p><p className="mt-3">Se conservarán los contratos, las órdenes y los recibos. Las órdenes quedarán sin factura asociada y podrán vincularse a una nueva.</p>
    {error&&<p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="cursor-pointer rounded border px-4 py-2 hover:bg-gray-50">Volver</button><button type="button" disabled={busy} onClick={confirm} className="rounded bg-red-700 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-red-800 disabled:opacity-50">{busy?'Eliminando…':'Eliminar borrador'}</button></div>
  </dialog>;
}
