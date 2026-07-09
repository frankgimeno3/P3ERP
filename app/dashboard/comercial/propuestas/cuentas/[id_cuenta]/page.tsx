"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { CuentaService } from "@/app/service/CuentaService";
import { PropuestaService } from "@/app/service/PropuestaService";

export default function PropuestasCuenta({ params }: { params: Promise<{ id_cuenta: string }> }) {
  const { id_cuenta } = use(params);
  const [cuenta, setCuenta] = useState<any>(null);
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      CuentaService.getCuentaById(id_cuenta).catch(() => null),
      PropuestaService.getPropuestas({ id_cuenta }).catch(() => []),
    ])
      .then(([cuentaData, propuestasData]) => {
        setCuenta(cuentaData);
        setPropuestas(Array.isArray(propuestasData) ? propuestasData : []);
      })
      .finally(() => setLoading(false));
  }, [id_cuenta]);

  const grupos = ["Borrador", "Pendiente", "Aceptada", "Rechazada"];

  return (
    <div className="min-h-screen bg-gray-100 text-gray-600">
      <MiddleNav tituloprincipal={`Propuestas de ${cuenta?.nombre_empresa || id_cuenta}`} />
      <div className="px-12 py-6">
        <div className="mb-5 flex justify-end gap-3">
          <Link href={`/dashboard/comercial/propuestas/crear?cuenta=${encodeURIComponent(id_cuenta)}`} className="rounded-lg bg-blue-950 px-4 py-2 text-white">
            Crear propuesta para esta cuenta
          </Link>
          <Link href={`/dashboard/comercial/cuentas/${encodeURIComponent(id_cuenta)}`} className="rounded-lg border border-blue-950 px-4 py-2 text-blue-950">
            Volver a cuenta
          </Link>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-xl">
          {loading ? (
            <p>Cargando propuestas...</p>
          ) : (
            <div className="space-y-8">
              {grupos.map((estado) => {
                const rows = propuestas.filter((item) => String(item.estado_propuesta ?? "") === estado);
                return (
                  <section key={estado}>
                    <h2 className="mb-3 font-semibold">{estado} ({rows.length})</h2>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-left">
                          <tr>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Agente</th>
                            <th className="p-3">Fecha</th>
                            <th className="p-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((propuesta) => (
                            <tr key={propuesta.id_propuesta} className="border-t hover:bg-blue-50">
                              <td className="p-3">
                                <Link className="font-medium text-blue-800 hover:underline" href={`/dashboard/comercial/propuestas/${propuesta.id_propuesta}`}>
                                  {propuesta.nombre_propuesta || propuesta.id_propuesta}
                                </Link>
                              </td>
                              <td className="p-3">{propuesta.id_agente_propuesta || "-"}</td>
                              <td className="p-3">{propuesta.fecha_envio_propuesta || "-"}</td>
                              <td className="p-3 text-right">{Number(propuesta.importe_propuesta_con_iva || propuesta.importe_total_bi_propuesta || 0).toFixed(2)} EUR</td>
                            </tr>
                          ))}
                          {rows.length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-gray-400">Sin propuestas.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
