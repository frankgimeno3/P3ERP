"use client";
import SortableTable from '@/app/components/SortableTable';

import TableFilters from '@/app/components/TableFilters';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { FacturaService } from "@/app/service/FacturaService";
import UninvoicedContracts from './UninvoicedContracts';

function formatMoney(value?: number | null) {
  if(value == null) return "-";
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR` : "-";
}

function getYear(fecha: string) {
  const match = String(fecha || "").match(/(\d{4})$/);
  return match ? match[1] : "Sin fecha";
}

export default function FacturasClientesPage() {
  const router = useRouter();
  const [facturas, setFacturas] = useState<any[]>([]);
  const [section,setSection]=useState<'facturas'|'contratos'>('facturas');
  const [activeYear, setActiveYear] = useState("");
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [estado, setEstado] = useState("en proceso");
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const [conditions, setConditions] = useState<any[]>([]);
  const [expandedCondition, setExpandedCondition] = useState<number | null>(null);

  useEffect(() => {
    const fetchFacturas = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await FacturaService.getFacturasClientes();
        const rows = Array.isArray(data) ? data : [];
        setFacturas(rows);
        const firstYear = Array.from(new Set(rows.map((factura) => getYear(factura.fecha_factura)))).sort().reverse()[0] || String(new Date().getFullYear());
        setActiveYear(firstYear);
      } catch (err) {
        console.error("Error fetching facturas clientes:", err);
        setError("No se han podido cargar las facturas de clientes.");
      } finally {
        setLoading(false);
      }
    };

    fetchFacturas();
  }, []);
  useEffect(() => {
    if (!conditionsOpen) return;
    fetch("/api/v1/admin/facturas-clientes/condiciones-verifactu").then((response)=>response.json()).then((data)=>setConditions(Array.isArray(data)?data:[]));
    const close=(event:KeyboardEvent)=>event.key==="Escape"&&setConditionsOpen(false);
    window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);
  },[conditionsOpen]);
  async function saveConditions(items=conditions) {
    const response=await fetch("/api/v1/admin/facturas-clientes/condiciones-verifactu",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(items)});
    if(!response.ok)setError("No se pudieron guardar las condiciones VERI*FACTU.");
  }

  const years = useMemo(() => {
    const items = Array.from(new Set(['2026','2025','2024',...facturas.map((factura) => getYear(factura.fecha_factura))])).filter(year=>year!=='Sin fecha').sort().reverse();
    return ['Sin fecha',...items];
  }, [facturas]);

  const facturasFiltradas = useMemo(() => {
    const query = filtro.trim().toLowerCase();
    return facturas.filter((factura) => {
      const matchesYear = getYear(factura.fecha_factura) === activeYear;
      const matchesQuery = !query || Object.values(factura).join(" ").toLowerCase().includes(query);
      return matchesYear && matchesQuery && factura.estado === estado;
    });
  }, [activeYear, estado, facturas, filtro]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Facturas clientes" />
      <div className="min-h-screen w-full bg-white px-6 py-10 text-gray-600 lg:px-12"><div role="tablist" aria-label="Facturas y contratos" className="flex border-b border-gray-300">{([['facturas','Facturas'],['contratos','Contratos sin facturar']] as const).map(([value,label])=><button key={value} type="button" role="tab" id={'invoices-section-'+value} aria-controls="invoices-section-panel" aria-selected={section===value} onClick={()=>setSection(value)} className={`cursor-pointer rounded-t-lg border px-5 py-3 font-medium transition ${section===value?'border-gray-300 border-b-gray-100 bg-gray-100 text-blue-950':'border-transparent bg-white hover:bg-gray-50'}`}>{label}</button>)}</div><div role="tabpanel" id="invoices-section-panel" aria-labelledby={'invoices-section-'+section} className="rounded-b-xl border border-t-0 border-gray-300 bg-gray-100 p-4 lg:p-6"><div className="mb-6 overflow-x-auto"><div className="flex min-w-max justify-end gap-2"><button type="button" onClick={()=>setConditionsOpen(true)} className="cursor-pointer whitespace-nowrap rounded border border-blue-950 px-4 py-2 text-sm text-blue-950 transition hover:bg-blue-50">Condiciones VERI*FACTU</button><Link href="/dashboard/administracion/facturas-clientes/verifactu-records" className="cursor-pointer whitespace-nowrap rounded border border-blue-950 px-4 py-2 text-sm text-blue-950 transition hover:bg-blue-50">Registros VERI*FACTU</Link><Link href="/dashboard/administracion/facturas-clientes/crear_rectificativa?tipo=abono" className="cursor-pointer whitespace-nowrap rounded bg-amber-600 px-4 py-2 text-sm text-white transition hover:bg-amber-700">Crear factura abono</Link><Link href="/dashboard/administracion/facturas-clientes/crear_rectificativa" className="cursor-pointer whitespace-nowrap rounded bg-amber-600 px-4 py-2 text-sm text-white transition hover:bg-amber-700">Crear factura rectificativa</Link><Link href="/dashboard/administracion/facturas-clientes/crear" className="cursor-pointer whitespace-nowrap rounded bg-blue-950 px-4 py-2 text-sm text-white transition hover:bg-blue-900">Crear nueva factura</Link></div></div>{section==='contratos'?<div className="rounded-lg bg-white p-4"><UninvoicedContracts/></div>:<><div role="tablist" aria-label="Año de facturación" className="flex flex-wrap border-b border-gray-300">{years.map(year=><button key={year} type="button" role="tab" id={'invoice-year-'+year} aria-controls="invoice-year-panel" aria-selected={activeYear===year} onClick={()=>setActiveYear(year)} className={`cursor-pointer rounded-t-lg border px-5 py-3 text-sm transition ${activeYear===year?'border-gray-300 border-b-white bg-white text-blue-950':'border-transparent hover:bg-gray-200'}`}>{year}</button>)}</div><div role="tabpanel" id="invoice-year-panel" aria-labelledby={'invoice-year-'+activeYear} className="rounded-b-lg bg-white p-4 lg:p-6">
        <TableFilters><label className="block text-xs text-gray-600"><span className="mb-1 block">Buscar factura</span><input type="search" value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Filtrar facturas..." className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950" /></label></TableFilters>
        <div role="tablist" aria-label="Estado de facturación" className="mb-4 flex gap-2">{[["en proceso","En proceso"],["enviada","Enviadas"]].map(([value,label])=><button key={value} type="button" role="tab" aria-selected={estado===value} onClick={()=>setEstado(value)} className={`cursor-pointer rounded px-4 py-2 text-sm transition ${estado===value?"bg-blue-950 text-white":"bg-white hover:bg-blue-50"}`}>{label}</button>)}</div>

        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto bg-white">
          <SortableTable className="min-w-full text-xs">
            <thead className="bg-blue-950 text-white">
              <tr>
                <th className="p-2 pl-6 text-left font-light">N FRA</th>
                <th className="p-2 text-left font-light">FECHA EMISION</th>
                <th className="p-2 text-left font-light">CODIGO</th>
                <th className="p-2 text-left font-light">CLIENTE</th>
                <th className="p-2 text-right font-light">TOTAL NAC + IVA</th>
                <th className="p-2 text-right font-light">TOTAL UE</th>
                <th className="p-2 text-right font-light">TOTAL RESTO</th>
                <th className="p-2 text-left font-light">FORMA DE COBRO</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="p-6 text-center text-gray-500">Cargando facturas...</td></tr>}
              {!loading && facturasFiltradas.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-gray-500">No hay facturas de clientes.</td></tr>}
              {!loading && facturasFiltradas.map((factura) => (
                <tr key={factura.id_factura_cliente} onClick={()=>router.push(`/dashboard/administracion/facturas-clientes/${factura.id_factura_cliente}`)} className="cursor-pointer transition hover:bg-blue-50">
                  <td className="border-b border-gray-200 p-2 pl-6 font-medium text-blue-950">{factura.numero_factura || factura.id_factura_cliente}</td>
                  <td className="border-b border-gray-200 p-2">{factura.fecha_factura || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{factura.codigo_cliente || factura.id_cuenta || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{factura.cliente || factura.cliente_orden || factura.datos_fiscales?.nombre_fiscal || factura.nombre_empresa || "-"}</td>
                  <td className="border-b border-gray-200 p-2 text-right">{formatMoney(factura.total_nac_iva)}</td>
                  <td className="border-b border-gray-200 p-2 text-right">{formatMoney(factura.total_ue)}</td>
                  <td className="border-b border-gray-200 p-2 text-right">{formatMoney(factura.total_resto)}</td>
                  <td className="border-b border-gray-200 p-2">{factura.forma_cobro || "-"}</td>
                </tr>
              ))}
            </tbody>
          </SortableTable>
        </div>
      </div></>}</div></div>
      {conditionsOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="conditions-title"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b bg-white p-5"><div><h2 id="conditions-title" className="text-lg font-semibold text-blue-950">Condiciones VERI*FACTU</h2><p className="text-sm text-gray-500">Checklist editable de implementación.</p></div><button type="button" onClick={()=>setConditionsOpen(false)} aria-label="Cerrar modal" className="cursor-pointer rounded px-2 text-2xl transition hover:bg-gray-100">×</button></div><div className="space-y-3 p-5">{conditions.map((condition,index)=><article key={index} className="rounded-lg border"><div className="flex items-center gap-3 p-4 transition hover:bg-blue-50"><input type="checkbox" checked={Boolean(condition.estado)} onChange={event=>{const next=conditions.map((item,i)=>i===index?{...item,estado:event.target.checked}:item);setConditions(next);void saveConditions(next);}} className="h-5 w-5 cursor-pointer"/><button type="button" onClick={()=>setExpandedCondition(value=>value===index?null:index)} className="flex flex-1 cursor-pointer items-center justify-between text-left font-semibold text-blue-950"><span>{condition.nombre}</span><span>{expandedCondition===index?"▴":"▾"}</span></button></div>{expandedCondition===index&&<div className="space-y-3 border-t bg-gray-50 p-4"><label className="block text-sm font-medium">Nombre<input value={condition.nombre} onChange={event=>setConditions(items=>items.map((item,i)=>i===index?{...item,nombre:event.target.value}:item))} className="mt-1 w-full rounded border bg-white p-2"/></label><label className="block text-sm font-medium">Descripción<textarea value={condition.descripcion} onChange={event=>setConditions(items=>items.map((item,i)=>i===index?{...item,descripcion:event.target.value}:item))} className="mt-1 min-h-24 w-full resize-y rounded border bg-white p-3"/></label><div className="flex justify-end"><button type="button" onClick={()=>void saveConditions()} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm text-white transition hover:bg-blue-900">Guardar cambios</button></div></div>}</article>)}</div></div></div>}
    </div>
  );
}
