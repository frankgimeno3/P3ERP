"use client";

import React, { FC, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PropuestaService } from "@/app/service/PropuestaService";

interface MisPendientesProps {
  clienteFiltro: string;
  codigoCRMFiltro: string;
  agenteActual: string;
  fechaInicio: string;
  fechaFin: string;
}

const MisPendientes: FC<MisPendientesProps> = ({
  clienteFiltro,
  codigoCRMFiltro,
  agenteActual,
  fechaInicio,
  fechaFin,
}) => {
  const router = useRouter();
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    PropuestaService.getPropuestas({
      cliente: clienteFiltro,
      codigo_crm: codigoCRMFiltro,
      agente: agenteActual,
      estado: "Pendiente",
    })
      .then((data) => setPropuestas(Array.isArray(data) ? data : []))
      .catch(() => setPropuestas([]))
      .finally(() => setLoading(false));
  }, [clienteFiltro, codigoCRMFiltro, agenteActual]);

  const resultadosFiltrados = propuestas.filter((propuesta) => {
    const fecha = propuesta.fecha_envio_propuesta ? new Date(propuesta.fecha_envio_propuesta) : null;
    const values: Record<string, string> = {
      id_propuesta: String(propuesta.id_propuesta || ""),
      empresa: String(propuesta.cuenta?.nombre_empresa || propuesta.id_cuenta_propuesta || ""),
      precio: String(propuesta.importe_propuesta_con_iva || propuesta.importe_total_bi_propuesta || 0),
      fecha: String(propuesta.fecha_envio_propuesta || ""),
    };
    return (
      (!fechaInicio || (fecha && fecha >= new Date(fechaInicio))) &&
      (!fechaFin || (fecha && fecha <= new Date(fechaFin))) &&
      Object.entries(filters).every(([field, query]) => !query.trim() || values[field]?.toLowerCase().includes(query.trim().toLowerCase()))
    );
  });

  return (
    <div className="h-full">
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[["id_propuesta","ID propuesta"],["empresa","Empresa"],["precio","Precio"],["fecha","Fecha de envío"]].map(([field,label]) => <label key={field} className="text-sm"><span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{label}</span><input type="search" value={filters[field] || ""} onChange={event => setFilters(current => ({...current,[field]:event.target.value}))} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-950" /></label>)}
      </div>
      <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-blue-950 text-white">
          <tr>
            <th className="p-2 text-left">ID propuesta</th>
            <th className="p-2 text-left">Empresa</th>
            <th className="p-2 text-left">Precio</th>
            <th className="p-2 text-left">Fecha de envío</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={4} className="p-4 text-gray-500">Cargando propuestas...</td></tr>}
          {!loading && resultadosFiltrados.length === 0 && <tr><td colSpan={4} className="p-4 text-gray-500">No hay propuestas para mostrar.</td></tr>}
          {resultadosFiltrados.map((res) => (
            <tr
              key={res.id_propuesta}
              onClick={() => router.push(`/dashboard/comercial/propuestas/${res.id_propuesta}`)}
              className="cursor-pointer border-b border-gray-200 transition hover:bg-gray-50"
            >
              <td className="p-2 font-medium text-blue-950">{res.id_propuesta}</td>
              <td className="p-2">{res.cuenta?.nombre_empresa || res.id_cuenta_propuesta}</td>
              <td className="p-2">{Number(res.importe_propuesta_con_iva || res.importe_total_bi_propuesta || 0).toFixed(2)} EUR</td>
              <td className="p-2">{res.fecha_envio_propuesta || "Sin fecha"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default MisPendientes;
