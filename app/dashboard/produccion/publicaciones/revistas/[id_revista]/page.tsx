"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { RevistaService } from "@/app/service/RevistaService";
import { ContenidoService } from "@/app/service/ContenidoService";
import PublicationLayout from "./PublicationLayout";
import SelectedContentActions from "./SelectedContentActions";

function splitDate(value = "") {
  const [dd = "", mm = "", yyyy = ""] = String(value).split(/[/-]/);
  return { dd, mm, yyyy };
}

function joinDate(parts: any) {
  return [parts.dd, parts.mm, parts.yyyy].map((part) => String(part || "").padStart(part.length === 4 ? 4 : 2, "0")).join("/");
}

function DateInputs({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [parts, setParts] = useState(splitDate(value));

  useEffect(() => setParts(splitDate(value)), [value]);

  const update = (field: string, nextValue: string) => {
    const next = { ...parts, [field]: nextValue.replace(/\D/g, "") };
    setParts(next);
    onChange(joinDate(next));
  };

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-gray-500">{label}</p>
      <div className="flex gap-2">
        <input value={parts.dd} onChange={(event) => update("dd", event.target.value.slice(0, 2))} placeholder="dd" className="w-16 rounded border px-2 py-2 text-sm" />
        <input value={parts.mm} onChange={(event) => update("mm", event.target.value.slice(0, 2))} placeholder="mm" className="w-16 rounded border px-2 py-2 text-sm" />
        <input value={parts.yyyy} onChange={(event) => update("yyyy", event.target.value.slice(0, 4))} placeholder="yyyy" className="w-24 rounded border px-2 py-2 text-sm" />
      </div>
    </div>
  );
}

