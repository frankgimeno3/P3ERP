"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { ContenidoService } from "@/app/service/ContenidoService";
import { MaterialService } from "@/app/service/MaterialService";

const estados = ["Pendiente", "Pendiente de publicar", "En revision", "Publicado"];

const fields = [
  { key: "contenido", label: "Contenido" },
  { key: "medio", label: "Medio" },
  { key: "servicio", label: "Servicio" },
  { key: "nombre_servicio", label: "Nombre servicio" },
  { key: "contenido_especifico_id", label: "Contenido especifico" },
  { key: "url_contenido", label: "URL contenido" },
  { key: "precio_producto", label: "Precio producto" },
  { key: "deadline_contenido", label: "Deadline contenido" },
  { key: "deadline_publicacion", label: "Deadline publicacion" },
  { key: "estado_material_contenido", label: "Estado material" },
  { key: "destino_revista", label: "Revista" },
  { key: "destino_vidrioperfil", label: "Vidrioperfil" },
  { key: "fecha_maxima_publicacion_vidrioperfil", label: "Fecha maxima Vidrioperfil" },
  { key: "tipo_articulo", label: "Tipo articulo" },
  { key: "destinos_publicacion", label: "Destinos" },
];

function formatValue(value: any) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export default function ContenidoDetallePage() {
  const router = useRouter();
  const params = useParams<{ id_contenido: string }>();
  const [contenido, setContenido] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [materiales, setMateriales] = useState<any[]>([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ nombre_material: "", validacion_produccion: "pendiente validar", comentarios: "", archivo_url: "" });

  useEffect(() => {
    if (!params.id_contenido) return;
    setLoading(true);
    setError("");
    ContenidoService.getContenidoById(params.id_contenido)
      .then(setContenido)
      .catch((error) => setError(error?.message || "No se ha podido cargar el contenido."))
      .finally(() => setLoading(false));
    MaterialService.getMateriales().then((rows) => setMateriales(Array.isArray(rows) ? rows : [])).catch(() => setMateriales([]));
  }, [params.id_contenido]);

  const handleEstadoChange = async (estado: string) => {
    if (!contenido?.id_contenido) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const actualizado = await ContenidoService.updateContenido(contenido.id_contenido, {
        estado,
        estado_material_contenido: estado,
      });
      setContenido(actualizado);
      setMessage("Estado actualizado");
    } catch (error: any) {
      setError(error?.message || "No se ha podido actualizar el estado.");
    } finally {
      setSaving(false);
    }
  };

  const deleteContenido = async () => {
    if (!contenido?.id_contenido) return;
    try {
      setSaving(true);
      setError("");
      await ContenidoService.deleteContenido(contenido.id_contenido);
      router.push("/dashboard/produccion/hoja_produccion/contenidos?tab=pendiente");
    } catch (error: any) {
      setError(error?.message || "No se ha podido eliminar el contenido.");
      setShowDeleteModal(false);
    } finally {
      setSaving(false);
    }
  };

  const updateMaterialesContenido = async (ids: string[]) => {
    if (!contenido?.id_contenido) return;
    setSaving(true);
    setError("");
    try {
      const actualizado = await ContenidoService.updateContenido(contenido.id_contenido, { array_ids_materiales: ids });
      setContenido(actualizado);
      setMessage("Materiales actualizados");
    } catch (error: any) {
      setError(error?.message || "No se han podido actualizar los materiales.");
    } finally {
      setSaving(false);
    }
  };

  const updateMaterial = async (idMaterial: string, patch: any) => {
    const current = materiales.find((item) => item.id_material === idMaterial);
    if (!current) return;
    const saved = await MaterialService.saveMaterial(idMaterial, { ...current, ...patch });
    setMateriales((rows) => rows.map((item) => item.id_material === idMaterial ? saved : item));
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-700">
      <MiddleNav tituloprincipal="Contenido" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10">
        <Link href="/dashboard/produccion/hoja_produccion/contenidos?tab=pendiente" className="mb-5 inline-flex rounded bg-white px-4 py-2 text-sm text-blue-950 shadow-sm hover:bg-gray-50">
          Volver a contenidos
        </Link>

        <div className="bg-white p-6 shadow-sm">
          {loading && <p className="text-sm text-gray-500">Cargando contenido...</p>}
          {!loading && error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {!loading && message && <div className="mb-4 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
          {!loading && !error && contenido && (
            <>
              <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">ID contenido</p>
                  <h1 className="mt-1 text-xl font-semibold text-blue-950">{contenido.id_contenido}</h1>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase text-gray-400">Estado</label>
                    <select value={contenido.estado || ""} onChange={(event) => handleEstadoChange(event.target.value)} disabled={saving} className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 disabled:bg-gray-100">
                      {estados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => setShowDeleteModal(true)} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="mb-6 border-b border-gray-100 pb-4">
                <p className="text-xs font-semibold uppercase text-gray-400">Cuenta</p>
                {contenido.id_cuenta ? (
                  <Link href={`/dashboard/comercial/cuentas/${contenido.id_cuenta}`} className="mt-2 inline-flex rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
                    {contenido.nombre_cuenta || contenido.id_cuenta}
                  </Link>
                ) : <p className="mt-1 text-sm text-gray-800">-</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {fields.map(({ key, label }) => (
                  <div key={key} className="border-b border-gray-100 pb-3">
                    <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
                    <p className="mt-1 text-sm text-gray-800">{formatValue(contenido[key])}</p>
                  </div>
                ))}
              </div>

              <section className="mt-8 border-t border-gray-100 pt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-blue-950">Materiales</h2>
                  <button type="button" onClick={() => setMaterialModalOpen(true)} className="rounded border border-blue-950 px-4 py-2 text-sm text-blue-950 hover:bg-blue-50">
                    {(contenido.array_ids_materiales || []).length ? "Agregar mas materiales" : "Agregar materiales"}
                  </button>
                </div>
                {(contenido.array_ids_materiales || []).length === 0 && <p className="text-sm text-gray-500">No hay materiales vinculados.</p>}
                <div className="grid gap-3 md:grid-cols-2">
                  {(contenido.array_ids_materiales || []).map((idMaterial: string) => {
                    const material = materiales.find((item) => item.id_material === idMaterial) || { id_material: idMaterial, nombre_material: idMaterial, validacion_produccion: "pendiente validar", comentarios: "" };
                    return (
                      <div key={idMaterial} className="rounded border border-gray-200 bg-gray-50 p-3">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <strong className="block text-blue-950">{material.nombre_material || idMaterial}</strong>
                            <span className="text-xs text-gray-500">{idMaterial}</span>
                          </div>
                          <button type="button" onClick={() => updateMaterialesContenido((contenido.array_ids_materiales || []).filter((item: string) => item !== idMaterial))} className="rounded border bg-white px-2 py-1 text-sm hover:bg-red-50" aria-label="Quitar material">×</button>
                        </div>
                        <label className="block text-xs font-semibold uppercase text-gray-400">Estado</label>
                        <select value={material.validacion_produccion || "pendiente validar"} onChange={(event) => updateMaterial(idMaterial, { validacion_produccion: event.target.value })} className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm">
                          <option value="pendiente validar">Pendiente validar</option>
                          <option value="ok produccion">Ok produccion</option>
                          <option value="no vale">No vale</option>
                        </select>
                        <label className="mt-3 block text-xs font-semibold uppercase text-gray-400">Comentarios</label>
                        <textarea value={material.comentarios || ""} onChange={(event) => updateMaterial(idMaterial, { comentarios: event.target.value })} className="mt-1 min-h-20 w-full rounded border px-3 py-2 text-sm" />
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="mt-8">
                <h2 className="mb-3 text-lg font-semibold text-blue-950">Revistas</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-blue-950 text-white">
                      <tr>
                        <th className="p-2 text-left">Revista</th>
                        <th className="p-2 text-left">Edicion</th>
                        <th className="p-2 text-left">Publicacion</th>
                        <th className="p-2 text-left">Pagina</th>
                        <th className="p-2 text-left">Tipo pagina</th>
                        <th className="p-2 text-left">Pagina del contenido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!contenido.revistas || contenido.revistas.length === 0) && <tr><td colSpan={6} className="p-4 text-gray-500">Este contenido no pertenece a ninguna revista.</td></tr>}
                      {contenido.revistas?.map((revista: any) => (
                        <tr key={`${revista.revista_id}-${revista.numero_pagina}-${revista.pagina_del_contenido}`} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <span className="font-medium text-blue-950">{revista.revista || revista.revista_id}</span>
                          </td>
                          <td className="p-2">{revista.edicion || "-"}</td>
                          <td className="p-2">{revista.publicacion || "-"}</td>
                          <td className="p-2">{revista.numero_pagina ?? "-"}</td>
                          <td className="p-2">{revista.tipo_pagina || "-"}</td>
                          <td className="p-2">{revista.pagina_del_contenido ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {materialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded bg-white p-6 text-gray-700 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-blue-950">Agregar materiales</h2>
              <button type="button" onClick={() => setMaterialModalOpen(false)} aria-label="Cerrar" className="text-xl">×</button>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Buscar en mediateca</h3>
                <div className="max-h-96 overflow-auto border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-blue-950 text-white"><tr><th className="p-2 text-left">Material</th><th className="p-2 text-left">Estado</th><th className="p-2 text-left">Comentarios</th></tr></thead>
                    <tbody>
                      {materiales.map((material) => (
                        <tr key={material.id_material} onClick={() => { updateMaterialesContenido([...new Set([...(contenido?.array_ids_materiales || []), material.id_material])]); setMaterialModalOpen(false); }} className="cursor-pointer border-b hover:bg-blue-50">
                          <td className="p-2 font-medium text-blue-950">{material.nombre_material || material.id_material}</td>
                          <td className="p-2">{material.validacion_produccion || "-"}</td>
                          <td className="p-2">{material.comentarios || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Crear material</h3>
                <div className="grid gap-3">
                  <label className="text-sm"><span className="mb-1 block font-medium">Nombre material</span><input value={newMaterial.nombre_material} onChange={(event) => setNewMaterial({ ...newMaterial, nombre_material: event.target.value })} className="w-full rounded border px-3 py-2" /></label>
                  <label className="text-sm"><span className="mb-1 block font-medium">Estado</span><select value={newMaterial.validacion_produccion} onChange={(event) => setNewMaterial({ ...newMaterial, validacion_produccion: event.target.value })} className="w-full rounded border bg-white px-3 py-2"><option value="pendiente validar">Pendiente validar</option><option value="ok produccion">Ok produccion</option><option value="no vale">No vale</option></select></label>
                  <label className="text-sm"><span className="mb-1 block font-medium">Archivo / mediateca</span><input value={newMaterial.archivo_url} onChange={(event) => setNewMaterial({ ...newMaterial, archivo_url: event.target.value })} className="w-full rounded border px-3 py-2" /></label>
                  <label className="text-sm"><span className="mb-1 block font-medium">Comentarios</span><textarea value={newMaterial.comentarios} onChange={(event) => setNewMaterial({ ...newMaterial, comentarios: event.target.value })} className="min-h-24 w-full rounded border px-3 py-2" /></label>
                  <button
                    type="button"
                    disabled={!newMaterial.nombre_material.trim()}
                    onClick={async () => {
                      const created = await MaterialService.saveMaterial("", newMaterial);
                      setMateriales((rows) => [created, ...rows]);
                      await updateMaterialesContenido([...new Set([...(contenido?.array_ids_materiales || []), created.id_material])]);
                      setNewMaterial({ nombre_material: "", validacion_produccion: "pendiente validar", comentarios: "", archivo_url: "" });
                      setMaterialModalOpen(false);
                    }}
                    className="rounded bg-blue-950 px-4 py-2 text-sm text-white disabled:bg-gray-400"
                  >
                    Crear y agregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded bg-white p-6 text-gray-700 shadow-xl">
            <h2 className="text-lg font-semibold text-blue-950">Eliminar contenido</h2>
            <p className="mt-3 text-sm text-gray-600">
              Vas a eliminar {contenido?.id_contenido}. Esta accion no se puede deshacer.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="rounded border border-gray-300 px-4 py-2 text-sm">
                Cancelar
              </button>
              <button type="button" onClick={deleteContenido} disabled={saving} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-gray-400">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
