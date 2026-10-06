"use client";
import SortableTable from '@/app/components/SortableTable';

import TableFilters from '@/app/components/TableFilters';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { OrdenService } from "@/app/service/OrdenService";
import { AgenteService } from "@/app/service/AgenteService";
import AdministrativeExcelModal from "./AdministrativeExcelModal";
import {useUrlState} from '@/app/lib/useUrlState';
import TableColumnFilter from '@/app/components/TableColumnFilter';
import DatePartsInput from '@/app/components/DatePartsInput';
import { administrativeOrderTab } from '@/app/lib/administrativeOrderTabs';
import {administrativeOrderIssues,administrativeIssueTabs} from '@/app/lib/administrativeOrderIssues';

const formatMoney = (value?: number) => {
  const amount = Number(value ?? 0);
  return amount ? `${amount.toLocaleString("es-ES")} EUR` : "-";
};

const inputClass = "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950";
const matchesDate=(value:unknown,query:string)=>{const raw=String(value||'').slice(0,10);const parts=raw.includes('-')?raw.split('-').reverse():raw.split('/');return query.split('/').every((part,index)=>!part||String(parts[index]||'').startsWith(part));};

export default function ControlAdministrativoPage() {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [filtros, setFiltros] = useUrlState('orders.filters',{
    orden: "",
    cliente: "",
    agente: "",
    contrato: "",
    factura: "",
    forma_cobro: "",
    estado_cobro: "",
    fecha_cobro: "",
    base_imponible: "",
    importe_total: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab,setTab]=useUrlState<'vigentes'|'anteriores'|'canceladas'>('orders.tab','vigentes');
  const [view,setView]=useUrlState<'gestion'|'pendiente'>('orders.view','gestion');
  const [issue,setIssue]=useUrlState('orders.issue','todas');
  const currentYear = new Date().getFullYear();
  const [showExcel,setShowExcel]=useState(false),[reloadKey,setReloadKey]=useState(0),[notice,setNotice]=useState('');

  useEffect(() => {
    const fetchOrdenes = async () => {
      try {
        setLoading(true);
        setError("");
        const [data, agentesData] = await Promise.all([OrdenService.getOrdenesAdministrativas(), AgenteService.getAgentes()]);
        setOrdenes(Array.isArray(data) ? data : []);
        setAgentes(Array.isArray(agentesData) ? agentesData : []);
      } catch (err) {
        console.error("Error fetching ordenes:", err);
        setError("No se han podido cargar las ordenes.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrdenes();
  }, [reloadKey]);

  const ordenesFiltradas = useMemo(() => {
    const matches = (value: unknown, query: string) => String(value ?? "").toLowerCase().includes(query.trim().toLowerCase());

    return ordenes.filter((orden) =>
      (view==='gestion'?administrativeOrderTab(orden,currentYear)===tab:administrativeOrderIssues(orden).length>0&&(issue==='todas'||administrativeOrderIssues(orden).includes(issue)))
      && matches(orden.id_orden, filtros.orden)
      && matches(orden.cliente, filtros.cliente)
      && (!filtros.agente || String(orden.id_agente || orden.agente) === filtros.agente)
      && matches(orden.id_contrato, filtros.contrato)
      && matches(orden.id_factura, filtros.factura)
      && matches(orden.forma_cobro, filtros.forma_cobro)
      && (!filtros.estado_cobro || (filtros.estado_cobro==='cobrada')===Boolean(orden.cobrada))
      && (!filtros.fecha_cobro || matchesDate(orden.fecha_real_cobro,filtros.fecha_cobro))
      && (!filtros.importe_total||String(Number(orden.cobro_total||0)).includes(filtros.importe_total.replace(',','.')))
      && (!filtros.base_imponible || String(Number(orden.base_imponible||0)).includes(filtros.base_imponible.replace(',','.'))),
    );
  }, [filtros, ordenes, tab, currentYear, view, issue]);

  const handleFiltroChange = (field: keyof typeof filtros, value: string) => {
    setFiltros((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Control administrativo" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10 text-gray-600">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={()=>setShowExcel(true)} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm text-white transition hover:bg-blue-900">Subir excel de control administrativo</button><Link href="/dashboard/comercial/contratos/crear" className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm text-white transition hover:bg-blue-900">Agregar contrato</Link><Link href="/dashboard/administracion/control-administrativo/importacion-masiva" className="cursor-pointer rounded border border-blue-950 px-4 py-2 text-sm text-blue-950 transition hover:bg-blue-50">Importación masiva</Link></div>
          <div role="tablist" aria-label="Control administrativo" className="flex border-b border-gray-300">{([['gestion','Gestión de órdenes'],['pendiente','Pendiente de gestionar']] as const).map(([value,label])=><button type="button" key={value} role="tab" id={'orders-view-'+value} aria-controls="orders-panel" aria-selected={view===value} onClick={()=>setView(value)} className={`cursor-pointer rounded-t-lg border px-5 py-3 font-medium transition ${view===value?'border-gray-300 border-b-white bg-white text-blue-950':'border-transparent hover:bg-gray-200'}`}>{label}{value==='pendiente'?' ('+ordenes.filter(o=>administrativeOrderIssues(o).length>0).length+')':''}</button>)}</div>
          {notice && <p role="status" className="rounded bg-green-50 p-3 text-green-800">{notice}</p>}

        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {view==='gestion'&&<div role="tablist" aria-label="Estado de las órdenes" className="mb-4 flex gap-2">{(['vigentes','anteriores','canceladas'] as const).map(value=><button type="button" key={value} role="tab" aria-selected={tab===value} onClick={()=>setTab(value)} className={`cursor-pointer rounded px-4 py-2 transition ${tab===value?'bg-blue-950 text-white hover:bg-blue-800':'bg-white hover:bg-blue-50'}`}>{value==='vigentes'?'Órdenes':value==='anteriores'?'Órdenes años anteriores':'Canceladas'} ({ordenes.filter(o=>administrativeOrderTab(o,currentYear)===value).length})</button>)}</div>}
        {view==='pendiente'&&<div role="tablist" aria-label="Motivo pendiente de gestionar" className="mb-4 flex flex-wrap gap-2">{administrativeIssueTabs.map(([value,label])=><button type="button" role="tab" key={value} aria-selected={issue===value} onClick={()=>setIssue(value)} className={`cursor-pointer rounded px-4 py-2 text-sm transition ${issue===value?'bg-blue-950 text-white hover:bg-blue-900':'bg-white hover:bg-blue-50'}`}>{label} ({ordenes.filter(o=>{const reasons=administrativeOrderIssues(o);return value==='todas'?reasons.length>0:reasons.includes(value)}).length})</button>)}</div>}
        {view==='pendiente'&&<p className="mb-4 text-sm text-gray-600">Estas órdenes siguen disponibles en Gestión de órdenes. Una orden puede aparecer en varias subpestañas.</p>}
        <div role="tabpanel" id="orders-panel" aria-labelledby={'orders-view-'+view} className="overflow-x-auto bg-white">
          <TableFilters><div><TableColumnFilter label="Orden" value={filtros.orden} onChange={value=>handleFiltroChange('orden',value)}/></div><div><TableColumnFilter label="Cliente" value={filtros.cliente} onChange={value=>handleFiltroChange('cliente',value)}/></div><div><label className="block text-xs font-extralight text-gray-600"><span className="mb-1 block">Agente</span><select aria-label="Filtrar por agente" value={filtros.agente} onChange={event=>handleFiltroChange('agente',event.target.value)} className={inputClass+' text-gray-900 cursor-pointer'}><option value="">Todos</option>{agentes.map(agente=><option key={agente.id_agente} value={agente.id_agente}>{agente.nombre_completo_agente||agente.id_agente}</option>)}</select></label></div><div><TableColumnFilter label="Contrato" value={filtros.contrato} onChange={value=>handleFiltroChange('contrato',value)}/></div><div><TableColumnFilter label="Factura" value={filtros.factura} onChange={value=>handleFiltroChange('factura',value)}/></div><div><TableColumnFilter label="Base imponible" value={filtros.base_imponible} onChange={value=>handleFiltroChange('base_imponible',value)}/></div><div><TableColumnFilter label="Forma de cobro" value={filtros.forma_cobro} onChange={value=>handleFiltroChange('forma_cobro',value)}/></div><div><TableColumnFilter label="Importe total" value={filtros.importe_total} onChange={value=>handleFiltroChange('importe_total',value)}/></div><div><div className="text-xs font-extralight text-gray-600"><DatePartsInput label="Fecha de cobro" value={filtros.fecha_cobro} onChange={value=>handleFiltroChange('fecha_cobro',value)}/></div></div><div><label className="block text-xs font-extralight text-gray-600"><span className="mb-1 block">Estado de cobro</span><select aria-label="Filtrar estado" value={filtros.estado_cobro} onChange={event=>handleFiltroChange('estado_cobro',event.target.value)} className={inputClass+' text-gray-900 cursor-pointer'}><option value="">Todos</option><option value="cobrada">Cobrada</option><option value="pendiente">Pendiente</option></select></label></div></TableFilters><SortableTable className="min-w-full">
            <thead className="bg-blue-950 text-white">
              <tr>
                <th className="p-2 pl-6 text-left font-light">Orden</th>
                <th className="p-2 text-left font-light">Cliente</th>
                <th className="p-2 text-left font-light">Agente</th>
                <th className="p-2 text-left font-light">Contrato</th>
                <th className="p-2 text-left font-light">Factura</th>
                <th className="p-2 text-left font-light">Base imponible</th>
                <th className="p-2 text-left font-light">Forma de cobro</th>
                <th className="p-2 text-left font-light">Importe total</th>
                <th className="p-2 text-left font-light">Fecha de cobro</th>
                <th className="p-2 text-left font-light">Estado de cobro</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-gray-500">
                    Cargando ordenes...
                  </td>
                </tr>
              )}

              {!loading && ordenesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-gray-500">
                    No hay ordenes que coincidan con los filtros.
                  </td>
                </tr>
              )}

              {!loading && ordenesFiltradas.map((orden) => (
                <tr key={orden.id_orden} onClick={()=>router.push(`/dashboard/administracion/control-administrativo/${orden.id_orden}`)} className="cursor-pointer transition hover:bg-blue-50">
                  <td className="border-b border-gray-200 p-2 pl-6 font-medium text-blue-950">{orden.id_orden || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.cliente || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.agente || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.id_contrato || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.id_factura ? <Link onClick={e=>e.stopPropagation()} className="cursor-pointer text-blue-900 hover:underline" href={'/dashboard/administracion/facturas-clientes/'+encodeURIComponent(orden.id_factura)}>{orden.numero_factura || orden.id_factura} · {orden.tipo_factura}</Link> : 'Sin factura'}</td>
                  <td className="border-b border-gray-200 p-2">{formatMoney(orden.base_imponible)}</td>
                  <td className="border-b border-gray-200 p-2">{orden.forma_cobro || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{formatMoney(orden.cobro_total)}</td>
                  <td className="border-b border-gray-200 p-2">{orden.fecha_real_cobro || '-'}</td>
                  <td className="border-b border-gray-200 p-2">{orden.estado || (orden.cancelada ? (orden.cancelacion_detalle?.numero_abono?'Abonada ? '+orden.cancelacion_detalle.numero_abono:'Cancelada') : orden.cobrada ? 'Cobrada' : 'Pendiente')}</td>
                </tr>
              ))}
            </tbody>
          </SortableTable>
        </div>
      </div>
      {showExcel && <AdministrativeExcelModal onClose={()=>setShowExcel(false)} onImported={result=>{setReloadKey(k=>k+1);setNotice(`${result.created} órdenes creadas, ${result.updated} actualizadas y ${result.unchanged} sin cambios.`);}} />}
    </div>
  );
}
