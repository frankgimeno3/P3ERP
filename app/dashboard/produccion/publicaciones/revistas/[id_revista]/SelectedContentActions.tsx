"use client";

import { useMemo, useState } from "react";

const pageTypes = ["Indice", "Sumario", "Portada", "Interior portada", "Anuncio", "Articulo", "Publirreportaje"];

export default function SelectedContentActions({
  selectedPages,
  allPages,
  contents,
  saving,
  onSelectionChange,
  onUpdate,
  onAssignContent,
  onDeletePages,
}: {
  selectedPages: any[];
  allPages: any[];
  contents: any[];
  saving: boolean;
  onSelectionChange: (ids: string[]) => void;
  onUpdate: (data: Partial<{ has_content: boolean; nombre_mostrado: string; tipo: string }>) => void;
  onAssignContent: (contentId: string, conflictAction?: "replace" | "shift") => Promise<void>;
  onDeletePages: (ids: string[]) => Promise<void>;
}) {
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingContentId, setPendingContentId] = useState("");
  const [conflictOpen, setConflictOpen] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<{ ids: string[]; label: string; affectsGroup: boolean } | null>(null);

  const sorted = useMemo(() => [...allPages].sort((left, right) => left.pagina_actual - right.pagina_actual), [allPages]);
  const selectedIds = selectedPages.map((page) => page.id_pagina_publicacion);
  const selectedIndexes = selectedPages.map((page) => sorted.findIndex((item) => item.id_pagina_publicacion === page.id_pagina_publicacion)).filter((index) => index >= 0);
  const firstIndex = selectedIndexes.length ? Math.min(...selectedIndexes) : -1;
  const lastIndex = selectedIndexes.length ? Math.max(...selectedIndexes) : -1;
  const selectedContentIds = [...new Set(selectedPages.map((page) => page.id_contenido).filter(Boolean))];
  const available = (page: any) => !page.id_contenido || selectedContentIds.includes(page.id_contenido);
  const previous = firstIndex > 0 ? [...sorted.slice(0, firstIndex)].reverse().find(available) : null;
  const next = lastIndex >= 0 ? sorted.slice(lastIndex + 1).find(available) : null;
  const unavailableNumbers = sorted.filter((page) => !available(page) && !selectedIds.includes(page.id_pagina_publicacion)).map((page) => page.pagina_actual);
  const primary = selectedPages[0] || null;
  const filtered = contents.filter((item) => `${item.contenido || ""} ${item.nombre_cuenta || item.id_cuenta || ""} ${item.id_contenido}`.toLowerCase().includes(query.toLowerCase()));
  const occupiedGroup = primary?.id_contenido ? sorted.filter((page) => page.id_contenido === primary.id_contenido) : [];

  const chooseContent = async (contentId: string) => {
    const hasConflict = selectedPages.some((page) => page.id_contenido && page.id_contenido !== contentId);
    setContentModalOpen(false);
    if (hasConflict) {
      setPendingContentId(contentId);
      setConflictOpen(true);
      return;
    }
    await onAssignContent(contentId);
  };

  const protectedPage = (page: any) => {
    const index = sorted.findIndex((item) => item.id_pagina_publicacion === page?.id_pagina_publicacion);
    return index <= 1 || index === sorted.length - 1;
  };

  const rowIds = primary ? getVisualRow(sorted, primary.id_pagina_publicacion).map((page) => page.id_pagina_publicacion) : [];
  const groupWarning = Boolean(primary?.ordinal && primary.ordinal !== "1/1");

  return (
    <section className="bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-blue-950">Selected content actions</h2>
      {!selectedPages.length && <p className="mt-3 text-sm text-gray-500">Selecciona una página del layout.</p>}
      {selectedPages.length > 0 && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">Páginas seleccionadas</p>
            <div className="mt-2 flex flex-wrap gap-2">{selectedPages.map((page) => <span key={page.id_pagina_publicacion} className="bg-red-100 px-2 py-1 text-sm font-semibold text-red-700">{page.pagina_actual} · {page.ordinal || "1/1"}</span>)}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!previous || saving} onClick={() => previous && onSelectionChange([...selectedIds, previous.id_pagina_publicacion])} className="border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40">Añadir anterior</button>
            <button type="button" disabled={!next || saving} onClick={() => next && onSelectionChange([...selectedIds, next.id_pagina_publicacion])} className="border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40">Añadir posterior</button>
          </div>
          {unavailableNumbers.length > 0 && <p className="text-xs text-gray-500">No disponibles: {unavailableNumbers.join(", ")}</p>}

          {groupWarning && <div className="border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">Este contenido ocupa las páginas {occupiedGroup.map((page) => `${page.pagina_actual} (${page.ordinal})`).join(", ")}.</div>}

          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={selectedPages.every((page) => page.has_content)} disabled={saving} onChange={(event) => onUpdate({ has_content: event.target.checked })} />
            Has content
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Nombre mostrado</span>
            <input key={selectedIds.join("-")} defaultValue={primary?.nombre_mostrado || ""} onBlur={(event) => onUpdate({ nombre_mostrado: event.target.value })} className="w-full border border-gray-300 px-3 py-2 uppercase" placeholder="NOMBRE MOSTRADO" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Tipo</span>
            <select value={primary?.tipo || ""} onChange={(event) => onUpdate({ tipo: event.target.value })} className="w-full border border-gray-300 bg-white px-3 py-2">
              <option value="">Sin tipo</option>
              {pageTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>

          <button type="button" onClick={() => setContentModalOpen(true)} disabled={saving} className="w-full bg-blue-950 px-4 py-2 text-sm text-white hover:bg-blue-900">Agregar contenido</button>

          <div className="grid grid-cols-2 gap-2 border-t pt-4">
            <button type="button" disabled={protectedPage(primary) || saving} onClick={() => setDeleteRequest({ ids: [primary.id_pagina_publicacion], label: "esta página", affectsGroup: groupWarning })} className="border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40">Eliminar página</button>
            <button type="button" disabled={rowIds.some((id) => protectedPage(sorted.find((page) => page.id_pagina_publicacion === id))) || saving} onClick={() => setDeleteRequest({ ids: rowIds, label: "toda esta fila", affectsGroup: rowIds.some((id) => sorted.find((page) => page.id_pagina_publicacion === id)?.ordinal !== "1/1") })} className="border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40">Eliminar fila</button>
          </div>
        </div>
      )}

      {contentModalOpen && <ContentModal contents={filtered} query={query} setQuery={setQuery} onClose={() => setContentModalOpen(false)} onChoose={chooseContent} />}

      {conflictOpen && (
        <ConfirmModal title="La página ya tiene contenido" onClose={() => setConflictOpen(false)}>
          <p className="text-sm text-gray-600">Elige qué hacer con el contenido anterior.</p>
          <div className="mt-4 flex flex-col gap-2">
            <button type="button" onClick={async () => { await onAssignContent(pendingContentId, "replace"); setConflictOpen(false); }} className="border border-red-300 px-4 py-3 text-left text-red-700 hover:bg-red-50">Eliminar lo anterior y poner lo nuevo</button>
            <button type="button" onClick={async () => { await onAssignContent(pendingContentId, "shift"); setConflictOpen(false); }} className="border border-blue-950 px-4 py-3 text-left text-blue-950 hover:bg-blue-50">Desplazar lo anterior hacia abajo creando páginas</button>
            <button type="button" onClick={() => setConflictOpen(false)} className="border px-4 py-3 hover:bg-gray-50">Cancelar</button>
          </div>
        </ConfirmModal>
      )}

      {deleteRequest && (
        <ConfirmModal title="Confirmar eliminación" onClose={() => setDeleteRequest(null)}>
          <p className="text-sm text-gray-600">Se eliminará {deleteRequest.label}.</p>
          {deleteRequest.affectsGroup && <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">La página forma parte de un contenido multipágina. Se eliminará la vinculación de ese contenido en todas sus páginas.</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleteRequest(null)} className="border px-4 py-2">Cancelar</button><button type="button" onClick={async () => { await onDeletePages(deleteRequest.ids); setDeleteRequest(null); }} className="bg-red-600 px-4 py-2 text-white">Eliminar</button></div>
        </ConfirmModal>
      )}
    </section>
  );
}

