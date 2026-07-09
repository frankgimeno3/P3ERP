"use client";

type PublicationPage = {
  id_pagina_publicacion: string;
  pagina_actual: number;
  has_content: boolean;
  id_contenido?: string;
  contenido?: string;
  cuenta?: string;
  nombre_mostrado?: string;
  tipo?: string;
};

export default function PublicationLayout({
  pages,
  numPages,
  selectedIds,
  saving,
  onSelect,
  onChangeNumPages,
}: {
  pages: PublicationPage[];
  numPages: number;
  selectedIds: string[];
  saving: boolean;
  onSelect: (id: string) => void;
  onChangeNumPages: (value: number) => void;
}) {
  const sorted = [...pages].sort((left, right) => left.pagina_actual - right.pagina_actual);
  const rows: { left: PublicationPage | null; right: PublicationPage | null }[] = [];
  if (sorted.length) {
    rows.push({ left: null, right: sorted[0] });
    let index = 1;
    while (index < sorted.length - 1) {
      rows.push({ left: sorted[index], right: index + 1 < sorted.length - 1 ? sorted[index + 1] : null });
      index += 2;
    }
    if (sorted.length > 1) rows.push({ left: sorted.at(-1) || null, right: null });
  }

  return (
    <section className="bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="font-semibold text-blue-950">Layout</h2>
          <p className="mt-1 text-sm text-gray-500">Número de páginas actual: <strong>{numPages}</strong></p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onChangeNumPages(Math.max(0, numPages - 2))} disabled={saving || numPages === 0} aria-label="Quitar dos páginas" className="h-9 w-9 border border-gray-300 text-xl hover:bg-gray-50 disabled:opacity-40">−</button>
          <button type="button" onClick={() => onChangeNumPages(numPages + 2)} disabled={saving} aria-label="Agregar dos páginas" className="h-9 w-9 border border-gray-300 text-xl hover:bg-gray-50 disabled:opacity-40">+</button>
        </div>
      </div>

      {rows.length === 0 && <p className="py-10 text-center text-sm text-gray-500">Añade páginas para comenzar el planillo.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row, index) => (
          <PageSpread key={index} left={row.left} right={row.right} selectedIds={selectedIds} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

function PageSpread({ left, right, selectedIds, onSelect }: { left: PublicationPage | null; right: PublicationPage | null; selectedIds: string[]; onSelect: (id: string) => void }) {
  const leftName = String(left?.nombre_mostrado || "").trim();
  const rightName = String(right?.nombre_mostrado || "").trim();
  const sharedName = left && right && leftName && leftName.toLocaleLowerCase("es") === rightName.toLocaleLowerCase("es") ? leftName : "";
  const sharedType = sharedName ? left?.tipo || right?.tipo || "" : "";
  return (
    <div className="relative grid grid-cols-2 gap-2">
      {sharedName && (
        <div className="pointer-events-none absolute inset-x-2 top-3 z-10 flex flex-col items-center text-center">
          <span className="max-w-full break-words text-sm font-bold uppercase leading-tight text-gray-900">{sharedName}</span>
          {sharedType && <span className="mt-1 bg-green-700 px-2 py-1 text-xs font-semibold text-white">{sharedType}</span>}
        </div>
      )}
      <PageSlot page={left} selectedIds={selectedIds} onSelect={onSelect} hideMetadata={Boolean(sharedName)} />
      <PageSlot page={right} selectedIds={selectedIds} onSelect={onSelect} hideMetadata={Boolean(sharedName)} />
    </div>
  );
}

function PageSlot({ page, selectedIds, onSelect, hideMetadata }: { page: PublicationPage | null; selectedIds: string[]; onSelect: (id: string) => void; hideMetadata: boolean }) {
  if (!page) return <div aria-hidden="true" className="aspect-[3/4] border border-dashed border-transparent" />;
  const selected = selectedIds.includes(page.id_pagina_publicacion);
  return (
    <button
      type="button"
      onClick={() => onSelect(selected ? "" : page.id_pagina_publicacion)}
      className={`aspect-[3/4] w-full overflow-hidden border p-3 pt-4 text-left transition ${hideMetadata ? "pt-20" : ""} ${selected ? "border-red-600 bg-red-50 ring-2 ring-red-500" : "border-gray-300 bg-gray-50 hover:border-blue-950"}`}
    >
      <span className="block text-lg font-semibold text-blue-950">{page.pagina_actual}</span>
      {!hideMetadata && page.nombre_mostrado && <span className="mt-2 line-clamp-2 max-w-full break-words text-sm font-bold uppercase leading-tight text-gray-900">{page.nombre_mostrado}</span>}
      {!hideMetadata && page.tipo && <span className="mt-1 inline-block max-w-full truncate bg-green-700 px-2 py-1 text-xs font-semibold text-white">{page.tipo}</span>}
      <span className="mt-3 block text-sm text-gray-600">{page.has_content ? "Con contenido" : "Sin contenido"}</span>
      {page.contenido && <span className="mt-2 line-clamp-3 block text-sm font-medium text-gray-800">{page.contenido}</span>}
      {page.cuenta && <span className="mt-2 block text-xs text-gray-500">{page.cuenta}</span>}
    </button>
  );
}
