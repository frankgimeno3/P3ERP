'use client';
import SortableTable from '@/app/components/SortableTable';

import TableFilters from '@/app/components/TableFilters';
import { useState } from 'react';

type Recipient = { id: string; name: string; fiscal?: string; taxId?: string };
export default function ReviewRecipientTable({ type, rows, value, onSelect, disabled = false }: {
  type: string; rows: Recipient[]; value: string; onSelect: (id: string) => void; disabled?: boolean;
}) {
  const [filters,setFilters]=useState<Record<string,string>>({});
  const columns: {key:keyof Recipient;label:string}[]=[{key:'name',label:type==='nomina'?'Empleado':'Nombre'},...(type==='proveedor'?[{key:'fiscal' as const,label:'Nombre fiscal'},{key:'taxId' as const,label:'NIF / CIF'}]:[]),{key:'id',label:'Identificador'}];
  const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
  const uniqueRows=[...new Map(rows.filter(row=>row.id).map(row=>[row.id,row])).values()];
  const shown=uniqueRows.filter(row=>columns.every(c=>normalize(String(row[c.key]||'')).includes(normalize(filters[c.key]||''))));
  const selected=uniqueRows.find(row=>row.id===value);
  const label=type==='proveedor'?'Proveedores':type==='nomina'?'Nóminas: empleados':'Clientes';
  return <section aria-label={`Elegir destinatario: ${label}`} className="space-y-2">
    <p className="font-medium">{label}</p><p className="text-sm text-slate-600">Filtra las columnas y selecciona una fila para continuar.</p>
    <div className="max-h-80 overflow-auto rounded-lg border"><TableFilters>{columns.map(c=><label key={c.key} className="block text-xs font-extralight text-gray-600"><span className="mb-1 block">{c.label}</span><input aria-label={`Filtrar ${c.label}`} value={filters[c.key]||''} disabled={disabled} onChange={e=>setFilters({...filters,[c.key]:e.target.value})} placeholder={`Filtrar ${c.label.toLowerCase()}`} className="w-full rounded border bg-white p-2 font-normal disabled:bg-slate-100"/></label>)}</TableFilters><SortableTable aria-label={label} className="w-full text-left text-sm">
      <thead className="sticky top-0 bg-slate-100"><tr>{columns.map(c=><th key={c.key} scope="col" className="min-w-40 p-3"><span className="mb-2 block">{c.label}</span></th>)}</tr></thead>
      <tbody>{shown.map(row=><tr key={row.id} aria-selected={row.id===value} aria-disabled={disabled||undefined} tabIndex={disabled?-1:0} onClick={()=>{if(!disabled)onSelect(row.id);}} onKeyDown={e=>{if(!disabled&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onSelect(row.id);}}} className={`border-t outline-offset-[-2px] ${disabled?'bg-slate-50 text-slate-500':`cursor-pointer hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${row.id===value?'bg-blue-100 font-semibold':'bg-white'}`}`}>
        {columns.map(c=><td key={c.key} className="p-3">{c.key==='name'&&row.id===value&&<span className="mr-2 text-blue-900" aria-label="Seleccionado">✓</span>}{row[c.key]||'—'}</td>)}
      </tr>)}</tbody>
    </SortableTable>{!shown.length&&<p className="p-4 text-slate-600">{rows.length?'No hay resultados con estos filtros.':'No hay destinatarios disponibles.'}</p>}</div>
    <p role="status" className="text-sm">{selected?`Seleccionado: ${selected.name} · ${selected.id}${shown.some(r=>r.id===value)?'':' (oculto por los filtros)'}`:'Debes seleccionar una fila.'}</p>
  </section>;
}
