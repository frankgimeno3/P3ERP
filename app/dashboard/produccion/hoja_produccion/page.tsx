"use client";

import React, { FC, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MiddleNav from "../../../general_components/componentes_recurrentes/MiddleNav";
import { HojaProduccionService } from "@/app/service/HojaProduccionService";

interface HojaProduccionContenido {
  id_contenido: string;
  codigo_crm: string;
  agente: string;
  cliente: string;
  contrato: string;
  factura: string;
  publicacion_num_web: string;
  tipo: string;
  contenido: string;
  anuncio: string;
  articulo: string;
  estado: string;
  pagina: string;
  caducidad: string;
  comentarios: string;
  fecha_publicacion?: string;
  ano_publicacion: string;
}

const columns: [keyof HojaProduccionContenido, string][] = [
  ["id_contenido", "Identificador"],
  ["agente", "Agente"],
  ["codigo_crm", "Código CRM"],
  ["cliente", "Cliente"],
  ["contrato", "Contrato"],
  ["publicacion_num_web", "Publicación / Nº web"],
  ["tipo", "Tipo revista / servicio"],
  ["contenido", "Contenido/-"],
  ["anuncio", "Anuncio"],
  ["articulo", "Artículo"],
  ["estado", "Estado"],
  ["factura", "Factura"],
  ["pagina", "Página"],
  ["caducidad", "Caduca (web)"],
  ["comentarios", "Comentarios"],
];

const tableColumns = columns.filter(([field]) => !["codigo_crm", "publicacion_num_web", "factura", "comentarios"].includes(field));

const Materiales: FC = () => {
  const router = useRouter();
  const tabs = ["2026"];
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
    <div className="flex flex-col h-full min-h-screen text-[15px] text-gray-600">
      <MiddleNav tituloprincipal="Hoja de produccion" />
      <div className="bg-gray-200 min-h-screen p-0 text-gray-600">
        <div className="mb-5 bg-white p-5 text-[13px] text-gray-700 shadow-sm">
          Aqui se muestran todos los contenidos para los que hay compromiso con el cliente. Haz click en un elemento para ver los datos completos. Los artículos y anuncios van por separado en vez de en la misma línea.
        </div>
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="relative mb-4 flex flex-row flex-wrap items-center justify-between gap-3">
            <div className="flex flex-row">
              {tabs.map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={`w-52 cursor-pointer rounded-tr-lg p-3 text-center transition-all duration-300 ${year === tab ? "z-30 rounded-tl-lg bg-blue-950 text-white hover:bg-blue-900" : "z-10 bg-white text-gray-700 hover:bg-gray-200"}`}
                  style={{ marginLeft: index === 0 ? "0px" : "-5px" }}
                  onClick={() => setYear(tab)}
                >
                  Publicacion en {tab}
                </button>
              ))}
            </div>
            <div className="flex flex-row flex-wrap items-center justify-end gap-3">
              <Link href="/dashboard/produccion/hoja_produccion/crear" className="bg-blue-950 text-white rounded-lg px-4 py-2 text-[13px] shadow-xl hover:bg-blue-900 cursor-pointer">
                Agregar nuevo contenido
              </Link>
              <Link href="/dashboard/produccion/hoja_produccion/contenidos" className="cursor-pointer border border-blue-950 bg-white px-4 py-2 text-[13px] text-blue-950 hover:bg-blue-50">
                Ver todos los contenidos
              </Link>
            </div>
          </div>

          <details className="group mb-5 border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer rounded text-[13px] font-semibold uppercase text-gray-500 hover:bg-gray-50 hover:text-blue-950 group-open:mb-3">Filtros</summary>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {columns.map(([field, label]) => (
                <label key={field} className="text-[13px]">
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">{label}</span>
                  {["agente", "estado", "tipo", "anuncio", "articulo"].includes(field) ? (
                    <select value={filters[field] || ""} onChange={(event) => setFilters({ ...filters, [field]: event.target.value })} className="cursor-pointer hover:border-blue-950 w-full rounded border border-gray-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-950">
                      <option value="">Todos</option>
                      {[...new Set(contenidos.map((contenido) => String(contenido[field] || "")).filter(Boolean))].sort().map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  ) : (
                    <input value={filters[field] || ""} onChange={(event) => setFilters({ ...filters, [field]: event.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-[13px] outline-none focus:border-blue-950" />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col items-start gap-2 border border-gray-200 bg-gray-50 px-3 py-3">
                <p className="text-[13px] font-semibold text-blue-950">Mostrar contenidos fuera de contrato?</p>
                <div className="flex flex-row flex-wrap items-center gap-3">
                  <div className="inline-flex overflow-hidden rounded border border-blue-950 bg-white text-[11px]">
                    <button type="button" onClick={() => setShowOutOfContract(false)} className={`cursor-pointer px-3 py-1 font-medium hover:bg-blue-100 ${!showOutOfContract ? "bg-blue-950 text-white hover:bg-blue-900" : "text-blue-950"}`}>No</button>
                    <button type="button" onClick={() => setShowOutOfContract(true)} className={`cursor-pointer px-3 py-1 font-medium hover:bg-blue-100 ${showOutOfContract ? "bg-blue-950 text-white hover:bg-blue-900" : "text-blue-950"}`}>Si</button>
                  </div>
                  <p className="text-[13px] text-gray-600">{showOutOfContract ? "Se muestra contenido dentro y fuera de contrato (gratuito)" : "Se muestra unicamente contenido que aparece en contrato"}</p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 border border-gray-200 bg-gray-50 px-3 py-3">
                <p className="text-[13px] font-semibold text-blue-950">Mostrar contenido publicado?</p>
                <div className="flex flex-row flex-wrap items-center gap-3">
                  <div className="inline-flex overflow-hidden rounded border border-blue-950 bg-white text-[11px]">
                    <button type="button" onClick={() => setShowPublished(false)} className={`cursor-pointer px-3 py-1 font-medium hover:bg-blue-100 ${!showPublished ? "bg-blue-950 text-white hover:bg-blue-900" : "text-blue-950"}`}>No</button>
                    <button type="button" onClick={() => setShowPublished(true)} className={`cursor-pointer px-3 py-1 font-medium hover:bg-blue-100 ${showPublished ? "bg-blue-950 text-white hover:bg-blue-900" : "text-blue-950"}`}>Si</button>
                  </div>
                  <p className="text-[13px] text-gray-600">{showPublished ? "Se muestra contenido publicado y pendiente de publicar" : "Se muestra unicamente contenido pendiente de publicar"}</p>
                </div>
              </div>
            </div>
          </details>

          <div className="overflow-x-auto text-[11px]">
            <table className="min-w-full">
              <thead className="bg-blue-950 text-white">
                <tr>
                  {tableColumns.map(([field, label]) => <th key={field} className="text-left p-2 font-light">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {contenidosFiltrados.map((contenido) => (
                  <tr key={contenido.id_contenido} onClick={(event) => handleRowClick(event, contenido.id_contenido)} className="cursor-pointer border-t border-gray-200 hover:bg-gray-50">
                    {tableColumns.map(([field]) => (
                      <td key={field} className="border-b border-gray-200 p-2">{contenido[field] || "-"}</td>
                    ))}
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
