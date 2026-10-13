'use client';
import SearchableSelect from '@/app/components/SearchableSelect';
import {forecastVat} from '@/app/lib/forecastVat';
export default function ForecastVatFields({amount,choice,rate,onChoice,onRate}:{amount:number;choice:string;rate:string;onChoice:(value:string)=>void;onRate:(value:string)=>void}) {
 let calculated:null|ReturnType<typeof forecastVat>=null;try{calculated=forecastVat(amount,choice===''?undefined:choice==='yes',rate.replace(',','.'));}catch{}
 const money=(value:number)=>value.toLocaleString('es-ES',{style:'currency',currency:'EUR'});
 return <fieldset className="my-4 rounded border p-3"><legend className="px-1 text-sm font-medium">¿Contiene IVA?</legend><SearchableSelect required label="¿Contiene IVA?" value={choice} onChange={onChoice} options={[{value:'no',label:'No'},{value:'yes',label:'Sí'}]}/>{choice==='yes'&&<label className="mt-3 block text-sm">Porcentaje de IVA incluido (%)<input required inputMode="decimal" value={rate} onChange={e=>onRate(e.target.value)} className="ml-2 w-24 rounded border p-2"/></label>}{calculated&&<p className="mt-3 text-sm">Base imponible: <strong>{money(calculated.base_imponible)}</strong> · IVA: {money(calculated.importe_iva)} · Total: {money(calculated.total_iva)}</p>}</fieldset>;
}
