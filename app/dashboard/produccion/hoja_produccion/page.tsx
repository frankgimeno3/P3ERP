"use client";

import React, { FC, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  estado: string;
  pagina: string;
  caducidad: string;
  fecha_publicacion?: string;
  ano_publicacion: string;
}

const currentYear = String(new Date().getFullYear());
const columns: [keyof HojaProduccionContenido, string][] = [
  ["agente", "Agente"],
  ["cliente", "Cliente"],
  ["contrato", "Contrato"],
  ["factura", "Factura"],
  ["tipo", "Tipo"],
  ["contenido", "Contenido"],
  ["estado", "Estado"],
  ["pagina", "Pagina"],
];

const Materiales: FC = () => {
  const router = useRouter();
  const [tabs, setTabs] = useState<string[]>(["2026", "2025"]);
  const [year, setYear] = useState("2026");
  const [contenidos, setContenidos] = useState<HojaProduccionContenido[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showPublished, setShowPublished] = useState(false);
  const [showOutOfContract, setShowOutOfContract] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    HojaProduccionService.getContenidos({ year })
      .then((data) => setContenidos(Array.isArray(data) ? data : []))
      .catch((error) => {
        setError(error?.message || "No se pudo cargar la hoja de produccion.");
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

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>, idContenido: string) => {
    const href = `/dashboard/produccion/hoja_produccion/contenidos/${idContenido}`;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      window.open(href, "_blank");
      return;
    }
    router.push(href);
  };

  const contenidosFiltrados = contenidos.filter((contenido) => {
    const estado = String(contenido.estado || "").toLowerCase();
    const hasContrato = Boolean(String(contenido.contrato || "").trim());
    const isPublished = estado.includes("publicad");
    if (!showPublished && isPublished) return false;
    if (!showOutOfContract && !hasContrato) return false;
    return columns.every(([field]) => !filters[field]?.trim() || String(contenido[field] ?? "").toLowerCase().includes(filters[field].trim().toLowerCase()));
  });

  return (
    <div className="flex flex-col h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal="Hoja de produccion" />
      <div className="bg-gray-200 min-h-screen p-12 text-gray-600">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex flex-row justify-between items-center gap-4 mb-6">
            <div className="max-w-3xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-950">
              Aqui se muestran todos los contenidos para los que hay compromiso con el cliente.
            </div>
            <div className="flex flex-row items-center gap-3">
              <Link href="/dashboard/produccion/hoja_produccion/crear" className="bg-blue-950 text-white rounded-lg px-4 py-2 text-sm shadow-xl hover:bg-blue-900 cursor-pointer">
                Agregar nuevo contenido
              </Link>
              <Link href="/dashboard/produccion/hoja_produccion/contenidos" className="border border-blue-950 bg-white px-4 py-2 text-sm text-blue-950 hover:bg-blue-50">
                Ver todos los contenidos
              </Link>
              <button type="button" onClick={agregarAnoActual} className="bg-blue-950 text-white rounded-lg px-4 py-2 text-sm shadow-xl hover:bg-blue-900 cursor-pointer">
                Agregar pestana ano actual
              </button>
            </div>
          </div>

          <div className="mb-5 grid gap-4 lg:grid-cols-2">
            <div className="border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-sm font-semibold text-blue-950">Mostrar contenido publicado?</p>
              <div className="inline-flex overflow-hidden rounded border border-blue-950 bg-white text-sm">
                <button type="button" onClick={() => setShowPublished(false)} className={`px-8 py-3 font-medium ${!showPublished ? "bg-blue-950 text-white" : "text-blue-950"}`}>No</button>
                <button type="button" onClick={() => setShowPublished(true)} className={`px-8 py-3 font-medium ${showPublished ? "bg-blue-950 text-white" : "text-blue-950"}`}>Si</button>
              </div>
              <p className="mt-3 text-sm text-gray-600">{showPublished ? "Se muestra contenido publicado y pendiente de publicar" : "Se muestra unicamente contenido pendiente de publicar"}</p>
            </div>
            <div className="border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-sm font-semibold text-blue-950">Mostrar contenidos fuera de contrato?</p>
              <div className="inline-flex overflow-hidden rounded border border-blue-950 bg-white text-sm">
                <button type="button" onClick={() => setShowOutOfContract(false)} className={`px-8 py-3 font-medium ${!showOutOfContract ? "bg-blue-950 text-white" : "text-blue-950"}`}>No</button>
                <button type="button" onClick={() => setShowOutOfContract(true)} className={`px-8 py-3 font-medium ${showOutOfContract ? "bg-blue-950 text-white" : "text-blue-950"}`}>Si</button>
              </div>
              <p className="mt-3 text-sm text-gray-600">{showOutOfContract ? "Se muestra contenido dentro y fuera de contrato (gratuito)" : "Se muestra unicamente contenido que aparece en contrato"}</p>
            </div>
          </div>

          <div className="flex flex-row relative mb-4">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={`p-3 rounded-tr-lg cursor-pointer w-52 text-center transition-all duration-300 ${year === tab ? "bg-blue-950 text-white z-30 rounded-tl-lg" : "z-10 bg-white text-gray-700 hover:bg-gray-200"}`}
                style={{ marginLeft: index === 0 ? "0px" : "-5px" }}
                onClick={() => setYear(tab)}
              >
                Publicacion en {tab}
              </button>
            ))}
          </div>

          <section className="mb-5 border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Busqueda</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {columns.map(([field, label]) => (
                <label key={field} className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{label}</span>
                  {field === "agente" || field === "estado" ? (
                    <select value={filters[field] || ""} onChange={(event) => setFilters({ ...filters, [field]: event.target.value })} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950">
                      <option value="">Todos</option>
                      {[...new Set(contenidos.map((contenido) => String(contenido[field] || "")).filter(Boolean))].sort().map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  ) : (
                    <input value={filters[field] || ""} onChange={(event) => setFilters({ ...filters, [field]: event.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-950" />
                  )}
                </label>
              ))}
            </div>
          </section>

          <div className="overflow-x-auto text-xs">
            <table className="min-w-full">
              <thead className="bg-blue-950 text-white">
                <tr>
                  {columns.map(([field, label]) => <th key={field} className="text-left p-2 font-light">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {contenidosFiltrados.map((contenido) => (
                  <tr key={contenido.id_contenido} onClick={(event) => handleRowClick(event, contenido.id_contenido)} className="cursor-pointer border-t border-gray-200 hover:bg-gray-50">
                    <td className="p-2 border-b border-gray-200">{contenido.agente || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.cliente || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.contrato || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.factura || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.tipo || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.contenido || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.estado || "-"}</td>
                    <td className="p-2 border-b border-gray-200">{contenido.pagina || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && <p className="mt-4 text-center text-gray-500">Cargando contenidos...</p>}
            {!loading && error && <p className="mt-4 text-center text-red-600">{error}</p>}
            {!loading && !error && contenidosFiltrados.length === 0 && <p className="mt-4 text-center text-gray-500">No hay contenidos de hoja de produccion para {year}.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Materiales;
