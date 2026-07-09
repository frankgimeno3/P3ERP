"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { NewsletterService } from "@/app/service/NewsletterService";
import { RevistaService } from "@/app/service/RevistaService";

const mainTabs = [
  { key: "revista", label: "Revista" },
  { key: "newsletter", label: "Newsletter" },
];

const newsletterTabs = [
  { key: "pendiente", label: "Pendiente de publicar", estado: "Pendiente" },
  { key: "publicado", label: "Publicado", estado: "Publicado" },
];

function filterRows(rows: any[], filters: Record<string, string>) {
  return rows.filter((row) =>
    Object.entries(filters).every(([key, value]: any) => {
      if (!value || (typeof value === "object" && !value.dd && !value.mm && !value.yyyy)) return true;
      if (typeof value === "object") return matchesDate(String(row[key] || ""), value);
      return !value.trim() || String(row[key] ?? "").toLowerCase().includes(value.trim().toLowerCase());
    }),
  );
}

function splitDate(value = "") {
  const [dd = "", mm = "", yyyy = ""] = String(value || "").split(/[/-]/);
  return { dd, mm, yyyy };
}

function matchesDate(value: string, filter: any) {
  const parts = splitDate(value);
  return (!filter.dd || parts.dd.padStart(2, "0").includes(filter.dd.padStart(2, "0")))
    && (!filter.mm || parts.mm.padStart(2, "0").includes(filter.mm.padStart(2, "0")))
    && (!filter.yyyy || parts.yyyy.includes(filter.yyyy));
}

function FilterInput({ filters, setFilters, field }: { filters: Record<string, any>; setFilters: any; field: string }) {
  return (
    <input
      value={filters[field] || ""}
      onChange={(event) => setFilters((current: Record<string, any>) => ({ ...current, [field]: event.target.value }))}
      className="w-full rounded border border-gray-300 px-2 py-2 text-sm text-gray-800 outline-none focus:border-blue-950"
    />
  );
}

