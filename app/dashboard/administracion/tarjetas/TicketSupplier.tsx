'use client';
import SearchableSelect from '@/app/components/SearchableSelect';
import {supplierCountries} from '@/app/data/supplierCountries';
import {input} from './CardComponents';
export const emptySupplier={nombre_proveedor:'',nombre_fiscal_proveedor:'',vat_code:'',pais_proveedor:'',moneda_proveedor:'EUR'};
export default function TicketSupplier({value,onChange}:{value:typeof emptySupplier;onChange:(v:typeof emptySupplier)=>void}){
  return <fieldset className="grid gap-3 rounded border p-4 sm:grid-cols-2"><legend>Nuevo proveedor</legend>{[['nombre_proveedor','Nombre comercial'],['nombre_fiscal_proveedor','Nombre fiscal'],['vat_code','Código fiscal'],['moneda_proveedor','Moneda']].map(([key,label])=><label key={key}>{label}<input required maxLength={key==='moneda_proveedor'?3:300} className={input} value={value[key as keyof typeof value]} onChange={e=>onChange({...value,[key]:e.target.value})}/></label>)}<div><p className="mb-1">País</p><SearchableSelect required label="País del proveedor" value={value.pais_proveedor} onChange={v=>onChange({...value,pais_proveedor:v})} options={supplierCountries.map(c=>({value:c.name,label:c.name}))}/></div></fieldset>;
}
