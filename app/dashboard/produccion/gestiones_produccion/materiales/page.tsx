"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { GestionProduccionService } from "@/app/service/GestionProduccionService";
import { MediatecaService } from "@/app/service/MediatecaService";

export default function MaterialesPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [comments, setComments] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const load = () => GestionProduccionService.getMateriales().then((data) => setItems(Array.isArray(data) ? data : []));
  useEffect(() => { void load(); }, []);
  const filtered = items.filter((item) => `${item.nombre_material} ${item.validacion_produccion} ${item.comentarios}`.toLowerCase().includes(query.toLowerCase()));

  const create = async () => {
    if (!name.trim() || !file) return;
    setSaving(true);
    try {
      const presign = await MediatecaService.createPresign({ filename: file.name, contentType: file.type || "application/octet-stream" });
      const response = await fetch(presign.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!response.ok) throw new Error("No se ha podido almacenar el archivo.");
      await MediatecaService.createMedia({ mediaId: presign.mediaId, contentName: name, s3Key: presign.s3Key, cdnUrl: presign.cdnUrl, folderPath: "produccion/materiales", contentType: file.type, type: file.type.includes("image") ? "image" : "pdf" });
      const created = await GestionProduccionService.saveMaterial("", { nombre_material: name, comentarios: comments, mediateca_id: presign.mediaId, archivo_url: presign.cdnUrl });
      setOpen(false); setName(""); setComments(""); setFile(null);
      router.push(`/dashboard/produccion/gestiones_produccion/materiales/${created.id_material}`);
    } finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-gray-100 text-gray-700">
    <MiddleNav tituloprincipal="Materiales de produccion" />
    <main className="px-12 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 bg-white p-5 shadow-sm">
        <label className="text-sm"><span className="mb-1 block font-medium">Buscar materiales</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-80 rounded border px-3 py-2" /></label>
        <div className="flex gap-2"><Link href="/dashboard/produccion/gestiones_produccion" className="rounded border px-4 py-2 text-sm">Volver a gestiones</Link><button type="button" onClick={() => setOpen(true)} className="rounded bg-blue-950 px-4 py-2 text-sm text-white">Agregar material</button></div>
      </div>
      <div className="overflow-x-auto bg-white shadow-sm"><table className="min-w-full text-sm"><thead className="bg-blue-950 text-white"><tr><th className="p-3 text-left">Material</th><th className="p-3 text-left">Validacion</th><th className="p-3 text-left">Comentarios</th><th className="p-3 text-left">Archivo</th></tr></thead><tbody>
        {filtered.length === 0 && <tr><td colSpan={4} className="p-5 text-gray-500">No hay materiales.</td></tr>}
        {filtered.map((item) => <tr key={item.id_material} onClick={() => router.push(`/dashboard/produccion/gestiones_produccion/materiales/${item.id_material}`)} className="cursor-pointer border-b hover:bg-gray-50"><td className="p-3 font-medium text-blue-950">{item.nombre_material}</td><td className="p-3">{item.validacion_produccion}</td><td className="p-3">{item.comentarios || "-"}</td><td className="p-3">{item.archivo_url ? "Disponible" : "-"}</td></tr>)}
      </tbody></table></div>
    </main>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-lg bg-white p-6"><div className="mb-4 flex justify-between"><h2 className="font-semibold text-blue-950">Agregar material</h2><button type="button" onClick={() => setOpen(false)}>×</button></div><div className="space-y-3"><label className="block text-sm"><span className="mb-1 block font-medium">Nombre</span><input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded border px-3 py-2" /></label><label className="block text-sm"><span className="mb-1 block font-medium">Archivo</span><input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} className="w-full rounded border p-2" /></label><label className="block text-sm"><span className="mb-1 block font-medium">Comentarios</span><textarea value={comments} onChange={(event) => setComments(event.target.value)} className="min-h-24 w-full rounded border px-3 py-2" /></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded border px-4 py-2">Cancelar</button><button type="button" onClick={create} disabled={!name.trim() || !file || saving} className="rounded bg-blue-950 px-4 py-2 text-white disabled:bg-gray-400">{saving ? "Subiendo..." : "Guardar"}</button></div></div></div>}
  </div>;
}