function FilterSelect({ filters, setFilters, field, options }: { filters: Record<string, any>; setFilters: any; field: string; options: string[] }) {
  return (
    <select
      value={filters[field] || ""}
      onChange={(event) => setFilters((current: Record<string, any>) => ({ ...current, [field]: event.target.value }))}
      className="w-full rounded border border-gray-300 px-2 py-2 text-sm text-gray-800 outline-none focus:border-blue-950"
    >
      <option value="">Todos</option>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

function DateFilter({ filters, setFilters, field }: { filters: Record<string, any>; setFilters: any; field: string }) {
  const parts = filters[field] || {};
  const update = (part: string, value: string) => {
    setFilters((current: Record<string, any>) => ({
      ...current,
      [field]: { ...(current[field] || {}), [part]: value.replace(/\D/g, "") },
    }));
  };
  return (
    <div className="flex gap-2">
      <input value={parts.dd || ""} onChange={(event) => update("dd", event.target.value.slice(0, 2))} placeholder="dd" className="w-16 rounded border border-gray-300 px-2 py-2 text-sm outline-none focus:border-blue-950" />
      <input value={parts.mm || ""} onChange={(event) => update("mm", event.target.value.slice(0, 2))} placeholder="mm" className="w-16 rounded border border-gray-300 px-2 py-2 text-sm outline-none focus:border-blue-950" />
      <input value={parts.yyyy || ""} onChange={(event) => update("yyyy", event.target.value.slice(0, 4))} placeholder="yyyy" className="w-24 rounded border border-gray-300 px-2 py-2 text-sm outline-none focus:border-blue-950" />
    </div>
  );
}

export default function PublicacionesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("revista");
  const [newsletterTab, setNewsletterTab] = useState("pendiente");
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [revistas, setRevistas] = useState<any[]>([]);
  const [revistaFilters, setRevistaFilters] = useState<Record<string, any>>({});
  const [newsletterFilters, setNewsletterFilters] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (activeTab !== "revista") return;
    setLoading(true);
    setError("");
    RevistaService.getRevistas()
      .then((data) => setRevistas(Array.isArray(data) ? data : []))
      .catch((error) => {
        setError(error?.message || "No se han podido cargar las publicaciones de revista.");
        setRevistas([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "newsletter") return;
    const tab = newsletterTabs.find((item) => item.key === newsletterTab) || newsletterTabs[0];
    setLoading(true);
    setError("");
    NewsletterService.getNewsletters({ estado: tab.estado })
      .then((data) => setNewsletters(Array.isArray(data) ? data : []))
      .catch((error) => {
        setError(error?.message || "No se han podido cargar los newsletters.");
        setNewsletters([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab, newsletterTab]);

  const openRow = (event: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      window.open(href, "_blank");
      return;
    }
    router.push(href);
  };

  const revistasFiltradas = filterRows(revistas, revistaFilters);
  const newslettersFiltrados = filterRows(newsletters, newsletterFilters);
  const edicionOptions = Array.from(new Set(revistas.map((revista) => revista.edicion).filter(Boolean))).sort();
  const revistaOptions = Array.from(new Set(revistas.map((revista) => revista.revista).filter(Boolean))).sort();

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-700">
      <MiddleNav tituloprincipal="Publicaciones" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10">
        <div className="mb-5 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-700">
            Una publicacion es un soporte que se publica en una fecha determinada como iteracion de un medio. Cada numero de una revista es una publicacion, y cada envio de un newsletter es una publicacion; por eso cada publicacion tiene asociado un numero y referencia a su revista o newsletter.
          </p>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-row">
          {mainTabs.map((tab, index) => (
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
          <div className="flex gap-2">
            <button type="button" onClick={() => router.push("/dashboard/produccion/publicaciones/revistas/crear")} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
              Crear publicacion
            </button>
            <button type="button" onClick={() => router.push("/dashboard/produccion/publicaciones/newsletter/crear")} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
              Crear newsletter
            </button>
          </div>
        </div>

        {activeTab === "revista" && (
          <div className="bg-white p-6 shadow-sm">
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-6">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Revista</span>
                <FilterSelect filters={revistaFilters} setFilters={setRevistaFilters} field="revista" options={revistaOptions} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Edicion</span>
                <FilterSelect filters={revistaFilters} setFilters={setRevistaFilters} field="edicion" options={edicionOptions} />
              </label>
              {[
                ["numero_publicacion", "Numero"],
                ["version_publicacion", "Version"],
              ].map(([field, label]) => (
                <label key={field} className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{label}</span>
                  <FilterInput filters={revistaFilters} setFilters={setRevistaFilters} field={field} />
                </label>
              ))}
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Deadline materiales</span>
                <DateFilter filters={revistaFilters} setFilters={setRevistaFilters} field="deadline_materiales" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Fecha publicacion</span>
                <DateFilter filters={revistaFilters} setFilters={setRevistaFilters} field="fecha_publicacion" />
              </label>
            </div>
            <h2 className="mb-4 text-lg font-semibold text-blue-950">Revista</h2>
            {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-blue-950 text-white">
                  <tr>
                    <th className="p-2 text-left">Edicion</th>
                    <th className="p-2 text-left">Revista</th>
                    <th className="p-2 text-left">Numero</th>
                    <th className="p-2 text-left">Version</th>
                    <th className="p-2 text-left">Deadline materiales</th>
                    <th className="p-2 text-left">Fecha publicacion</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={6} className="p-4 text-gray-500">Cargando publicaciones de revista...</td></tr>}
                  {!loading && revistasFiltradas.length === 0 && <tr><td colSpan={6} className="p-4 text-gray-500">No hay publicaciones de revista.</td></tr>}
                  {!loading && revistasFiltradas.map((revista) => (
                    <tr
                      key={revista.id_publicacion || revista.id_revista}
                      onClick={(event) => openRow(event, `/dashboard/produccion/publicaciones/revistas/${revista.id_publicacion || revista.id_revista}`)}
                      className="cursor-pointer border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="p-2">{revista.edicion || "-"}</td>
                      <td className="p-2 font-medium text-blue-950">{revista.revista || "-"}</td>
                      <td className="p-2">{revista.numero_publicacion || revista.publicacion || "-"}</td>
                      <td className="p-2">{revista.version_publicacion || revista.impresa_o_digital || "-"}</td>
                      <td className="p-2">{revista.deadline_materiales || "-"}</td>
                      <td className="p-2">{revista.fecha_publicacion || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "newsletter" && (
          <div className="bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-row">
              {newsletterTabs.map((tab, index) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setNewsletterTab(tab.key)}
                  className={`w-52 cursor-pointer rounded-tr-lg p-3 text-center text-sm transition-all duration-300 ${
                    newsletterTab === tab.key ? "z-30 rounded-tl-lg bg-blue-950 text-white" : "z-10 bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  style={{ marginLeft: index === 0 ? "0px" : "-5px" }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-6">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Newsletter</span>
                <FilterInput filters={newsletterFilters} setFilters={setNewsletterFilters} field="nombre_newsletter" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Edicion</span>
                <FilterInput filters={newsletterFilters} setFilters={setNewsletterFilters} field="edicion" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Numero</span>
                <FilterInput filters={newsletterFilters} setFilters={setNewsletterFilters} field="numero_publicacion" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Deadline materiales</span>
                <DateFilter filters={newsletterFilters} setFilters={setNewsletterFilters} field="deadline_materiales" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Fecha publicacion</span>
                <DateFilter filters={newsletterFilters} setFilters={setNewsletterFilters} field="fecha_publicacion" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Link</span>
                <FilterInput filters={newsletterFilters} setFilters={setNewsletterFilters} field="link" />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-blue-950 text-white">
                  <tr>
                    <th className="p-2 text-left">Newsletter</th>
                    <th className="p-2 text-left">Edicion</th>
                    <th className="p-2 text-left">Numero</th>
                    <th className="p-2 text-left">Deadline materiales</th>
                    <th className="p-2 text-left">Fecha publicacion</th>
                    <th className="p-2 text-left">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={6} className="p-4 text-gray-500">Cargando newsletters...</td></tr>}
                  {!loading && newslettersFiltrados.length === 0 && <tr><td colSpan={6} className="p-4 text-gray-500">No hay newsletters.</td></tr>}
                  {!loading && newslettersFiltrados.map((newsletter) => (
                    <tr
                      key={newsletter.id_publicacion || newsletter.id_newsletter}
                      onClick={(event) => openRow(event, `/dashboard/produccion/publicaciones/newsletter/${newsletter.id_publicacion || newsletter.id_newsletter}`)}
                      className="cursor-pointer border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="p-2 font-medium text-blue-950">{newsletter.nombre_newsletter || newsletter.titulo || "-"}</td>
                      <td className="p-2">{newsletter.edicion || "-"}</td>
                      <td className="p-2">{newsletter.numero_publicacion || newsletter.numero || "-"}</td>
                      <td className="p-2">{newsletter.deadline_materiales || "-"}</td>
                      <td className="p-2">{newsletter.fecha_publicacion || "-"}</td>
                      <td className="p-2">{newsletter.link || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
