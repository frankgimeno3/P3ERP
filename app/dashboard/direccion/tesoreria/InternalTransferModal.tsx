'use client';
import {useEffect,useState} from 'react';
import SearchableSelect from '@/app/components/SearchableSelect';
import DateInputRow from '@/app/components/DateInputRow';
import {request} from '@/app/lib/request';
const button='rounded border px-4 py-2 enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50';
const money=(amount:number)=>Number(amount).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
export default function InternalTransferModal({line,onSaved,onClose}:{line?:any;onSaved:()=>void;onClose:()=>void}) {
  const [data,setData]=useState<any>(null),[counterpart,setCounterpart]=useState(''),[plan,setPlan]=useState(''),[unpaired,setUnpaired]=useState(false);
  const [reason,setReason]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  const [source,setSource]=useState('Sabadell'),[destination,setDestination]=useState('Santander'),[amount,setAmount]=useState(''),[date,setDate]=useState({d:'',m:'',y:''});
  useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc);},[onClose]);
  useEffect(()=>{
    if(!line)return;const controller=new AbortController();
    request(`/api/v1/direccion/bancos/traspasos?id=${encodeURIComponent(line.id_linea_banco)}`,{signal:controller.signal,cache:'no-store'}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.message);setData(body);const prior=body.current?.id_linea_cargo===line.id_linea_banco?body.current?.id_linea_abono:body.current?.id_linea_cargo;setCounterpart(prior||(body.candidates.length===1?body.candidates[0].id_linea_banco:''));setReason(body.current?.motivo||'Traspaso entre cuentas propias');}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();
  },[line]);
  async function confirm(e:React.FormEvent) {
    e.preventDefault();setSaving(true);setError('');
    try {
      const selected=data?.candidates.find((m:any)=>m.id_linea_banco===counterpart);
      const body=line?{action:'review',id:line.id_linea_banco,counterpartId:counterpart||null,planId:plan||null,allowUnpaired:unpaired,reason,versions:{[line.id_linea_banco]:data.line.updated_at,...(selected?{[selected.id_linea_banco]:selected.updated_at}:{})}}:
        {action:'plan',source,destination,amount:Number(amount.replace(',','.')),date:`${date.d.padStart(2,'0')}/${date.m.padStart(2,'0')}/${date.y}`,reason};
      const r=await request('/api/v1/direccion/bancos/traspasos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),result=await r.json();if(!r.ok)throw Error(result.message);
      window.dispatchEvent(new Event('p3:forecast-changed'));onSaved();
    }catch(e:any){setError(e.message);}finally{setSaving(false);}
  }
  return <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/65 p-4"><form role="dialog" aria-modal="true" aria-label="Traspaso propio" onSubmit={confirm} className="my-6 w-full max-w-2xl space-y-4 rounded-xl bg-white p-6 text-slate-900 shadow-xl">
    <header className="flex justify-between gap-4"><h2 className="text-xl font-semibold">{line?'Revisar traspaso propio':'Prever traspaso propio'}</h2><button type="button" aria-label="Cerrar traspaso" className={`${button} text-2xl`} onClick={onClose}>×</button></header>
    <p className="text-sm">Un traspaso mueve dinero entre nuestros bancos. Se revisan las dos líneas juntas y no se genera un ingreso comercial ni un gasto recurrente.</p>
    {line?<><p>{line.banco} · {line.fecha_operativa||line.fecha_valor} · {money(line.importe)}</p><p>{line.concepto}</p>
      {!data&&!error&&<p>Cargando contrapartidas…</p>}{data&&<>
        <SearchableSelect label="Contrapartida del otro banco" value={counterpart} onChange={v=>{setCounterpart(v);setUnpaired(false);}} options={data.candidates.map((m:any)=>({value:m.id_linea_banco,label:`${m.banco} · ${m.fecha_operativa||m.fecha_valor} · ${money(m.importe)} · ${m.concepto}`}))}/>
        {counterpart&&<p className="rounded bg-blue-50 p-3 text-sm">Se marcarán como revisadas esta línea y la contrapartida seleccionada, dentro del mismo traspaso.</p>}
        {!counterpart&&<label className="flex cursor-pointer gap-2 rounded p-2 hover:bg-blue-50"><input type="checkbox" checked={unpaired} onChange={e=>setUnpaired(e.target.checked)} className="cursor-pointer"/>Confirmo que es un traspaso propio y falta la contrapartida en los extractos disponibles.</label>}
        {unpaired&&<p className="text-sm">Esta línea quedará revisada. La contrapartida seguirá sin localizar hasta que esté disponible su extracto; podrás asociarla al mismo traspaso.</p>}
        <SearchableSelect label="Previsión puntual, si ya existía" value={plan} onChange={setPlan} options={[{value:'',label:'Sin previsión anterior'},...data.plans.map((p:any)=>({value:p.id,label:`${p.fecha} · ${money(p.importe)} · ${p.motivo}`}))]}/>
      </>}
    </>:<div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Banco de origen<select value={source} onChange={e=>setSource(e.target.value)} className="mt-1 w-full cursor-pointer rounded border p-2 hover:border-blue-900"><option>Sabadell</option><option>Santander</option></select></label>
      <label className="text-sm">Banco de destino<select value={destination} onChange={e=>setDestination(e.target.value)} className="mt-1 w-full cursor-pointer rounded border p-2 hover:border-blue-900"><option>Sabadell</option><option>Santander</option></select></label>
      <label className="text-sm">Importe<input required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
      <div><p className="text-sm">Fecha prevista</p><DateInputRow>{(['d','m','y'] as const).map(k=><input key={k} aria-label={k==='d'?'dd':k==='m'?'mm':'yyyy'} placeholder={k==='d'?'dd':k==='m'?'mm':'yyyy'} required maxLength={k==='y'?4:2} value={date[k]} onChange={e=>setDate({...date,[k]:e.target.value.replace(/\D/g,'')})} className="min-w-0 w-20 rounded border p-2"/>)}</DateInputRow></div>
    </div>}
    <label className="block text-sm">Motivo<textarea required maxLength={3000} value={reason} onChange={e=>setReason(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
    {error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <footer className="flex justify-end gap-3"><button type="button" className={button} onClick={onClose}>Cancelar</button><button type="submit" disabled={saving||!reason.trim()||Boolean(line&&(!data||(!counterpart&&!unpaired)))} className={button}>{saving?'Guardando…':line?'Confirmar revisión conjunta':'Guardar previsión puntual'}</button></footer>
  </form></div>;
}
