'use client';
import {useCallback,useState} from 'react';
import InvoicePaymentsModal from './InvoicePaymentsModal';
export type UnassignedPayment={id_pago:string;date:string;total_pago:string;nombre_planificacion?:string;id_factura_proveedor:string};
export default function UnassignedInvoicePayments({payments,onSaved}:{payments:UnassignedPayment[];onSaved:()=>void}){
 const [selected,setSelected]=useState('');
 const close=useCallback(()=>setSelected(''),[]);
 if(!payments.length)return null;
 return <aside className="my-4 rounded border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold">Pagos de facturas pendientes de banco</h3><p className="text-sm">Estos pagos aún no están incluidos en los totales de ningún banco. Abre cada factura y asigna el banco de sus vencimientos.</p><ul className="mt-2 space-y-2">{payments.map(payment=><li key={payment.id_pago}><button type="button" onClick={()=>setSelected(payment.id_pago)} className="cursor-pointer rounded px-2 py-1 text-left underline hover:bg-amber-100">{payment.nombre_planificacion||`Factura ${payment.id_factura_proveedor}`} · {payment.date} · {Number(payment.total_pago).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</button></li>)}</ul>{selected&&<InvoicePaymentsModal id={selected} onClose={close} onSaved={()=>{close();onSaved();}}/>}</aside>;
}