export default function RevistaDetallePage() {
  const router = useRouter();
  const params = useParams<{ id_revista: string }>();
  const [revista, setRevista] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "planillo">("general");
  const [planillo, setPlanillo] = useState<any>({ num_paginas: 0, paginas: [] });
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [contents, setContents] = useState<any[]>([]);

  useEffect(() => {
    if (!params.id_revista) return;
    setLoading(true);
    RevistaService.getRevistaById(params.id_revista)
      .then((data) => {
        setRevista(data);
        setForm(data);
      })
      .catch((error) => setError(error?.message || "No se ha podido cargar la revista."))
      .finally(() => setLoading(false));
  }, [params.id_revista]);

  useEffect(() => {
    if (!params.id_revista) return;
    RevistaService.getPaginas(params.id_revista).then(setPlanillo).catch(() => setPlanillo({ num_paginas: 0, paginas: [] }));
    ContenidoService.getContenidos().then((data) => setContents(Array.isArray(data) ? data : [])).catch(() => setContents([]));
  }, [params.id_revista]);

  const save = async () => {
    if (!revista?.id_revista && !revista?.id_publicacion) return;
    setSaving(true);
    setError("");
    try {
      const updated = await RevistaService.updateRevista(revista.id_publicacion || revista.id_revista, form);
      setRevista(updated);
      setForm(updated);
    } catch (error: any) {
      setError(error?.message || "No se ha podido guardar la revista.");
    } finally {
      setSaving(false);
    }
  };

  const changeNumPages = async (value: number) => {
    setSaving(true);
    setError("");
    try {
      const updated = await RevistaService.setNumeroPaginas(params.id_revista, value);
      setPlanillo(updated);
      setSelectedPageIds((current) => current.filter((id) => updated.paginas.some((page: any) => page.id_pagina_publicacion === id)));
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || "No se ha podido actualizar el número de páginas.");
    } finally {
      setSaving(false);
    }
  };

  const updateSelectedPage = async (data: Partial<{ has_content: boolean; id_contenido: string | null; nombre_mostrado: string; tipo: string }>) => {
    if (!selectedPageIds.length) return;
    setSaving(true);
    try {
      await Promise.all(selectedPageIds.map((id) => RevistaService.updatePagina(params.id_revista, id, data)));
      setPlanillo(await RevistaService.getPaginas(params.id_revista));
    } finally {
      setSaving(false);
    }
  };

  const assignContent = async (contentId: string, conflictAction?: "replace" | "shift") => {
    setSaving(true);
    try {
      const updated = await RevistaService.pageAction(params.id_revista, {
        action: "assign_content",
        page_ids: selectedPageIds,
        id_contenido: contentId,
        conflict_action: conflictAction,
      });
      setPlanillo(updated);
    } finally {
      setSaving(false);
    }
  };

  const deletePages = async (ids: string[]) => {
    setSaving(true);
    try {
      const updated = await RevistaService.pageAction(params.id_revista, { action: "delete_pages", page_ids: ids });
      setPlanillo(updated);
      setSelectedPageIds([]);
    } finally {
      setSaving(false);
    }
  };

  const publicationName = revista
    ? [revista.revista, revista.edicion, revista.numero_publicacion || revista.publicacion].filter(Boolean).join(" ")
    : "Revista";
  const selectedPages = planillo.paginas.filter((page: any) => selectedPageIds.includes(page.id_pagina_publicacion));

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-700">
      <MiddleNav tituloprincipal={publicationName} />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10">
        <button type="button" onClick={() => router.push("/dashboard/produccion/publicaciones")} className="mb-5 rounded bg-white px-4 py-2 text-sm text-blue-950 shadow-sm hover:bg-gray-50">
          Volver
        </button>
        {loading && <div className="bg-white p-6 text-sm text-gray-500">Cargando revista...</div>}
        {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {!loading && revista && (
          <div className="space-y-6">
            <div className="flex flex-row">
              {[
                ["general", "General"],
                ["planillo", "Planillo"],
              ].map(([key, label], index) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key as "general" | "planillo")}
                  className={`w-52 cursor-pointer rounded-tr-lg p-3 text-center text-sm transition-all duration-300 ${activeTab === key ? "z-30 rounded-tl-lg bg-blue-950 text-white" : "z-10 bg-white text-gray-700 hover:bg-gray-200"}`}
                  style={{ marginLeft: index === 0 ? "0px" : "-5px" }}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "general" && <section className="bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">Publicacion</p>
                  <h1 className="text-xl font-semibold text-blue-950">{revista.revista} {revista.edicion} numero {revista.numero_publicacion || revista.publicacion}</h1>
                  <p className="mt-1 text-sm text-gray-500">{revista.version_publicacion || revista.impresa_o_digital || "-"}</p>
                </div>
                <button type="button" onClick={save} disabled={saving} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:bg-gray-400">
                  Guardar
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                  ["revista", "Revista"],
                  ["edicion", "Edicion"],
                  ["numero_publicacion", "Numero"],
                  ["version_publicacion", "Version"],
                ].map(([field, label]) => (
                  <div key={field} className="text-sm">
                    <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{label}</span>
                    <p className="min-h-10 border border-gray-200 bg-gray-50 px-3 py-2 text-gray-800">{form[field] || "-"}</p>
                  </div>
                ))}
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Especial</span>
                  <input value={form.especial || ""} onChange={(event) => setForm({ ...form, especial: event.target.value })} className="w-full border border-gray-300 px-3 py-2" />
                </label>
              </div>
              <div className="mt-5 flex flex-wrap gap-8">
                <DateInputs label="Deadline materiales" value={form.deadline_materiales || ""} onChange={(value) => setForm({ ...form, deadline_materiales: value })} />
                <DateInputs label="Fecha publicacion" value={form.fecha_publicacion || ""} onChange={(value) => setForm({ ...form, fecha_publicacion: value })} />
              </div>
              <label className="mt-5 block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Editorial de la revista</span>
                <textarea
                  value={form.contenido_editorial || ""}
                  onChange={(event) => setForm({ ...form, contenido_editorial: event.target.value })}
                  className="min-h-48 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-950"
                  placeholder="Editorial de la revista"
                />
              </label>
              <div className="mt-8 border-t pt-6">
                <h2 className="mb-4 text-lg font-semibold text-blue-950">Contenidos</h2>
                <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-blue-950 text-white">
                    <tr>
                      <th className="p-2 text-left">Contenido</th>
                      <th className="p-2 text-left">Cuenta</th>
                      <th className="p-2 text-left">Servicio</th>
                      <th className="p-2 text-left">Estado</th>
                      <th className="p-2 text-left">Pagina</th>
                      <th className="p-2 text-left">Tipo pagina</th>
                      <th className="p-2 text-left">Pagina del contenido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!revista.contenidos || revista.contenidos.length === 0) && <tr><td colSpan={7} className="p-4 text-gray-500">No hay contenidos asociados.</td></tr>}
                    {revista.contenidos?.map((contenido: any) => (
                      <tr key={contenido.contenido_revista_id} className="cursor-pointer border-b hover:bg-gray-50" onClick={() => router.push(`/dashboard/produccion/hoja_produccion/contenidos/${contenido.contenido_id}`)}>
                        <td className="p-2 font-medium text-blue-950">{contenido.contenido || contenido.contenido_id}</td>
                        <td className="p-2">{contenido.cuenta || "-"}</td>
                        <td className="p-2">{contenido.servicio || "-"}</td>
                        <td className="p-2">{contenido.estado || "-"}</td>
                        <td className="p-2">{contenido.numero_pagina ?? "-"}</td>
                        <td className="p-2">{contenido.tipo_pagina || "-"}</td>
                        <td className="p-2">{contenido.pagina_del_contenido ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </section>}

            {activeTab === "planillo" && <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <PublicationLayout
                pages={planillo.paginas || []}
                numPages={Number(planillo.num_paginas || 0)}
                selectedIds={selectedPageIds}
                saving={saving}
                onSelect={(id) => setSelectedPageIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [id])}
                onChangeNumPages={changeNumPages}
              />
              <SelectedContentActions
                selectedPages={selectedPages}
                allPages={planillo.paginas || []}
                contents={contents}
                saving={saving}
                onSelectionChange={setSelectedPageIds}
                onUpdate={updateSelectedPage}
                onAssignContent={assignContent}
                onDeletePages={deletePages}
              />
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}
