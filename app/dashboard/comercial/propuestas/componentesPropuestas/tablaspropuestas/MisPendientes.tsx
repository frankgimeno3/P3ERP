"use client";
import SortableTable from '@/app/components/SortableTable';


import {proposalDate} from '@/app/config/proposalDate';
import React, { FC, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PropuestaService } from "@/app/service/PropuestaService";

interface MisPendientesProps {
  columnFilters?: Record<string, string>;
  clienteFiltro: string;
  codigoCRMFiltro: string;
  agenteActual: string;
  fechaInicio: string;
  fechaFin: string;
}

const MisPendientes: FC<MisPendientesProps> = ({
  columnFilters: filters = {},
  clienteFiltro,
  codigoCRMFiltro,
  agenteActual,
  fechaInicio,
  fechaFin,
}) => {
  const router = useRouter();
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    const fecha = proposalDate(propuesta.fecha_envio_propuesta);
    const values: Record<string, string> = {
      id_propuesta: String(propuesta.id_propuesta || ""),
      empresa: String(propuesta.cuenta?.nombre_empresa || propuesta.id_cuenta_propuesta || ""),
      precio: String(propuesta.importe_propuesta_con_iva || propuesta.importe_total_bi_propuesta || 0),
      fecha: String(propuesta.fecha_envio_propuesta || ""),
    };
    return (
      (proposalDate(fechaInicio)===null || (fecha!==null && fecha >= proposalDate(fechaInicio)!)) &&
      (proposalDate(fechaFin)===null || (fecha!==null && fecha <= proposalDate(fechaFin)!)) &&
      Object.entries(filters).every(([field, query]) => !query.trim() || values[field]?.toLowerCase().includes(query.trim().toLowerCase()))
    );
  });

  return (
    <div className="h-full">
      <div className="overflow-x-auto">
      <SortableTable className="min-w-full text-sm">
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
      </SortableTable>
      </div>
    </div>
  );
};

export default MisPendientes;
