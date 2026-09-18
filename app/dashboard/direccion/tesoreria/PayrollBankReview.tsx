'use client';
import { useState } from 'react';
import BankReviewWizard from './BankReviewWizard';
import { reviewButton as button } from './RecurringChargeForm';
export default function PayrollBankReview({ line, employeeId, onSaved }: { line:any; employeeId:string; onSaved:()=>void }) {
  const [open,setOpen]=useState(false),[all,setAll]=useState<any[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const start=async()=>{setLoading(true);setError('');try{const r=await fetch('/api/v1/direccion/bancos',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.message);setAll(d);setOpen(true);}catch(e:any){setError(e.message);}finally{setLoading(false);}};
  return <section className="mt-4 space-y-3 rounded border border-blue-200 bg-blue-50 p-4"><h3 className="font-semibold">Revisión de nómina</h3>{line.estado_revision?<p>Movimiento revisado. Para volver a revisarlo, márcalo como NO revisado desde el listado de revisión.</p>:<button type="button" disabled={loading} className={button} onClick={start}>{loading?'Cargando…':'Revisar nómina en cinco fases'}</button>}{error&&<p role="alert" className="text-red-700">{error}</p>}{open&&<BankReviewWizard lines={[all.find(r=>r.id_linea_banco===line.id_linea_banco)||line]} initialEmployeeId={employeeId} all={all} modal onClose={()=>setOpen(false)} onSaved={()=>{setOpen(false);onSaved();}} />}</section>;
}
