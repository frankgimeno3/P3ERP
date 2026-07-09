"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { GestionProduccionService } from "@/app/service/GestionProduccionService";

type Gestion = {
  id_gestion_prod: string;
  nombre_gestion: string;
  publicaciones_array: string[];
  articulos_array: string[];
  materiales_array: string[];
};
type Lista = {
  id_lista_gestiones_prod: string;
  nombre_lista: string;
  posicion_lista: number;
  array_objetos_gestiones: [number, string][];
  es_lista_sistema?: boolean;
  oculta_tablero?: boolean;
};

const emptyGestion = {
  id_gestion_prod: "",
  nombre_gestion: "",
  publicaciones_array: [],
  articulos_array: [],
  materiales_array: [],
} as Gestion;

export default function GestionesProduccionPage() {
  const [data, setData] = useState<any>({ listas: [], gestiones: [], publicaciones: [] });
  const [materiales, setMateriales] = useState<any[]>([]);
  const [articulos, setArticulos] = useState<any[]>([]);
  const [listFilter, setListFilter] = useState("");
  const [publicationFilter, setPublicationFilter] = useState("");
  const [publicationFilterOpen, setPublicationFilterOpen] = useState(false);
  const [gestionModal, setGestionModal] = useState<Gestion | null>(null);
  const [gestionList, setGestionList] = useState("");
  const [listModal, setListModal] = useState<Lista | null>(null);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [moveTo, setMoveTo] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const [board, materialRows, articleRows] = await Promise.all([
        GestionProduccionService.getBoard(),
        GestionProduccionService.getMateriales(),
        GestionProduccionService.getArticulos(),
      ]);
      setData(board);
      setMateriales(Array.isArray(materialRows) ? materialRows : []);
      setArticulos(Array.isArray(articleRows) ? articleRows : []);
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || "No se han podido cargar las gestiones.");
    }
  };

  useEffect(() => { void load(); }, []);

  const gestionesById = useMemo(() => new Map<string, Gestion>(data.gestiones.map((item: Gestion) => [item.id_gestion_prod, item])), [data.gestiones]);
  const activeLists = data.listas.filter((lista: Lista) => !lista.oculta_tablero && !lista.es_lista_sistema);
  const selectedPublication = data.publicaciones.find((item: any) => item.id_publicacion === publicationFilter);
  const visibleLists = activeLists.filter((lista: Lista) => !listFilter || lista.id_lista_gestiones_prod === listFilter);
  const listTasks = (lista: Lista) => (lista.array_objetos_gestiones || [])
    .sort((a, b) => a[0] - b[0])
    .map((item) => gestionesById.get(item[1]))
    .filter((gestion): gestion is Gestion => Boolean(gestion))
    .filter((gestion) => !publicationFilter || gestion.publicaciones_array?.includes(publicationFilter));

  const saveGestion = async () => {
    if (!gestionModal?.nombre_gestion.trim()) return;
    if (gestionModal.id_gestion_prod) {
      await GestionProduccionService.updateGestion(gestionModal.id_gestion_prod, { ...gestionModal, id_lista_gestiones_prod: gestionList });
    } else {
      await GestionProduccionService.createGestion({ ...gestionModal, id_lista_gestiones_prod: gestionList || activeLists[0]?.id_lista_gestiones_prod });
    }
    setGestionModal(null);
    await load();
  };

  const saveList = async () => {
    if (!listModal) return;
    await GestionProduccionService.updateLista(listModal.id_lista_gestiones_prod, listModal);
    setListModal(null);
    await load();
  };

  const deleteList = async () => {
    if (!listModal) return;
    try {
      await GestionProduccionService.deleteLista(listModal.id_lista_gestiones_prod, moveTo);
      setListModal(null);
      setMoveTo("");
      await load();
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || "No se ha podido eliminar la lista.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-700">
      <MiddleNav tituloprincipal="Gestiones de produccion" />
      <main className="min-h-screen min-w-0 max-w-full overflow-hidden px-8 py-8 xl:px-12">
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <Link href="/dashboard/produccion/gestiones_produccion/materiales" className="rounded border border-blue-950 bg-white px-4 py-2 text-sm text-blue-950 hover:bg-blue-50">Materiales</Link>
          <Link href="/dashboard/produccion/gestiones_produccion/articulos" className="rounded border border-blue-950 bg-white px-4 py-2 text-sm text-blue-950 hover:bg-blue-50">Articulos</Link>
          <Link href="/dashboard/produccion/gestiones_produccion/publicado_cancelado" className="rounded border border-blue-950 bg-white px-4 py-2 text-sm text-blue-950 hover:bg-blue-50">Publicado y cancelado</Link>
        </div>
        <section className="mb-5 flex max-w-full flex-wrap items-end justify-between gap-4 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Lista</span>
              <select value={listFilter} onChange={(event) => setListFilter(event.target.value)} className="min-w-52 rounded border border-gray-300 bg-white px-3 py-2">
                <option value="">Todas</option>
                {activeLists.map((lista: Lista) => <option key={lista.id_lista_gestiones_prod} value={lista.id_lista_gestiones_prod}>{lista.nombre_lista}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Publicacion</span>
              <span className="flex min-w-72 items-stretch">
                <button type="button" onClick={() => setPublicationFilterOpen(true)} className="flex-1 rounded-l border border-gray-300 bg-white px-3 py-2 text-left hover:border-blue-950 hover:bg-gray-50">
                  {selectedPublication ? `${selectedPublication.nombre_soporte || selectedPublication.nombre_publicacion} · ${selectedPublication.edicion_soporte} · ${selectedPublication.numero_publicacion || selectedPublication.id_publicacion}` : "Seleccionar publicacion"}
                </button>
                {publicationFilter && <button type="button" onClick={() => setPublicationFilter("")} aria-label="Quitar filtro de publicacion" className="border border-l-0 border-gray-300 bg-white px-3 text-lg hover:bg-gray-50">×</button>}
              </span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setNewListOpen(true)} className="rounded border border-blue-950 px-4 py-2 text-sm text-blue-950 hover:bg-blue-50">Agregar lista</button>
            <button type="button" onClick={() => { setGestionModal({ ...emptyGestion }); setGestionList(activeLists[0]?.id_lista_gestiones_prod || ""); }} className="rounded bg-blue-950 px-4 py-2 text-sm text-white hover:bg-blue-900">Agregar gestion</button>
          </div>
        </section>

        {error && <p className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-5">
          <div className="flex w-max min-w-full gap-4">
          {visibleLists.map((lista: Lista) => (
            <section key={lista.id_lista_gestiones_prod} className="w-80 min-w-80 bg-white shadow-sm">
              <button type="button" onClick={() => { setListModal({ ...lista }); setMoveTo(""); }} className="flex w-full items-center justify-between border-b bg-gray-50 px-4 py-3 text-left hover:bg-gray-100">
                <span>
                  <strong className="block text-blue-950">{lista.nombre_lista}</strong>
                  <span className="text-xs text-gray-500">{listTasks(lista).length} gestiones</span>
                </span>
                <span aria-hidden="true">...</span>
              </button>
              <div className="flex min-h-72 flex-col gap-2 p-3">
                {listTasks(lista).map((gestion) => (
                  <button key={gestion.id_gestion_prod} type="button" onClick={() => { setGestionModal({ ...gestion }); setGestionList(lista.id_lista_gestiones_prod); }} className="border border-gray-200 p-3 text-left shadow-sm hover:border-blue-950 hover:bg-blue-50">
                    <strong className="block text-sm text-blue-950">{gestion.nombre_gestion}</strong>
                    <span className="mt-2 block text-xs text-gray-500">{gestion.publicaciones_array?.length || 0} publicaciones · {gestion.materiales_array?.length || 0} materiales · {gestion.articulos_array?.length || 0} articulos</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          </div>
        </div>
      </main>

      {gestionModal && (
        <Modal title={gestionModal.id_gestion_prod ? "Gestion de produccion" : "Nueva gestion"} onClose={() => setGestionModal(null)}>
          <label className="block text-sm"><span className="mb-1 block font-medium">Nombre</span><input value={gestionModal.nombre_gestion} onChange={(event) => setGestionModal({ ...gestionModal, nombre_gestion: event.target.value })} className="w-full rounded border px-3 py-2" /></label>
          <label className="mt-3 block text-sm"><span className="mb-1 block font-medium">Lista</span><select value={gestionList} onChange={(event) => setGestionList(event.target.value)} className="w-full rounded border bg-white px-3 py-2">{data.listas.map((lista: Lista) => <option key={lista.id_lista_gestiones_prod} value={lista.id_lista_gestiones_prod}>{lista.nombre_lista}</option>)}</select></label>
          <MultiSelect title="Publicaciones" values={gestionModal.publicaciones_array || []} options={data.publicaciones.map((item: any) => ({ id: item.id_publicacion, label: `${item.nombre_publicacion || item.id_publicacion} ${item.numero_publicacion || ""}` }))} onChange={(values) => setGestionModal({ ...gestionModal, publicaciones_array: values })} />
          <MultiSelect title="Articulos" values={gestionModal.articulos_array || []} options={articulos.map((item) => ({ id: item.id_articulo_revista, label: `${item.id_articulo_revista} · v${item.numero_version}` }))} onChange={(values) => setGestionModal({ ...gestionModal, articulos_array: values })} />
          <MultiSelect title="Materiales" values={gestionModal.materiales_array || []} options={materiales.map((item) => ({ id: item.id_material, label: item.nombre_material || item.id_material }))} onChange={(values) => setGestionModal({ ...gestionModal, materiales_array: values })} />
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setGestionModal(null)} className="rounded border px-4 py-2">Cancelar</button><button type="button" onClick={saveGestion} className="rounded bg-blue-950 px-4 py-2 text-white">Guardar</button></div>
        </Modal>
      )}

      {publicationFilterOpen && (
        <PublicationFilterModal
          publications={data.publicaciones}
          onClose={() => setPublicationFilterOpen(false)}
          onSelect={(id) => { setPublicationFilter(id); setPublicationFilterOpen(false); }}
        />
      )}

      {listModal && (
        <Modal title="Editar lista" onClose={() => setListModal(null)}>
          <label className="block text-sm"><span className="mb-1 block font-medium">Nombre</span><input value={listModal.nombre_lista} onChange={(event) => setListModal({ ...listModal, nombre_lista: event.target.value })} className="w-full rounded border px-3 py-2" /></label>
          <label className="mt-3 block text-sm"><span className="mb-1 block font-medium">Posicion</span><input type="number" min={0} value={listModal.posicion_lista} onChange={(event) => setListModal({ ...listModal, posicion_lista: Number(event.target.value) })} className="w-full rounded border px-3 py-2" /></label>
          <label className="mt-3 block text-sm"><span className="mb-1 block font-medium">Transferir gestiones al eliminar</span><select value={moveTo} onChange={(event) => setMoveTo(event.target.value)} className="w-full rounded border bg-white px-3 py-2"><option value="">Seleccionar destino</option>{data.listas.filter((item: Lista) => item.id_lista_gestiones_prod !== listModal.id_lista_gestiones_prod && !item.es_lista_sistema).map((item: Lista) => <option key={item.id_lista_gestiones_prod} value={item.id_lista_gestiones_prod}>{item.nombre_lista}</option>)}</select></label>
          <div className="mt-5 flex justify-between"><button type="button" onClick={deleteList} className="rounded border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50">Eliminar</button><div className="flex gap-2"><button type="button" onClick={() => setListModal(null)} className="rounded border px-4 py-2">Cancelar</button><button type="button" onClick={saveList} className="rounded bg-blue-950 px-4 py-2 text-white">Guardar</button></div></div>
        </Modal>
      )}

      {newListOpen && (
        <Modal title="Nueva lista" onClose={() => setNewListOpen(false)}>
          <label className="block text-sm"><span className="mb-1 block font-medium">Nombre</span><input value={newListName} onChange={(event) => setNewListName(event.target.value)} className="w-full rounded border px-3 py-2" /></label>
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setNewListOpen(false)} className="rounded border px-4 py-2">Cancelar</button><button type="button" onClick={async () => { await GestionProduccionService.createLista({ nombre_lista: newListName }); setNewListOpen(false); setNewListName(""); await load(); }} disabled={!newListName.trim()} className="rounded bg-blue-950 px-4 py-2 text-white disabled:bg-gray-400">Crear</button></div>
        </Modal>
      )}
    </div>
  );
}

function PublicationFilterModal({ publications, onClose, onSelect }: { publications: any[]; onClose: () => void; onSelect: (id: string) => void }) {
  const [type, setType] = useState<"" | "revista" | "newsletter">("");
  const [edition, setEdition] = useState("");
  const editions = [...new Set(publications.filter((item) => item.tipo_soporte === type).map((item) => item.edicion_soporte || "Sin edicion"))].sort();
  const availablePublications = publications.filter((item) => item.tipo_soporte === type && (item.edicion_soporte || "Sin edicion") === edition);
  const step = !type ? 1 : !edition ? 2 : 3;

  return (
    <Modal title="Filtrar por publicacion" onClose={onClose}>
      <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
        <span className={step >= 1 ? "text-blue-950" : ""}>1. Tipo</span>
        <span>›</span>
        <span className={step >= 2 ? "text-blue-950" : ""}>2. Edicion</span>
        <span>›</span>
        <span className={step >= 3 ? "text-blue-950" : ""}>3. Publicacion</span>
      </div>

      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setType("revista")} className="border border-gray-300 p-5 text-left hover:border-blue-950 hover:bg-blue-50">
            <strong className="block text-blue-950">Revista</strong>
            <span className="mt-1 block text-sm text-gray-500">Números de publicaciones de revista</span>
          </button>
          <button type="button" onClick={() => setType("newsletter")} className="border border-gray-300 p-5 text-left hover:border-blue-950 hover:bg-blue-50">
            <strong className="block text-blue-950">Newsletter</strong>
            <span className="mt-1 block text-sm text-gray-500">Envíos de newsletter</span>
          </button>
        </div>
      )}

      {step === 2 && (
        <>
          <p className="mb-3 text-sm font-medium text-gray-600">Selecciona una edición de {type}</p>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {editions.map((item) => <button key={item} type="button" onClick={() => setEdition(item)} className="block w-full border border-gray-300 px-4 py-3 text-left hover:border-blue-950 hover:bg-blue-50">{item}</button>)}
            {editions.length === 0 && <p className="p-4 text-sm text-gray-500">No hay ediciones disponibles.</p>}
          </div>
          <button type="button" onClick={() => setType("")} className="mt-4 border px-4 py-2 text-sm hover:bg-gray-50">Atrás</button>
        </>
      )}

      {step === 3 && (
        <>
          <p className="mb-3 text-sm font-medium text-gray-600">Selecciona la publicación de {edition}</p>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {availablePublications.map((item) => (
              <button key={item.id_publicacion} type="button" onClick={() => onSelect(item.id_publicacion)} className="block w-full border border-gray-300 px-4 py-3 text-left hover:border-blue-950 hover:bg-blue-50">
                <strong className="block text-blue-950">{item.nombre_soporte || item.nombre_publicacion || item.id_publicacion}</strong>
                <span className="mt-1 block text-sm text-gray-500">Número {item.numero_publicacion || "-"} · {item.id_publicacion}</span>
              </button>
            ))}
            {availablePublications.length === 0 && <p className="p-4 text-sm text-gray-500">No hay publicaciones disponibles.</p>}
          </div>
          <button type="button" onClick={() => setEdition("")} className="mt-4 border px-4 py-2 text-sm hover:bg-gray-50">Atrás</button>
        </>
      )}
    </Modal>
  );
}

function Modal({ title, children, onClose }: any) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl"><div className="mb-4 flex justify-between"><h2 className="text-lg font-semibold text-blue-950">{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar">×</button></div>{children}</div></div>;
}

function MultiSelect({ title, values, options, onChange }: { title: string; values: string[]; options: { id: string; label: string }[]; onChange: (values: string[]) => void }) {
  return <details className="mt-3 border-t pt-3"><summary className="font-medium text-blue-950">{title} ({values.length})</summary><div className="mt-2 max-h-40 overflow-y-auto border p-2">{options.length === 0 && <p className="text-sm text-gray-500">No hay elementos.</p>}{options.map((option) => <label key={option.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={values.includes(option.id)} onChange={(event) => onChange(event.target.checked ? [...values, option.id] : values.filter((id) => id !== option.id))} />{option.label}</label>)}</div></details>;
}
