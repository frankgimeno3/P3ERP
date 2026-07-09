"use client";

import React, { FC, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PropSvg from "../svg/PropSvg";
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
    return (
      (!fechaInicio || (fecha && fecha >= new Date(fechaInicio))) &&
      (!fechaFin || (fecha && fecha <= new Date(fechaFin)))
    );
  });

  return (
    <div className="h-full overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700 rounded-lg border border-gray-700">
        <thead>
          <tr className="text-left">
            <th className="px-4 py-3 text-left">ID Propuesta</th>
            <th className="px-4 py-3 text-left">Nombre Empresa</th>
            <th className="px-4 py-3 text-left">Precio</th>
            <th className="px-4 py-3 text-left">Fecha de envio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {resultadosFiltrados.map((res) => (
            <tr
              key={res.id_propuesta}
              onClick={() => router.push(`/dashboard/comercial/propuestas/${res.id_propuesta}`)}
              className="cursor-pointer transition-colors"
            >
              <td className="flex flex-row items-center gap-2 px-4 py-3 text-sm">
                <PropSvg />
                {res.id_propuesta}
              </td>
              <td className="px-4 py-3 text-sm">{res.cuenta?.nombre_empresa || res.id_cuenta_propuesta}</td>
              <td className="px-4 py-3 text-sm">{Number(res.importe_propuesta_con_iva || res.importe_total_bi_propuesta || 0).toFixed(2)} EUR</td>
              <td className="px-4 py-3 text-sm">{res.fecha_envio_propuesta || "Sin fecha"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <p className="mt-4 text-center text-sm text-gray-500">Cargando propuestas...</p>}
      {!loading && resultadosFiltrados.length === 0 && <p className="mt-4 text-center text-sm text-gray-500">No se encontraron resultados.</p>}
    </div>
  );
};

export default MisPendientes;
