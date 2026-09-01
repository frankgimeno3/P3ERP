"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
export default function TicketsProveedoresPage() {
  const [rows,setRows]=useState<any[]>([]); const [filter,setFilter]=useState("");
  useEffect(()=>{fetch("/api/v1/admin/tickets").then(r=>r.json()).then(data=>setRows(Array.isArray(data)?data:[]));},[]);
  const shown=rows.filter(row=>!filter.trim()||Object.values(row).join(" ").toLowerCase().includes(filter.toLowerCase()));
  return <div className="min-h-screen bg-gray-100 text-gray-700"><MiddleNav tituloprincipal="Tickets proveedores"/><main className="px-6 py-10 lg:px-12">
    <div className="mb-4 flex flex-wrap justify-between gap-3"><input type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrar tickets..." className="w-full rounded border bg-white px-3 py-2 sm:w-96"/><Link href="/dashboard/administracion/proveedores/tickets/anadir" className="cursor-pointer rounded bg-blue-950 px-5 py-2 text-white transition hover:bg-blue-800">Añadir</Link></div>
    <div className="overflow-x-auto bg-white shadow"><table className="min-w-full text-sm"><thead className="bg-blue-950 text-white"><tr>{["ID","Fecha","Proveedor","Base imponible","Total","Forma de pago","Archivo"].map(x=><th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{shown.map(row=><tr key={row.id_ticket} className="border-b transition hover:bg-blue-50"><td className="p-3">{row.id_ticket}</td><td className="p-3">{row.fecha_ticket}</td><td className="p-3">{row.proveedor}</td><td className="p-3">{Number(row.base_imponible).toFixed(2)} €</td><td className="p-3">{Number(row.importe_total).toFixed(2)} €</td><td className="p-3">{row.forma_pago}</td><td className="p-3"><a href={row.documento_src} target="_blank" className="cursor-pointer text-blue-700 underline hover:text-blue-950">Ver PDF</a></td></tr>)}{!shown.length&&<tr><td colSpan={7} className="p-8 text-center text-gray-500">No hay tickets.</td></tr>}</tbody></table></div>
  </main></div>;
}
