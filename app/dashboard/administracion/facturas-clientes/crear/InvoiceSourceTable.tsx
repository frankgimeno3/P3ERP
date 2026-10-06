'use client';
import SortableTable from '@/app/components/SortableTable';

import { matchesTableFilter } from "@/app/lib/dateFilters";
import TableFilterInput from "@/app/components/TableFilterInput";
import TableFilters from '@/app/components/TableFilters';
import {useState} from 'react';

export default function InvoiceSourceTable({rows,source,busy,onChoose}:{rows:any[];source:'contrato'|'orden';busy:boolean;onChoose:(id:string)=>void}){
  const columns=source==='orden'?[['id_orden','Orden'],['id_contrato','Contrato'],['nombre_empresa','Cliente'],['cobro_total','Importe'],['fecha_teorica_cobro','Fecha de cobro']]:[['id_contrato','Contrato'],['nombre_empresa','Cliente'],['importe_contrato_con_iva','Importe'],['moneda','Moneda']];
  const [filters,setFilters]=useState<Record<string,string>>({});
  const shown=rows.filter(row=>columns.every(([key])=>!filters[key]||matchesTableFilter(String(row[key]??'').toLocaleLowerCase('es'), filters[key].toLocaleLowerCase('es'))));
  return <div className="overflow-x-auto rounded border"><TableFilters>{columns.map(([key,label])=><label key={key} className="block text-xs font-extralight text-gray-600"><span className="mb-1 block">{label}</span><TableFilterInput label={label} field={key} value={filters[key]||''} className="w-full min-w-24 rounded border p-1.5 text-xs font-normal" onChange={nextValue => setFilters(v=>({...v,[key]:nextValue}))} /></label>)}</TableFilters><SortableTable className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr>{columns.map(([key,label])=><th key={key} className="p-2">{label}</th>)}<th className="p-2">Acción</th></tr></thead><tbody>{shown.map(row=>{const id=String(row[source==='orden'?'id_orden':'id_contrato']);return <tr key={id} className="border-t transition hover:bg-blue-50">{columns.map(([key])=><td key={key} className="p-2">{String(row[key]??'')}</td>)}<td className="p-2"><button type="button" disabled={busy} onClick={()=>onChoose(id)} className="cursor-pointer rounded bg-blue-950 px-3 py-1 text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">Seleccionar</button></td></tr>})}</tbody></SortableTable>{!shown.length&&<p className="p-4 text-sm text-gray-500">No hay pendientes que coincidan con los filtros.</p>}</div>;
}
