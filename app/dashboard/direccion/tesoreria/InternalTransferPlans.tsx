'use client';
import {useEffect,useState} from 'react';
import {request} from '@/app/lib/request';
import InternalTransferModal from './InternalTransferModal';
export default function InternalTransferPlans({revision}:{revision:number}) {
  const [items,setItems]=useState<any[]>([]),[open,setOpen]=useState(false),[error,setError]=useState(''),[saving,setSaving]=useState('');
  useEffect(()=>{const c=new AbortController();request('/api/v1/direccion/bancos/traspasos',{signal:c.signal,cache:'no-store'}).then(async r=>{const result=await r.json();if(!r.ok)throw Error(result.message);setItems(result);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[revision]);
  async function cancel(item:any){setSaving(item.id);setError('');try{const r=await request('/api/v1/direccion/bancos/traspasos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel-plan',planId:item.id,version:item.updated_at})}),b=await r.json();if(!r.ok)throw Error(b.message);window.dispatchEvent(new Event('p3:forecast-changed'));}catch(e:any){setError(e.message);}finally{setSaving('');}}
  return <section className="mt-6 rounded-xl bg-white p-6 shadow"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Traspasos propios puntuales</h2><button type="button" onClick={()=>setOpen(true)} className="cursor-pointer rounded border px-4 py-2 hover:bg-blue-50">Prever traspaso propio</button></div>
    <p className="mt-2 text-sm">La previsión resta en el banco de origen y suma en el de destino, sin cambiar el total. Al revisar el movimiento, asocia su previsión anterior para sustituirla por el realizado.</p>
    {items.filter(i=>i.estado==='previsto').map(item=><article key={item.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded border p-3"><p>{item.fecha} · {item.banco_origen} → {item.banco_destino} · {Number(item.importe).toLocaleString('es-ES',{style:'currency',currency:'EUR'})} · {item.motivo}</p><button type="button" disabled={Boolean(saving)} onClick={()=>cancel(item)} className="rounded border px-3 py-2 enabled:cursor-pointer enabled:hover:bg-red-50 disabled:opacity-50">{saving===item.id?'Cancelando…':'Cancelar previsión'}</button></article>)}
    {error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}{open&&<InternalTransferModal onClose={()=>setOpen(false)} onSaved={()=>setOpen(false)}/>}</section>;
}
