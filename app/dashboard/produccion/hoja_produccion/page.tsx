"use client";

import React, { FC, useEffect, useState } from "react";
import MiddleNav from "../../../general_components/componentes_recurrentes/MiddleNav";
import { HojaProduccionService } from "@/app/service/HojaProduccionService";

interface HojaProduccionContenido {
  id_contenido: string;
  agente: string;
  cliente: string;
  contrato: string;
  factura: string;
  tipo: string;
  contenido: string;
  estado: "Publicado" | "Pendiente de publicar" | string;
  pagina: string;
  caducidad: string;
  ano_publicacion: string;
}

const currentYear = String(new Date().getFullYear());

const Materiales: FC = () => {
  const [tabs, setTabs] = useState<string[]>(["2026", "2025"]);
  const [year, setYear] = useState("2026");
  const [contenidos, setContenidos] = useState<HojaProduccionContenido[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    HojaProduccionService.getContenidos({ year })
      .then((data) => setContenidos(Array.isArray(data) ? data : []))
      .catch((error) => {
        setError(error?.message || "No se pudo cargar la hoja de producción.");
        setContenidos([]);
      })
      .finally(() => setLoading(false));
  }, [year]);

  const agregarAnoActual = () => {
    setTabs((prev) => {
      if (prev.includes(currentYear)) return prev;
      return [currentYear, ...prev].sort((a, b) => Number(b) - Number(a));
    });
    setYear(currentYear);
  };

  return (
    <div className="flex flex-col h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal="Hoja de producción" />
      <div className="bg-gray-200 min-h-screen p-12 text-gray-600">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex flex-row justify-between items-center gap-4 mb-6">
            <h2 className="text-xl font-bold">Publicación de contenidos</h2>
            <button
              type="button"
              onClick={agregarAnoActual}
              className="bg-blue-950 text-white rounded-lg px-4 py-2 text-sm shadow-xl hover:bg-blue-900 cursor-pointer"
            >
              Agregar pestaña año actual
            </button>
          </div>

          <div className="flex flex-row relative mb-4">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={`p-3 rounded-tr-lg cursor-pointer w-52 text-center transition-all duration-300 ${
                  year === tab
                    ? "bg-blue-950 text-white z-30 rounded-tl-lg"
                    : "z-10 bg-gray-100 hover:bg-gray-200"
                }`}
                style={{ marginLeft: index === 0 ? "0px" : "-5px" }}
                onClick={() => setYear(tab)}
              >
                Publicadas {tab}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="min-w-full">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="text-left p-2 font-light">Agente</th>
                  <th className="text-left p-2 font-light">Cliente</th>
                  <th className="text-left p-2 font-light">Contrato</th>
                  <th className="text-left p-2 font-light">Factura</th>
                  <th className="text-left p-2 font-light">Tipo</th>
                  <th className="text-left p-2 font-light">Contenido</th>
                  <th className="text-left p-2 font-light">Estado</th>
                  <th className="text-left p-2 font-light">Página</th>
                  <th className="text-left p-2 font-light">Caducidad</th>
                </tr>
              </thead>
              <tbody>
                {contenidos.map((contenido) => (
                  <tr key={contenido.id_contenido} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="p-2 border-b border-gray-200">{contenido.agente || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.cliente || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.contrato || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.factura || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.tipo || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.contenido || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.estado || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.pagina || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.caducidad || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && <p className="mt-4 text-center text-gray-500">Cargando contenidos...</p>}
            {!loading && error && <p className="mt-4 text-center text-red-600">{error}</p>}
            {!loading && !error && contenidos.length === 0 && (
              <p className="mt-4 text-center text-gray-500">
                No hay contenidos de hoja de producción para {year}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Materiales;
