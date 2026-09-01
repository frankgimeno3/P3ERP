"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";

const parseDate = (value: string) => { const match = String(value || "").match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); return match ? new Date(+match[3], +match[2] - 1, +match[1]).getTime() : Number.MAX_SAFE_INTEGER; };
export default function PendienteCobroPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"reclamables"|"todas">("reclamables");
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/v1/admin/control-administrativo/ordenes").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setRows).catch(() => setError("No se pudieron cargar las órdenes.")); }, []);
  const shown = useMemo(() => rows.filter(row => !row.cobrada).filter(row => tab === "todas" || parseDate(row.fecha_teorica_cobro) < new Date().setHours(0,0,0,0)).filter(row => !filter.trim() || Object.values(row).join(" ").toLowerCase().includes(filter.trim().toLowerCase())).sort((a,b) => parseDate(a.fecha_teorica_cobro) - parseDate(b.fecha_teorica_cobro)), [rows, tab, filter]);
  return <div className="min-h-screen bg-gray-100 text-gray-700"><MiddleNav tituloprincipal="Pendiente de cobro" /><main className="p-6 lg:p-12">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div className="flex gap-1">{(["reclamables","todas"] as const).map(item => <button key={item} type="button" onClick={() => setTab(item)} className={`cursor-pointer rounded-t px-5 py-2 capitalize transition hover:bg-blue-800 hover:text-white ${tab === item ? "bg-blue-950 text-white" : "bg-white"}`}>{item}</button>)}</div><input type="search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar órdenes..." className="w-full rounded border bg-white px-3 py-2 sm:w-96" /></div>
    {error && <p className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="overflow-x-auto bg-white shadow-sm"><table className="min-w-full text-sm"><thead className="bg-blue-950 text-white"><tr>{["Orden","Cliente","Factura","Fecha de cobro deseada","Forma","Importe"].map(x => <th key={x} className="p-3 text-left font-medium">{x}</th>)}</tr></thead><tbody>
      {shown.map(row => <tr key={row.id_orden} onClick={() => router.push(`/dashboard/administracion/control-administrativo/${encodeURIComponent(row.id_orden)}`)} className="cursor-pointer border-b transition hover:bg-blue-50"><td className="p-3 font-medium text-blue-950">{row.id_orden}</td><td className="p-3">{row.cliente || "—"}</td><td className="p-3">{row.id_factura || "—"}</td><td className="p-3">{row.fecha_teorica_cobro || "—"}</td><td className="p-3">{row.forma_cobro || "—"}</td><td className="p-3">{Number(row.cobro_total || 0).toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</td></tr>)}
      {!shown.length && <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay órdenes pendientes en esta vista.</td></tr>}
    </tbody></table></div>
  </main></div>;
}
