"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { TarifaService } from "@/app/service/TarifaService";

interface PaginaTarifa {
  id_pagina_tarifa: string;
  id_tarifa: string;
  array_id_servicios: string[];
}

interface Tarifa {
  id_tarifa: string;
  nombre_docu_tarifas: string;
  ano: string;
  version: string;
  idioma: string;
  estado_tarifa: string;
  paginas: PaginaTarifa[];
}

const tabs = [
  { key: "vigente", label: "Tarifas vigentes" },
  { key: "deprecada", label: "Tarifas deprecadas" },
] as const;

export default function EditorTarifasPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"vigente" | "deprecada">("vigente");
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    TarifaService.getTarifas({ estado: activeTab })
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        setTarifas(items);
        setSelectedId(items[0]?.id_tarifa || "");
      })
      .catch((error) => {
        setError(error?.message || "No se han podido cargar las tarifas.");
        setTarifas([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  const selectedTarifa = useMemo(
    () => tarifas.find((tarifa) => tarifa.id_tarifa === selectedId) || null,
    [selectedId, tarifas],
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Editar Tarifas" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-8 text-gray-600">
        <div className="mb-4 flex flex-row">
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`w-52 cursor-pointer rounded-tr-lg p-3 text-center text-sm transition-all duration-300 ${
                activeTab === tab.key ? "z-30 rounded-tl-lg bg-blue-950 text-white" : "z-10 bg-white text-gray-700 hover:bg-gray-200"
              }`}
              style={{ marginLeft: index === 0 ? "0px" : "-5px" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-[minmax(520px,1fr)_420px] gap-5">
          <div className="bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-blue-950">Documentos de tarifas</h2>
            <table className="w-full text-sm">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Documento</th>
                  <th className="p-2 text-left">Ano</th>
                  <th className="p-2 text-left">Version</th>
                  <th className="p-2 text-left">Idioma</th>
                  <th className="p-2 text-left">Estado</th>
                  <th className="p-2 text-right">Paginas</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="p-4 text-gray-500">Cargando tarifas...</td></tr>}
                {!loading && tarifas.length === 0 && <tr><td colSpan={7} className="p-4 text-gray-500">No hay tarifas para mostrar.</td></tr>}
                {!loading && tarifas.map((tarifa) => (
                  <tr
                    key={tarifa.id_tarifa}
                    onMouseEnter={() => setSelectedId(tarifa.id_tarifa)}
                    onClick={() => router.push(`/dashboard/produccion/servicios/editor_tarifas/${tarifa.id_tarifa}`)}
                    className={`cursor-pointer border-b border-gray-200 hover:bg-gray-50 ${selectedId === tarifa.id_tarifa ? "bg-blue-50" : ""}`}
                  >
                    <td className="p-2 font-medium text-blue-950">{tarifa.id_tarifa}</td>
                    <td className="p-2">{tarifa.nombre_docu_tarifas}</td>
                    <td className="p-2">{tarifa.ano}</td>
                    <td className="p-2">{tarifa.version}</td>
                    <td className="p-2">{tarifa.idioma}</td>
                    <td className="p-2">{tarifa.estado_tarifa || "vigente"}</td>
                    <td className="p-2 text-right">{tarifa.paginas?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-blue-950">Paginas</h2>
            {!selectedTarifa ? (
              <p className="text-sm text-gray-500">Selecciona un documento de tarifas.</p>
            ) : (
              <div className="space-y-3">
                <div className="border border-gray-200 p-3">
                  <p className="text-xs uppercase text-gray-500">Documento seleccionado</p>
                  <p className="mt-1 font-semibold text-gray-800">{selectedTarifa.nombre_docu_tarifas}</p>
                </div>

                {selectedTarifa.paginas.map((pagina) => (
                  <div key={pagina.id_pagina_tarifa} className="border border-gray-200 p-3">
                    <p className="font-medium text-gray-800">{pagina.id_pagina_tarifa}</p>
                    <p className="mt-2 text-xs uppercase text-gray-500">Servicios en pagina</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(pagina.array_id_servicios || []).map((idServicio) => (
                        <span key={idServicio} className="bg-gray-100 px-2 py-1 text-xs text-gray-700">{idServicio}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
