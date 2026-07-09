"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { GestionProduccionService } from "@/app/service/GestionProduccionService";

export default function ArticuloPage() {
  const { id_articulo: id } = useParams<{ id_articulo: string }>();
  const [item, setItem] = useState<any>(null);
  const [materiales, setMateriales] = useState<any[]>([]);
  const [publicaciones, setPublicaciones] = useState<any[]>([]);
  useEffect(() => { if (!id) return; Promise.all([GestionProduccionService.getArticulo(id), GestionProduccionService.getMateriales(), GestionProduccionService.getBoard()]).then(([article, materials, board]) => { setItem(article); setMateriales(materials); setPublicaciones(board.publicaciones || []); }); }, [id]);
  if (!item) return <div className="min-h-screen bg-gray-100"><MiddleNav tituloprincipal="Articulo" /><p className="p-12">Cargando...</p></div>;
  const toggle = (field: string, value: string, checked: boolean) => setItem({ ...item, [field]: checked ? [...(item[field] || []), value] : (item[field] || []).filter((entry: string) => entry !== value) });
  return <div className="min-h-screen bg-gray-100 text-gray-700"><MiddleNav tituloprincipal={item.id_articulo_revista} /><main className="px-12 py-8"><div className="mx-auto max-w-4xl bg-white p-6 shadow-sm"><Link href="/dashboard/produccion/gestiones_produccion/articulos" className="mb-5 inline-flex rounded border px-4 py-2 text-sm">Volver</Link><div className="grid gap-4 md:grid-cols-3"><label><span className="mb-1 block text-sm font-medium">Paginas de largo</span><input type="number" min={1} value={item.paginas_largo} onChange={(event) => setItem({ ...item, paginas_largo: Number(event.target.value) })} className="w-full rounded border px-3 py-2" /></label><label><span className="mb-1 block text-sm font-medium">Numero de version</span><input type="number" min={1} value={item.numero_version} onChange={(event) => setItem({ ...item, numero_version: Number(event.target.value) })} className="w-full rounded border px-3 py-2" /></label><label><span className="mb-1 block text-sm font-medium">Estado</span><select value={item.estado} onChange={(event) => setItem({ ...item, estado: event.target.value })} className="w-full rounded border bg-white px-3 py-2"><option>pendiente</option><option>en produccion</option><option>en correccion</option><option>validado</option><option>publicado</option></select></label></div><div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className="mb-1 block text-sm font-medium">Comentarios</span><textarea value={item.comentarios || ""} onChange={(event) => setItem({ ...item, comentarios: event.target.value })} className="min-h-28 w-full rounded border px-3 py-2" /></label><label><span className="mb-1 block text-sm font-medium">Correcciones</span><textarea value={item.correcciones || ""} onChange={(event) => setItem({ ...item, correcciones: event.target.value })} className="min-h-28 w-full rounded border px-3 py-2" /></label></div>
  <div className="mt-4 grid gap-4 md:grid-cols-2"><ChoiceBox title="Publicaciones" items={publicaciones.map((entry) => ({ id: entry.id_publicacion, label: `${entry.nombre_publicacion || entry.id_publicacion} ${entry.numero_publicacion || ""}` }))} selected={item.array_ids_publicaciones || []} onToggle={(value: string, checked: boolean) => toggle("array_ids_publicaciones", value, checked)} /><ChoiceBox title="Materiales" items={materiales.map((entry) => ({ id: entry.id_material, label: entry.nombre_material || entry.id_material }))} selected={item.array_ids_materiales || []} onToggle={(value: string, checked: boolean) => toggle("array_ids_materiales", value, checked)} /></div><div className="mt-5 flex justify-end"><button type="button" onClick={async () => setItem(await GestionProduccionService.saveArticulo(id, item))} className="rounded bg-blue-950 px-4 py-2 text-white">Guardar</button></div></div></main></div>;
}

function ChoiceBox({ title, items, selected, onToggle }: any) {
  return <fieldset className="border p-3"><legend className="px-1 text-sm font-medium">{title}</legend><div className="max-h-56 overflow-y-auto">{items.map((entry: any) => <label key={entry.id} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={selected.includes(entry.id)} onChange={(event) => onToggle(entry.id, event.target.checked)} />{entry.label}</label>)}</div></fieldset>;
}
