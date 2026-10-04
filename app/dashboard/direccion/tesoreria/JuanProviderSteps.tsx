'use client';
import {useEffect,useState} from 'react';
import SearchableSelect from '@/app/components/SearchableSelect';
import {supplierCountries} from '@/app/data/supplierCountries';

type Provider={id_proveedor:string;nombre_proveedor:string;nombre_fiscal_proveedor:string;vat_code:string;pais_proveedor:string;moneda_proveedor:string};
const endpoint='/api/v1/direccion/prevision-liquidez/vista-juan/proveedor';
const empty={nombre_proveedor:'',nombre_fiscal_proveedor:'',vat_code:'',pais_proveedor:'España',moneda_proveedor:'EUR'};
const button='rounded border px-3 py-2 enabled:cursor-pointer enabled:hover:bg-blue-100 disabled:cursor-default disabled:opacity-50';
export default function JuanProviderSteps({year,bank,rowId,version,providerId,onBack,onSaved,onSelected}:{year:number;bank:string;rowId:string;version:number;providerId?:string|null;onBack:()=>void;onSaved:()=>Promise<void>;onSelected?:(provider:Provider)=>void}) {
 const [providers,setProviders]=useState<Provider[]>([]),[selected,setSelected]=useState(providerId||''),[step,setStep]=useState<'select'|'edit'|'review'>('select'),[creating,setCreating]=useState(false),[draft,setDraft]=useState(empty),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();void fetch(endpoint,{signal:controller.signal,cache:'no-store'}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.message);setProviders(body);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[]);
 const provider=providers.find(p=>p.id_proveedor===selected);
 const edit=(create:boolean)=>{setCreating(create);setDraft(create?empty:{nombre_proveedor:provider?.nombre_proveedor||'',nombre_fiscal_proveedor:provider?.nombre_fiscal_proveedor||'',vat_code:provider?.vat_code||'',pais_proveedor:provider?.pais_proveedor||'',moneda_proveedor:provider?.moneda_proveedor||'EUR'});setStep('edit');setError('');};
 const saveProvider=async()=>{
  setBusy(true);setError('');try{const r=await fetch(endpoint,{method:creating?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({providerId:selected,provider:draft})});const body=await r.json();if(!r.ok)throw Error(body.message);setProviders(list=>[...list.filter(p=>p.id_proveedor!==body.id_proveedor),body]);setSelected(body.id_proveedor);setStep('review');}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{setBusy(false);}
 };
 const associate=async()=>{if(onSelected&&provider){onSelected(provider);return;}setBusy(true);setError('');try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'associate',year,bank,rowId,version,providerId:selected})});const body=await r.json();if(!r.ok)throw Error(body.message);await onSaved();onBack();}catch(e){setError(e instanceof Error?e.message:'No se pudo asociar.');}finally{setBusy(false);}};
 return <section className="mt-4 rounded border border-blue-200 bg-blue-50 p-4">
  <p className="mb-3 text-sm font-semibold">1. Buscar proveedor → 2. Completar ficha si hace falta → 3. Confirmar asociación</p>
  {error&&<p role="alert" className="mb-3 text-sm text-red-800">{error}</p>}
  {step==='select'&&<>
   <SearchableSelect label="Proveedor" value={selected} onChange={setSelected} disabled={busy} options={providers.map(p=>({value:p.id_proveedor,label:p.nombre_proveedor,searchText:`${p.nombre_fiscal_proveedor} ${p.vat_code}`}))}/>
   <div className="mt-3 flex flex-wrap gap-2"><button className={button} disabled={!provider||busy} onClick={()=>setStep('review')}>Usar proveedor seleccionado</button><button className={button} disabled={!provider||busy} onClick={()=>edit(false)}>Modificar ficha seleccionada</button><button className={button} disabled={busy} onClick={()=>edit(true)}>Crear proveedor</button><button className={button} disabled={busy} onClick={onBack}>Volver al desglose</button></div>
  </>}
  {step==='edit'&&<form onSubmit={e=>{e.preventDefault();void saveProvider();}}>
   <h3 className="mb-2 font-semibold">{creating?'Nuevo proveedor':'Modificar proveedor'}</h3>
   {!creating&&<p className="mb-3 text-sm">Los cambios se guardan en la ficha compartida del ERP y se verán también en sus otros cargos.</p>}
   <div className="grid gap-3 sm:grid-cols-2">{([['nombre_proveedor','Nombre del proveedor'],['nombre_fiscal_proveedor','Razón social'],['vat_code','NIF / identificación fiscal'],['moneda_proveedor','Moneda (EUR, USD…)']] as const).map(([key,label])=><label key={key} className="text-sm">{label}<input disabled={busy} required={key==='nombre_proveedor'||key==='moneda_proveedor'} maxLength={key==='moneda_proveedor'?3:300} className="mt-1 w-full rounded border bg-white p-2" value={draft[key]} onChange={e=>setDraft({...draft,[key]:key==='moneda_proveedor'?e.target.value.toUpperCase():e.target.value})}/></label>)}<div className="text-sm">País<SearchableSelect required label="País" disabled={busy} value={draft.pais_proveedor} onChange={pais_proveedor=>setDraft({...draft,pais_proveedor})} options={supplierCountries.map(c=>({value:c.name,label:c.name}))}/></div></div>
   <p className="my-3 text-sm">Si todavía no conoces el NIF o la razón social, puedes dejarlos pendientes. Guardar ficha crea o modifica el proveedor del ERP; su asociación con la previsión se confirma en el paso siguiente.</p>
   <div className="flex gap-2"><button type="submit" disabled={busy} className={button}>Guardar ficha y revisar vínculo</button><button type="button" disabled={busy} className={button} onClick={()=>setStep('select')}>Volver a la búsqueda</button></div>
  </form>}
  {step==='review'&&<><h3 className="font-semibold">Confirmar proveedor</h3><p className="my-3"><strong>{provider?.nombre_proveedor}</strong>{provider?.vat_code?` · ${provider.vat_code}`:' · identificación fiscal pendiente'}</p><p className="mb-3 text-sm">{onSelected?'El siguiente paso define el importe y la frecuencia del nuevo cargo.':'Se conserva el presupuesto del ERP y sus cargos asociados. Elegir un proveedor no crea un segundo gasto.'}</p><div className="flex gap-2"><button disabled={!provider||busy} className={button} onClick={()=>{void associate();}}>{onSelected?'Usar proveedor y continuar':'Guardar asociación'}</button><button disabled={busy} className={button} onClick={()=>setStep('select')}>Volver a la búsqueda</button></div></>}
 </section>;
}
