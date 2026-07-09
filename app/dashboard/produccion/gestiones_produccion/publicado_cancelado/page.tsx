"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { GestionProduccionService } from "@/app/service/GestionProduccionService";

type ArchiveTab = "publicado" | "cancelado";

export default function PublicadoCanceladoPage() {
  const [activeTab, setActiveTab] = useState<ArchiveTab>("publicado");
  const [board, setBoard] = useState<any>({ listas: [], gestiones: [], publicaciones: [] });
  const [materiales, setMateriales] = useState<any[]>([]);
  const [articulos, setArticulos] = useState<any[]>([]);
  const [filters, setFilters] = useState({ nombre: "", publicacion: "", articulo: "", material: "" });
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      GestionProduccionService.getBoard(),
      GestionProduccionService.getMateriales(),
      GestionProduccionService.getArticulos(),
    ]).then(([boardData, materialRows, articleRows]) => {
      setBoard(boardData);
      setMateriales(Array.isArray(materialRows) ? materialRows : []);
      setArticulos(Array.isArray(articleRows) ? articleRows : []);
    });
  }, []);

  const currentList = board.listas.find((list: any) => String(list.nombre_lista).toLowerCase() === activeTab);
  const gestionesById = useMemo(() => new Map(board.gestiones.map((item: any) => [item.id_gestion_prod, item])), [board.gestiones]);
  const rows = (currentList?.array_objetos_gestiones || [])
    .sort((left: any, right: any) => Number(left[0]) - Number(right[0]))
    .map((entry: any) => gestionesById.get(entry[1]))
    .filter(Boolean)
    .filter((gestion: any) => (
      (!filters.nombre || String(gestion.nombre_gestion || "").toLowerCase().includes(filters.nombre.toLowerCase()))
      && (!filters.publicacion || gestion.publicaciones_array?.includes(filters.publicacion))
      && (!filters.articulo || gestion.articulos_array?.includes(filters.articulo))
      && (!filters.material || gestion.materiales_array?.includes(filters.material))
    ));

  const publicationLabel = (id: string) => {
    const item = board.publicaciones.find((entry: any) => entry.id_publicacion === id);
    return item ? `${item.nombre_publicacion || id} ${item.numero_publicacion || ""}` : id;
  };
  const articleLabel = (id: string) => articulos.find((item) => item.id_articulo_revista === id)?.id_articulo_revista || id;
  const materialLabel = (id: string) => materiales.find((item) => item.id_material === id)?.nombre_material || id;

  return (
    <div className="min-h-screen min-w-0 bg-gray-100 text-gray-700">
      <MiddleNav tituloprincipal="Publicado y cancelado" />
      <main className="min-w-0 max-w-full overflow-hidden px-8 py-8 xl:px-12">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex">
            {[
              ["publicado", "Publicado"],
              ["cancelado", "Cancelado"],
            ].map(([key, label], index) => (
              <button
                key={key}
                type="button"
                onClick={() => { setActiveTab(key as ArchiveTab); setFilters({ nombre: "", publicacion: "", articulo: "", material: "" }); }}
                className={`w-52 p-3 text-sm ${activeTab === key ? "bg-blue-950 text-white" : "bg-white hover:bg-gray-50"} ${index === 0 ? "" : "border-l"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Link href="/dashboard/produccion/gestiones_produccion" className="rounded border border-blue-950 bg-white px-4 py-2 text-sm text-blue-950 hover:bg-blue-50">Volver a gestiones</Link>
        </div>

        <section className="mb-5 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Buscar gestiones</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Filter label="Nombre"><input type="search" value={filters.nombre} onChange={(event) => setFilters({ ...filters, nombre: event.target.value })} className="w-full rounded border px-3 py-2" /></Filter>
            <Filter label="Publicacion"><select value={filters.publicacion} onChange={(event) => setFilters({ ...filters, publicacion: event.target.value })} className="w-full rounded border bg-white px-3 py-2"><option value="">Todas</option>{board.publicaciones.map((item: any) => <option key={item.id_publicacion} value={item.id_publicacion}>{publicationLabel(item.id_publicacion)}</option>)}</select></Filter>
            <Filter label="Articulo"><select value={filters.articulo} onChange={(event) => setFilters({ ...filters, articulo: event.target.value })} className="w-full rounded border bg-white px-3 py-2"><option value="">Todos</option>{articulos.map((item) => <option key={item.id_articulo_revista} value={item.id_articulo_revista}>{item.id_articulo_revista}</option>)}</select></Filter>
            <Filter label="Material"><select value={filters.material} onChange={(event) => setFilters({ ...filters, material: event.target.value })} className="w-full rounded border bg-white px-3 py-2"><option value="">Todos</option>{materiales.map((item) => <option key={item.id_material} value={item.id_material}>{item.nombre_material || item.id_material}</option>)}</select></Filter>
          </div>
        </section>

        <div className="max-w-full overflow-x-auto bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-blue-950 text-white"><tr><th className="p-3 text-left">Gestion</th><th className="p-3 text-left">Publicaciones</th><th className="p-3 text-left">Articulos</th><th className="p-3 text-left">Materiales</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={4} className="p-5 text-gray-500">No hay gestiones {activeTab === "publicado" ? "publicadas" : "canceladas"} con estos filtros.</td></tr>}
              {rows.map((gestion: any) => (
                <tr key={gestion.id_gestion_prod} onClick={() => setSelected(gestion)} className="cursor-pointer border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-blue-950">{gestion.nombre_gestion}</td>
                  <td className="p-3">{gestion.publicaciones_array?.length || 0}</td>
                  <td className="p-3">{gestion.articulos_array?.length || 0}</td>
                  <td className="p-3">{gestion.materiales_array?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-blue-950">{selected.nombre_gestion}</h2><button type="button" onClick={() => setSelected(null)} aria-label="Cerrar">×</button></div>
            <Detail title="Publicaciones" values={selected.publicaciones_array?.map(publicationLabel) || []} />
            <Detail title="Articulos" values={selected.articulos_array?.map(articleLabel) || []} />
            <Detail title="Materiales" values={selected.materiales_array?.map(materialLabel) || []} />
          </div>
        </div>
      )}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm"><span className="mb-1 block font-medium">{label}</span>{children}</label>;
}

function Detail({ title, values }: { title: string; values: string[] }) {
  return <section className="border-t py-3"><h3 className="mb-2 text-sm font-semibold text-gray-600">{title}</h3>{values.length ? <ul className="space-y-1 text-sm">{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p className="text-sm text-gray-500">Sin elementos.</p>}</section>;
}