function getVisualRow(sorted: any[], selectedId: string) {
  const rows: any[][] = [];
  if (sorted.length) {
    rows.push([sorted[0]]);
    let index = 1;
    while (index < sorted.length - 1) {
      if (index + 1 < sorted.length - 1) rows.push([sorted[index], sorted[index + 1]]);
      else rows.push([sorted[index]]);
      index += 2;
    }
    if (sorted.length > 1) rows.push([sorted.at(-1)]);
  }
  return rows.find((row) => row.some((page) => page.id_pagina_publicacion === selectedId)) || [];
}

function ContentModal({ contents, query, setQuery, onClose, onChoose }: any) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl"><div className="mb-4 flex justify-between"><h3 className="font-semibold text-blue-950">Seleccionar contenido</h3><button type="button" onClick={onClose} aria-label="Cerrar">×</button></div><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por contenido, cuenta o ID" className="mb-3 w-full border px-3 py-2" /><div className="max-h-96 overflow-y-auto border">{contents.map((item: any) => <button key={item.id_contenido} type="button" onClick={() => onChoose(item.id_contenido)} className="block w-full border-b p-3 text-left hover:bg-blue-50"><strong className="block text-blue-950">{item.contenido || item.id_contenido}</strong><span className="text-sm text-gray-500">{item.nombre_cuenta || item.id_cuenta || "Sin cuenta"} · {item.id_contenido}</span></button>)}</div></div></div>;
}

function ConfirmModal({ title, children, onClose }: any) {
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"><div className="relative w-full max-w-lg bg-white p-6 shadow-xl"><div className="mb-4 flex justify-between"><h3 className="font-semibold text-blue-950">{title}</h3><button type="button" onClick={onClose} aria-label="Cerrar">×</button></div>{children}</div></div>;
}
