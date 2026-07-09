"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { GestionProduccionService } from "@/app/service/GestionProduccionService";

export default function MaterialPage() {
  const { id_material: id } = useParams<{ id_material: string }>();
  const [item, setItem] = useState<any>(null);
  const [message, setMessage] = useState("");
  useEffect(() => { if (id) GestionProduccionService.getMaterial(id).then(setItem); }, [id]);
  if (!item) return <div className="min-h-screen bg-gray-100"><MiddleNav tituloprincipal="Material" /><p className="p-12">Cargando...</p></div>;
  return <div className="min-h-screen bg-gray-100 text-gray-700"><MiddleNav tituloprincipal={item.nombre_material || "Material"} /><main className="px-12 py-8"><div className="mx-auto max-w-3xl bg-white p-6 shadow-sm">
    <div className="mb-5 flex justify-between"><Link href="/dashboard/produccion/gestiones_produccion/materiales" className="rounded border px-4 py-2 text-sm">Volver</Link>{item.archivo_url && <a href={item.archivo_url} target="_blank" rel="noreferrer" className="rounded bg-blue-950 px-4 py-2 text-sm text-white">Abrir archivo</a>}</div>
    <div className="space-y-4"><label className="block"><span className="mb-1 block text-sm font-medium">Nombre</span><input value={item.nombre_material} onChange={(event) => setItem({ ...item, nombre_material: event.target.value })} className="w-full rounded border px-3 py-2" /></label><label className="block"><span className="mb-1 block text-sm font-medium">Validacion de produccion</span><select value={item.validacion_produccion} onChange={(event) => setItem({ ...item, validacion_produccion: event.target.value })} className="w-full rounded border bg-white px-3 py-2"><option>pendiente validar</option><option>ok produccion</option><option>no vale</option></select></label><label className="block"><span className="mb-1 block text-sm font-medium">Comentarios</span><textarea value={item.comentarios || ""} onChange={(event) => setItem({ ...item, comentarios: event.target.value })} className="min-h-32 w-full rounded border px-3 py-2" /></label></div>
    {message && <p className="mt-3 text-sm text-green-700">{message}</p>}<div className="mt-5 flex justify-end"><button type="button" onClick={async () => { setItem(await GestionProduccionService.saveMaterial(id, item)); setMessage("Material guardado"); }} className="rounded bg-blue-950 px-4 py-2 text-white">Guardar</button></div>
  </div></main></div>;
}
