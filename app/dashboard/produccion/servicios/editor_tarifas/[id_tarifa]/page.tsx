"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { TarifaService } from "@/app/service/TarifaService";

function formatPrice(value: any, fallback = "") {
  const number = Number(value);
  if (Number.isFinite(number) && number > 0) {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(number);
  }
  return fallback || "-";
}

export default function TarifaDetallePage() {
  const params = useParams<{ id_tarifa: string }>();
  const [tarifa, setTarifa] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id_tarifa) return;
    setLoading(true);
    setError("");
    TarifaService.getTarifaById(params.id_tarifa)
      .then(setTarifa)
      .catch((error) => setError(error?.message || "No se ha podido cargar la tarifa."))
      .finally(() => setLoading(false));
  }, [params.id_tarifa]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-700">
      <MiddleNav tituloprincipal="Detalle tarifa" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10">
        <Link href="/dashboard/produccion/servicios/editor_tarifas" className="mb-5 inline-flex rounded bg-white px-4 py-2 text-sm text-blue-950 shadow-sm hover:bg-gray-50">
          Volver a tarifas
        </Link>

        {loading && <div className="bg-white p-6 text-sm text-gray-500">Cargando tarifa...</div>}
        {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {!loading && tarifa && (
          <div className="space-y-6">
            <section className="bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase text-gray-400">ID tarifa</p>
              <h1 className="mt-1 text-xl font-semibold text-blue-950">{tarifa.id_tarifa}</h1>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-5">
                {[
                  ["Documento", tarifa.nombre_docu_tarifas],
                  ["Ano", tarifa.ano],
                  ["Version", tarifa.version],
                  ["Idioma", tarifa.idioma],
                  ["Estado", tarifa.estado_tarifa],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-gray-100 pb-3">
                    <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
                    <p className="mt-1 text-sm text-gray-800">{value || "-"}</p>
                  </div>
                ))}
              </div>
            </section>

            {(tarifa.paginas || []).map((pagina: any) => (
              <section key={pagina.id_pagina_tarifa} className="bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-blue-950">{pagina.id_pagina_tarifa}</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-blue-950 text-white">
                      <tr>
                        <th className="p-2 text-left">Servicio</th>
                        <th className="p-2 text-left">Grupo</th>
                        <th className="p-2 text-left">Medio</th>
                        <th className="p-2 text-left">Publicacion</th>
                        <th className="p-2 text-left">Nombre</th>
                        <th className="p-2 text-left">Precio</th>
                        <th className="p-2 text-left">Deadline</th>
                        <th className="p-2 text-left">Publicacion en</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!pagina.servicios || pagina.servicios.length === 0) && <tr><td colSpan={8} className="p-4 text-gray-500">No hay servicios en esta pagina.</td></tr>}
                      {pagina.servicios?.map((servicio: any) => (
                        <tr key={servicio.id_servicio} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <Link href={`/dashboard/produccion/servicios/${servicio.id_servicio}`} className="font-medium text-blue-950 underline">
                              {servicio.id_servicio}
                            </Link>
                          </td>
                          <td className="p-2">{servicio.nombre_medio || servicio.id_medio || "-"}</td>
                          <td className="p-2">{servicio.medio_servicio_es || "-"}</td>
                          <td className="p-2">{servicio.publicacion_servicio_es || "-"}</td>
                          <td className="p-2">{servicio.nombre_servicio_es || "-"}</td>
                          <td className="p-2">{formatPrice(servicio.precio_tarifa, servicio.precio_servicio)}</td>
                          <td className="p-2">{servicio.fecha_deadline_servicio || "-"}</td>
                          <td className="p-2">{servicio.fecha_publicacion_servicio || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
