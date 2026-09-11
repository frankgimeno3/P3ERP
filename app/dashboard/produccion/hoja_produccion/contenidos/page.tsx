"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { ContenidoService } from "@/app/service/ContenidoService";

const tabs = [
  { key: "pendiente", label: "Pendiente de publicar" },
  { key: "publicado", label: "Publicado" },
];

function formatDestino(contenido: any) {
  const destinos = [];
  if (contenido.destino_revista) destinos.push("Revista");
  if (contenido.destino_vidrioperfil) destinos.push("Vidrioperfil");
  if (String(contenido.medio || "").toLowerCase() === "newsletter") destinos.push("Newsletter");
  return destinos.length ? destinos.join(" + ") : "-";
}

function splitDate(value = "") {
  const [dd = "", mm = "", yyyy = ""] = String(value || "").split(/[/-]/);
  return { dd, mm, yyyy };
}

function matchesDate(value: string, filter: any) {
  if (!filter?.dd && !filter?.mm && !filter?.yyyy) return true;
  const parts = splitDate(value);
  return (!filter.dd || parts.dd.padStart(2, "0").includes(filter.dd.padStart(2, "0")))
    && (!filter.mm || parts.mm.padStart(2, "0").includes(filter.mm.padStart(2, "0")))
    && (!filter.yyyy || parts.yyyy.includes(filter.yyyy));
}

function normalizeRow(contenido: any) {
  const createdAtLabel = contenido.created_at ? new Date(contenido.created_at).toLocaleDateString("es-ES") : "";
  return {
    ...contenido,
    cuenta: contenido.nombre_cuenta || contenido.id_cuenta || "",
    destino: formatDestino(contenido),
    created_at_label: createdAtLabel,
  };
}

function DateFilter({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  const parts = value || {};
  const update = (field: string, nextValue: string) => onChange({ ...parts, [field]: nextValue.replace(/\D/g, "") });
  return (
    <div className="flex gap-2">
      <input value={parts.dd || ""} onChange={(event) => update("dd", event.target.value.slice(0, 2))} placeholder="dd" className="w-16 rounded border border-gray-300 px-2 py-2 text-sm outline-none focus:border-blue-950" />
      <input value={parts.mm || ""} onChange={(event) => update("mm", event.target.value.slice(0, 2))} placeholder="mm" className="w-16 rounded border border-gray-300 px-2 py-2 text-sm outline-none focus:border-blue-950" />
      <input value={parts.yyyy || ""} onChange={(event) => update("yyyy", event.target.value.slice(0, 4))} placeholder="yyyy" className="w-24 rounded border border-gray-300 px-2 py-2 text-sm outline-none focus:border-blue-950" />
    </div>
  );
}

function ContenidosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "pendiente");
  const [contenidos, setContenidos] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params: Record<string, string> = {};
    if (activeTab === "pendiente") params.estado = "Pendiente";
    if (activeTab === "publicado") params.estado = "Publicado";

    setLoading(true);
    setError("");
    setFilters({});
    ContenidoService.getContenidos(params)
      .then((data) => setContenidos(Array.isArray(data) ? data.map(normalizeRow) : []))
      .catch((error) => {
        console.error("Error fetching contenidos:", error);
        setError(error?.message || "No se han podido cargar los contenidos.");
        setContenidos([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  const showEstado = activeTab !== "pendiente";

  const contenidosFiltrados = useMemo(() => {
    return contenidos.filter((contenido) => {
      const textMatches = [
        ["cuenta", contenido.cuenta],
        ["contenido", contenido.contenido],
        ["destino", contenido.destino],
        ...(showEstado ? [["estado", contenido.estado]] : []),
      ].every(([field, value]) => !String(filters[field] || "").trim() || String(value || "").toLowerCase().includes(String(filters[field]).trim().toLowerCase()));

      return textMatches
        && matchesDate(contenido.fecha_maxima_publicacion_vidrioperfil || "", filters.fecha_maxima_publicacion_vidrioperfil)
        && matchesDate(contenido.created_at_label || "", filters.created_at_label);
    });
  }, [contenidos, filters, showEstado]);

  const setFilter = (field: string, value: any) => setFilters((current) => ({ ...current, [field]: value }));

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>, idContenido: string) => {
    const href = `/dashboard/produccion/hoja_produccion/contenidos/${idContenido}`;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      window.open(href, "_blank");
      return;
    }
    router.push(href);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Contenidos" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10 text-gray-600">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex flex-row">
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

          <Link href="/dashboard/produccion/hoja_produccion/crear" className="bg-blue-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-900">
            Agregar contenido
          </Link>
        </div>

        <div className="bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-blue-950">{tabs.find((tab) => tab.key === activeTab)?.label}</h2>
          {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className={`mb-5 grid grid-cols-1 gap-3 md:grid-cols-3 ${showEstado ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Cuenta</span>
              <input type="search" value={filters.cuenta || ""} onChange={(event) => setFilter("cuenta", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-950" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Contenido</span>
              <input type="search" value={filters.contenido || ""} onChange={(event) => setFilter("contenido", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-950" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Destino</span>
              <select value={filters.destino || ""} onChange={(event) => setFilter("destino", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-950">
                <option value="">Todos</option>
                <option value="Revista">Revista</option>
                <option value="Newsletter">Newsletter</option>
                <option value="Vidrioperfil">Vidrioperfil</option>
              </select>
            </label>
            {showEstado && (
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Estado</span>
                <input type="search" value={filters.estado || ""} onChange={(event) => setFilter("estado", event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-950" />
              </label>
            )}
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Fecha maxima VP</span>
              <DateFilter value={filters.fecha_maxima_publicacion_vidrioperfil} onChange={(value) => setFilter("fecha_maxima_publicacion_vidrioperfil", value)} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Creado</span>
              <DateFilter value={filters.created_at_label} onChange={(value) => setFilter("created_at_label", value)} />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-2 text-left">Cuenta</th>
                  <th className="p-2 text-left">Contenido</th>
                  <th className="p-2 text-left">Destino</th>
                  {showEstado && <th className="p-2 text-left">Estado</th>}
                  <th className="p-2 text-left">Fecha maxima VP</th>
                  <th className="p-2 text-left">Creado</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={showEstado ? 6 : 5} className="p-4 text-gray-500">Cargando contenidos...</td></tr>}
                {!loading && contenidosFiltrados.length === 0 && <tr><td colSpan={showEstado ? 6 : 5} className="p-4 text-gray-500">No hay contenidos para mostrar.</td></tr>}
                {!loading && contenidosFiltrados.map((contenido) => (
                  <tr key={contenido.id_contenido} onClick={(event) => handleRowClick(event, contenido.id_contenido)} className="cursor-pointer border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-2 font-medium text-blue-950">{contenido.cuenta || "-"}</td>
                    <td className="p-2">{contenido.contenido || "-"}</td>
                    <td className="p-2">{contenido.destino || "-"}</td>
                    {showEstado && <td className="p-2">{contenido.estado || "-"}</td>}
                    <td className="p-2">{contenido.fecha_maxima_publicacion_vidrioperfil || "-"}</td>
                    <td className="p-2">{contenido.created_at_label || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContenidosPageWithSuspense() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-100" />}><ContenidosPage /></Suspense>;
}
