'use client';
import {useEffect,useMemo,useState} from 'react';
import SortableTable from '@/app/components/SortableTable';
import TableFilters from '@/app/components/TableFilters';
import ModuleTabs from '@/app/components/ModuleTabs';
import TableColumnFilter from '@/app/components/TableColumnFilter';
import DatePartsInput from '@/app/components/DatePartsInput';
import {matchesTableFilter} from '@/app/lib/dateFilters';
import {articleStates,articleOwners,articleMagazines} from '@/app/config/editorialArticle';
import NewArticleModal from './NewArticleModal';
import apiClient from '@/app/apiClient';
const columns=[['donde_esta','Ubicación'],['empresa','Cuenta'],['titulo','Título'],['estado','Estado'],['responsable_correccion','Responsable corrección'],['pasado_produccion_dia','Pasado a producción día'],['revista','Portada'],['espana_previsto_numero','España previsto Nº'],['latam_previsto_numero','Latam previsto Nº'],['especial_numero','Especial Nº'],['hueco_previsto','Hueco previsto'],['paginas','Páginas'],['estado_publicacion_vidrioperfil','Estado publicación en Vidrioperfil']] as const;
export default function ControlRedaccionTable(){
 const [tab,setTab]=useState('pendientes'),[rows,setRows]=useState<any[]>([]),[filters,setFilters]=useState<Record<string,string>>({}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[editing,setEditing]=useState<any>(null),[showNew,setShowNew]=useState(false);
 useEffect(()=>{let active=true;apiClient.get('/api/v1/produccion/control-redaccion').then(r=>{if(active)setRows(r.data||[]);}).catch(e=>{if(active)setError(e.response?.data?.message||e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 const tableColumns=columns.filter(([key])=>tab!=='publicados'||key!=='estado');
 const section=rows.filter(row=>tab==='publicados'?row.estado==='Publicado':row.estado!=='Publicado');
 const filtered=useMemo(()=>rows.filter(row=>tab==='publicados'?row.estado==='Publicado':row.estado!=='Publicado').filter(row=>columns.every(([key])=>(tab==='publicados'&&key==='estado')||matchesTableFilter(String(row[key]||'').toLocaleLowerCase('es'),String(filters[key]||'').trim().toLocaleLowerCase('es')))),[rows,filters,tab]);
 const saved=(row:any)=>{setRows(current=>[row,...current.filter(r=>String(r.id)!==String(row.id))]);setNotice('Artículo guardado.');setShowNew(false);setEditing(null);};
 const choice=(key:string)=>key==='estado'?articleStates:key==='responsable_correccion'?articleOwners:key==='revista'?articleMagazines:[];
 return <section><ModuleTabs sub label="Artículos" value={tab} items={[{value:'pendientes',label:`Pendientes (${rows.filter(r=>r.estado!=='Publicado').length})`},{value:'publicados',label:`Publicados (${rows.filter(r=>r.estado==='Publicado').length})`}]} onChange={setTab}/><div role="tabpanel" data-subpanel className="rounded-b-lg border border-blue-200 border-t-0 bg-white p-5">
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-gray-500">{filtered.length} de {section.length} artículos</p><button type="button" onClick={()=>setShowNew(true)} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm text-white hover:bg-blue-900">Añadir artículo</button></div>
  {notice&&<p role="status" className="mb-4 rounded bg-green-50 p-3 text-green-800">{notice}</p>}
  <TableFilters>{tableColumns.map(([key,label])=><div key={key}>{choice(key).length?<label className="block text-xs font-extralight text-gray-600"><span className="mb-1 block">{label}</span><select aria-label={label} value={filters[key]||''} onChange={e=>setFilters({...filters,[key]:e.target.value})} className="w-full cursor-pointer rounded border bg-white p-2 text-sm font-normal hover:border-blue-950"><option value="">Todos</option>{choice(key).filter(Boolean).map(v=><option key={v} value={v}>{v}</option>)}</select></label>:key==='pasado_produccion_dia'?<DatePartsInput label={label} value={filters[key]||''} onChange={v=>setFilters({...filters,[key]:v})}/>:<TableColumnFilter label={label} value={filters[key]||''} onChange={v=>setFilters({...filters,[key]:v})}/>}</div>)}</TableFilters>
  <div className="overflow-x-auto rounded border"><SortableTable className="w-full text-left text-xs"><thead className="bg-blue-950 text-white"><tr>{tableColumns.map(([key,label])=><th key={key} className="whitespace-nowrap p-3 font-light">{label}</th>)}</tr></thead><tbody>{filtered.map(row=><tr key={row.id} tabIndex={0} aria-label={`Editar ${row.titulo}`} onClick={()=>setEditing(row)} onKeyDown={e=>{if(e.key==='Enter')setEditing(row);}} className="cursor-pointer border-t transition hover:bg-blue-50 focus-visible:bg-blue-50">{tableColumns.map(([key])=><td key={key} className="max-w-80 p-3 align-top">{String(row[key]||'—')}</td>)}</tr>)}</tbody></SortableTable>{loading&&<p role="status" className="p-6 text-center">Cargando artículos…</p>}{error&&<p role="alert" className="p-6 text-center text-red-600">{error}</p>}{!loading&&!error&&!filtered.length&&<p className="p-6 text-center">No hay artículos en esta vista.</p>}</div>
 </div>{(showNew||editing)&&<NewArticleModal article={editing||undefined} onClose={()=>{setShowNew(false);setEditing(null);}} onCreated={saved}/>}</section>;
}
