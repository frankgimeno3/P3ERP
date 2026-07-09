"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { GestionProduccionService } from "@/app/service/GestionProduccionService";

export default function ArticulosPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const load = () => GestionProduccionService.getArticulos().then((data) => setItems(Array.isArray(data) ? data : []));
  useEffect(() => { void load(); }, []);
  const create = async () => {
    const item = await GestionProduccionService.saveArticulo("", { paginas_largo: 1, numero_version: 1, estado: "pendiente", array_ids_publicaciones: [], array_ids_materiales: [] });
    router.push(`/dashboard/produccion/gestiones_produccion/articulos/${item.id_articulo_revista}`);
  };
  const filtered = items.filter((item) => `${item.id_articulo_revista} ${item.estado} ${item.comentarios}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="min-h-screen bg-gray-100 text-gray-700"><MiddleNav tituloprincipal="Articulos de revista" /><main className="px-12 py-8"><div className="mb-5 flex items-end justify-between gap-3 bg-white p-5 shadow-sm"><label className="text-sm"><span className="mb-1 block font-medium">Buscar articulos</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-80 rounded border px-3 py-2" /></label><div className="flex gap-2"><Link href="/dashboard/produccion/gestiones_produccion" className="rounded border px-4 py-2 text-sm">Volver a gestiones</Link><button type="button" onClick={create} className="rounded bg-blue-950 px-4 py-2 text-sm text-white">Agregar articulo</button></div></div><div className="overflow-x-auto bg-white"><table className="min-w-full text-sm"><thead className="bg-blue-950 text-white"><tr><th className="p-3 text-left">Articulo</th><th className="p-3 text-left">Publicaciones</th><th className="p-3 text-left">Paginas</th><th className="p-3 text-left">Version</th><th className="p-3 text-left">Estado</th><th className="p-3 text-left">Materiales</th></tr></thead><tbody>{filtered.length === 0 && <tr><td colSpan={6} className="p-5 text-gray-500">No hay articulos.</td></tr>}{filtered.map((item) => <tr key={item.id_articulo_revista} onClick={() => router.push(`/dashboard/produccion/gestiones_produccion/articulos/${item.id_articulo_revista}`)} className="cursor-pointer border-b hover:bg-gray-50"><td className="p-3 font-medium text-blue-950">{item.id_articulo_revista}</td><td className="p-3">{item.array_ids_publicaciones?.length || 0}</td><td className="p-3">{item.paginas_largo}</td><td className="p-3">{item.numero_version}</td><td className="p-3">{item.estado}</td><td className="p-3">{item.array_ids_materiales?.length || 0}</td></tr>)}</tbody></table></div></main></div>;
}
