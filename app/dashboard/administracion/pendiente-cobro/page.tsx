"use client";
import SortableTable from '@/app/components/SortableTable';
import ModuleTabs from '@/app/components/ModuleTabs';

import { matchesTableFilter } from "@/app/lib/dateFilters";
import TableFilterInput from "@/app/components/TableFilterInput";
import TableFilters from '@/app/components/TableFilters';
import {useUrlState} from '@/app/lib/useUrlState';
import {request} from '@/app/lib/request';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";

const columns=[['id_orden','Orden'],['cliente','Cliente'],['id_factura','Factura'],['fecha_teorica_cobro','Fecha de cobro deseada'],['forma_cobro','Forma de cobro'],['importe','Importe']] as const;
const amount=(row:any)=>Number(row.importe_pendiente??row.cobro_total??0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const parseDate = (value: string) => { const raw=String(value||'');if(/^\d{4}-\d{2}-\d{2}/.test(raw))return new Date(raw.slice(0,10)+'T00:00:00').getTime(); const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); return match ? new Date(+match[3], +match[2] - 1, +match[1]).getTime() : Number.MAX_SAFE_INTEGER; };
export default function PendienteCobroPage() {
  const router = useRouter();
  const [tab, setTab] = useUrlState<"reclamables"|"todas">("pending.tab","reclamables");
  const [rows, setRows] = useState<any[]>([]);
  const [filters,setFilters]=useUrlState<Record<string,string>>('pending.filters',{id_orden:'',cliente:'',id_factura:'',fecha_teorica_cobro:'',forma_cobro:'',importe:''});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(''); request("/api/v1/admin/control-administrativo/ordenes", { signal: controller.signal, cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => { if (!controller.signal.aborted) setRows(data); }).catch(e => { if (e.name !== 'AbortError') setError("No se pudieron cargar las órdenes."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [version]);
  useEffect(() => {
    const refresh = () => setVersion(value => value + 1);
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible); };
  }, []);
  const paymentMethods = useMemo(() => [...new Set(rows.map(row => String(row.forma_cobro || "").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es")), [rows]);
  const shown = useMemo(() => rows.filter(row => !row.cobrada && !row.cobro_cerrado && !row.cancelada && !row.datos_importacion?.sin_cobro_monetario && Number(row.importe_pendiente ?? row.cobro_total) > 0).filter(row => tab === "todas" || parseDate(row.fecha_teorica_cobro) < new Date().setHours(0,0,0,0)).filter(row=>columns.every(([key])=>matchesTableFilter(String(key==='importe'?amount(row):row[key]||'').toLocaleLowerCase('es'), (filters[key]||'').trim().toLocaleLowerCase('es')))).sort((a,b) => parseDate(a.fecha_teorica_cobro) - parseDate(b.fecha_teorica_cobro)), [rows, tab, filters]);
  return <div className="min-h-screen bg-gray-100 text-gray-700"><MiddleNav tituloprincipal="Pendiente de cobro" /><main className="p-6 lg:p-12">
    <ModuleTabs label="Pendiente de cobro" items={[{value:"reclamables",label:"Reclamables"},{value:"todas",label:"Todas"}]} value={tab} onChange={value=>setTab(value as "reclamables"|"todas")} />
    <section role="tabpanel">
    {loading && <p role="status" className="mb-4">Cargando órdenes…</p>}
    {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{error} <button type="button" onClick={() => setVersion(v => v + 1)} className="cursor-pointer underline hover:text-red-950">Reintentar</button></p>}
    <div className="overflow-x-auto bg-white shadow-sm"><TableFilters>{columns.map(([key,label])=><div key={key}><label className="block text-xs font-extralight text-gray-600"><span className="mb-1 block">{label}</span>{key==="forma_cobro"?<select aria-label="Forma de cobro" value={filters[key]||""} onChange={event=>setFilters({...filters,[key]:event.target.value})} className="mt-1 w-full cursor-pointer rounded border bg-white p-2 text-black hover:border-blue-950"><option value="">Todas</option>{paymentMethods.map(method=><option key={method} value={method}>{method}</option>)}</select>:<TableFilterInput label={label} field={key} value={filters[key]} className="mt-1 rounded border bg-white p-2 text-black" onChange={nextValue => setFilters({...filters,[key]:nextValue})} />}</label></div>)}</TableFilters><SortableTable className="min-w-full text-sm"><thead className="bg-blue-950 text-white"><tr>{columns.map(([key,label])=><th key={key} className="p-3 text-left font-medium">{label}</th>)}</tr></thead><tbody>
      {shown.map(row => <tr key={row.id_orden} onClick={() => router.push(`/dashboard/administracion/control-administrativo/${encodeURIComponent(row.id_orden)}`)} className="cursor-pointer border-b transition hover:bg-blue-50"><td className="p-3 font-medium text-blue-950">{row.id_orden}</td><td className="p-3">{row.cliente || "—"}</td><td className="p-3">{row.id_factura || "—"}</td><td className="p-3">{row.fecha_teorica_cobro || "—"}</td><td className="p-3">{row.forma_cobro || "—"}</td><td className="p-3">{Number(row.importe_pendiente ?? row.cobro_total ?? 0).toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</td></tr>)}
      {!loading && !error && !shown.length && <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay órdenes pendientes en esta vista.</td></tr>}
    </tbody></SortableTable></div>
  </section></main></div>;
}
