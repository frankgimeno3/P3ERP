"use client";

import React, { FC, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FolderSvg from "../svg/FolderSvg";
import { PropuestaService } from "@/app/service/PropuestaService";

interface TodasPropuestasProps {
  clienteFiltro: string;
  codigoCRMFiltro: string;
  agenteFiltro: string;
  fechaInicio: string;
  fechaFin: string;
  estadoFiltro: string;
}

const TodasPropuestas: FC<TodasPropuestasProps> = ({
  clienteFiltro,
  codigoCRMFiltro,
  agenteFiltro,
  fechaInicio,
  fechaFin,
  estadoFiltro,
}) => {
  const router = useRouter();
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    PropuestaService.getPropuestas({
      cliente: clienteFiltro,
      codigo_crm: codigoCRMFiltro,
      agente: agenteFiltro,
      estado: estadoFiltro,
    })
      .then((data) => setPropuestas(Array.isArray(data) ? data : []))
      .catch(() => setPropuestas([]))
      .finally(() => setLoading(false));
  }, [clienteFiltro, codigoCRMFiltro, agenteFiltro, estadoFiltro]);

  const resultados = useMemo(() => {
    const agrupadas = new Map<string, any>();
    for (const propuesta of propuestas) {
      const idCuenta = propuesta.id_cuenta_propuesta || "sin-cuenta";
      const current = agrupadas.get(idCuenta) ?? {
        id: idCuenta,
        nombreEmpresa: propuesta.cuenta?.nombre_empresa || `Cuenta ${idCuenta}`,
        codigoCRM: idCuenta,
        numeroPropuestas: 0,
        agenteAsignado: propuesta.id_agente_propuesta || "",
        fechaUltimaPropuesta: "",
        estadosIncluidos: new Set<string>(),
      };
      current.numeroPropuestas += 1;
      current.estadosIncluidos.add(propuesta.estado_propuesta || "");
      if (!current.fechaUltimaPropuesta || String(propuesta.fecha_envio_propuesta || "") > current.fechaUltimaPropuesta) {
        current.fechaUltimaPropuesta = propuesta.fecha_envio_propuesta || "";
      }
      agrupadas.set(idCuenta, current);
    }
    return Array.from(agrupadas.values()).map((item) => ({
      ...item,
      estadosIncluidos: Array.from(item.estadosIncluidos).filter(Boolean),
    }));
  }, [propuestas]);

  const resultadosFiltrados = resultados.filter((item) => {
    const fecha = item.fechaUltimaPropuesta ? new Date(item.fechaUltimaPropuesta) : null;
    return (
      (!fechaInicio || (fecha && fecha >= new Date(fechaInicio))) &&
      (!fechaFin || (fecha && fecha <= new Date(fechaFin)))
    );
  });

  return (
    <div className="h-full overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700 rounded-lg border border-gray-700">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left"></th>
            <th className="px-4 py-3 text-left">Nombre Empresa</th>
            <th className="px-4 py-3 text-left">Codigo CRM</th>
            <th className="px-4 py-3 text-left">Agente asignado actual</th>
            <th className="px-4 py-3 text-left">Estados presentes</th>
            <th className="px-4 py-3 text-left">Fecha ultima propuesta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {resultadosFiltrados.map((res) => (
            <tr
              key={res.id}
              onClick={() => router.push(`/dashboard/comercial/propuestas/cuentas/${res.codigoCRM}`)}
              className="cursor-pointer transition-colors"
            >
              <td className="px-4 py-3"><FolderSvg /></td>
              <td className="px-4 py-3 text-sm">{res.nombreEmpresa}</td>
              <td className="px-4 py-3 text-sm">{res.codigoCRM}</td>
              <td className="px-4 py-3 text-sm">{res.agenteAsignado}</td>
              <td className="px-4 py-3 text-sm">{res.estadosIncluidos.join(", ")}</td>
              <td className="px-4 py-3 text-sm">{res.fechaUltimaPropuesta}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <p className="mt-4 text-center text-sm text-gray-500">Cargando propuestas...</p>}
      {!loading && resultadosFiltrados.length === 0 && <p className="mt-4 text-center text-sm text-gray-500">No se encontraron resultados.</p>}
    </div>
  );
};

export default TodasPropuestas;
