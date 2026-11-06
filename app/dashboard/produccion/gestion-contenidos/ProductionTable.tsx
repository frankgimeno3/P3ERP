'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import TableFilters from '@/app/components/TableFilters';
import TableColumnFilter from '@/app/components/TableColumnFilter';
import SortableTable from '@/app/components/SortableTable';
import {matchesTableFilter} from '@/app/lib/dateFilters';
type Column=readonly [string,string];
export default function ProductionTable({rows,columns,href,actions,actionsLabel='Acciones'}:{rows:any[];columns:readonly Column[];href:(row:any)=>string;actions?:(row:any)=>React.ReactNode;actionsLabel?:string}) {
 const router=useRouter(),[filters,setFilters]=useState<Record<string,string>>({});
 const visible=rows.filter(row=>columns.every(([key])=>matchesTableFilter(String(row[key]??'').toLocaleLowerCase('es'),(filters[key]||'').trim().toLocaleLowerCase('es'))));
 return <><TableFilters>{columns.map(([key,label])=><TableColumnFilter key={key} label={label} value={filters[key]||''} onChange={value=>setFilters(old=>({...old,[key]:value}))}/>)}</TableFilters><div className="overflow-x-auto rounded border border-slate-100 bg-white"><SortableTable className="w-full text-left text-sm"><thead className="bg-blue-950 text-white"><tr>{columns.map(([key,label])=><th key={key} className="p-3">{label}</th>)}{actions&&<th className="p-3">{actionsLabel}</th>}</tr></thead><tbody>{visible.map(row=><tr key={row.id_material||row.id_contenido||row.id_revista} tabIndex={0} aria-label={`Abrir ${row.nombre_material||row.nombre_contenido||row.numero_formato||row.numero_publicacion||row.id_contenido}`} onClick={()=>router.push(href(row))} onKeyDown={event=>{if(event.target===event.currentTarget&&['Enter',' '].includes(event.key)){event.preventDefault();router.push(href(row));}}} className="cursor-pointer border-t border-slate-100 transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-blue-900">{columns.map(([key])=><td key={key} className="p-3">{String(row[key]??'')||'—'}</td>)}{actions&&<td className="p-3" onClick={event=>event.stopPropagation()}>{actions(row)}</td>}</tr>)}</tbody></SortableTable>{!visible.length&&<p className="p-6 text-slate-500">No hay resultados con estos filtros.</p>}</div></>;
}
