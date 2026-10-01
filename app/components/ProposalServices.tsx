"use client";
import {useEffect,useState} from "react";
import {RevistaService} from "@/app/service/RevistaService";
export type Linea = {
  id_linea_propuesta?: string;
  id_servicio: string;
  medio: string;
  publicacion: string;
  producto: string;
  precio_tarifa: number;
  descuento_producto: number;
  tipo_descuento_producto?: "porcentaje" | "importe";
  precio_unitario: number;
  unidades: number;
  descripcion_linea: string;
  deadline_publicacion: string;
  fecha_publicacion_publicacion: string;
  grupo_servicio?: string;
  revista_id?: string;
  id_publicacion?: string;
  medio_publicacion?: string;
  edicion_publicacion?: string;
  detalle_publicacion?: string;
  especificaciones_linea?: string;
  modo_precio?: "calculado" | "tachado" | "gratis" | "personalizado";
  precio_total_personalizado?: number | null;
  id_pagina_publicacion?: string;
  servicio_personalizado?: boolean;
  especificaciones_bloqueadas?: boolean;
};

export const emptyLinea = (): Linea => ({
  id_servicio: "",
  medio: "",
  publicacion: "",
  producto: "",
  precio_tarifa: 0,
  descuento_producto: 0,
  tipo_descuento_producto: "porcentaje",
  precio_unitario: 0,
  unidades: 1,
  descripcion_linea: "",
  deadline_publicacion: "",
  fecha_publicacion_publicacion: "",
  especificaciones_linea: "",
  modo_precio: "calculado",
  precio_total_personalizado: null,
  id_pagina_publicacion: "",
});

export function PageChoice({ page, selected, onSelect }: { page: any; selected: boolean; onSelect: () => void }) {
  const sold = Boolean(page.has_content);
  const offered = !sold && Boolean(page.ofrecida);
  const color = sold ? "border-red-300 bg-red-50 text-red-800" : offered ? "border-orange-300 bg-orange-50 text-orange-800" : "border-green-300 bg-green-50 text-green-800";
  const preference = String(page.pagina_preferente || "");
  const label = preference === "portada" ? "Portada" : preference === "interior_portada" ? "Interior de portada" : `Página preferente ${page.pagina_actual}`;
  return <button type="button" onClick={onSelect} disabled={sold} className={`w-full rounded border p-3 text-left text-sm transition hover:brightness-95 disabled:cursor-not-allowed ${!sold ? "cursor-pointer" : ""} ${color} ${selected ? "ring-2 ring-blue-600" : ""}`}><strong>{label}</strong><span className="block text-xs">{sold ? "Vendida" : offered ? "Ofrecida" : "Disponible"}</span></button>;
}

function toNumber(value:unknown){const n=Number(value);return Number.isFinite(n)?n:0;}
export function ProposalLineRow({ linea, index, total, moneda, onPatch, onRemove, lockSpecifications = false }: { linea: Linea; index: number; total: number; moneda: string; onPatch: (patch: Partial<Linea>) => void; onRemove: () => void; lockSpecifications?: boolean }) {
  const mode = linea.modo_precio || "calculado";
  return <tr className="border-t border-slate-600 bg-slate-900 text-xs text-white">
    <td className="p-2"><button type="button" onClick={onRemove} aria-label={`Eliminar ${linea.producto}`} className="h-7 w-7 cursor-pointer rounded bg-red-600 text-white hover:bg-red-700">×</button></td>
    <td className="min-w-32 p-2"><input value={linea.medio || ""} onChange={(event) => onPatch({ medio: event.target.value })} className={`w-full rounded bg-white px-2 py-1 text-center font-medium text-slate-800 ${mode === "tachado" ? "line-through" : ""}`} /></td>
    <td className="min-w-32 p-2"><input value={linea.descripcion_linea} onChange={(event) => onPatch({ descripcion_linea: event.target.value })} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1" placeholder="Descripción" /></td>
    <td className="min-w-32 p-2"><input value={linea.especificaciones_linea || ""} readOnly={lockSpecifications || linea.especificaciones_bloqueadas} onChange={(event) => onPatch({ especificaciones_linea: event.target.value })} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 read-only:cursor-not-allowed read-only:opacity-70" placeholder="Especificaciones" /></td>
    <td className="w-16 p-2"><input type="number" min="1" value={linea.unidades} onChange={(event) => onPatch({ unidades: toNumber(event.target.value) })} className="w-12 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-center" /></td>
    <td className="w-24 p-2"><div className="flex min-w-[80px] items-center gap-2 whitespace-nowrap rounded border border-slate-600 bg-slate-800 px-2"><input type="number" min="0" value={linea.precio_unitario} onChange={(event) => onPatch({ precio_unitario: toNumber(event.target.value) })} className="min-w-0 flex-1 bg-transparent py-1 text-right outline-none" /><span className="shrink-0">{moneda}</span></div></td>
    <td className="w-28 p-2">{mode === "calculado" ? <div className="flex min-w-[84px] items-center whitespace-nowrap rounded border border-slate-600 bg-slate-800"><input type="number" min="0" max={linea.tipo_descuento_producto === "importe" ? undefined : 100} value={linea.descuento_producto} onChange={(event) => onPatch({ descuento_producto: toNumber(event.target.value) })} className="min-w-0 flex-1 bg-transparent px-2 py-1 text-right outline-none" /><select aria-label="Tipo de descuento" value={linea.tipo_descuento_producto || "porcentaje"} onChange={(event) => onPatch({ tipo_descuento_producto: event.target.value as Linea["tipo_descuento_producto"], descuento_producto: 0 })} className="cursor-pointer border-l border-slate-600 bg-slate-700 px-2 py-1 text-white hover:bg-slate-600"><option value="porcentaje">%</option><option value="importe">{moneda}</option></select></div> : null}</td>
    <td className="w-28 p-2">{mode === "personalizado" ? <div className="flex min-w-[80px] items-center gap-2 whitespace-nowrap rounded border border-slate-600 bg-slate-800 px-2"><input type="number" min="0" value={linea.precio_total_personalizado ?? 0} onChange={(event) => onPatch({ precio_total_personalizado: toNumber(event.target.value) })} className="min-w-0 flex-1 bg-transparent py-1 text-right outline-none" /><span className="shrink-0">{moneda}</span></div> : <span className={`inline-block min-w-[80px] whitespace-nowrap text-right ${mode === "tachado" ? "line-through" : ""}`}>{mode === "gratis" ? "Gratis" : `${total.toFixed(2)} ${moneda}`}</span>}</td>
    <td className="min-w-28 p-2"><div className="space-y-1 rounded bg-white p-2 text-xs text-slate-800">{[["calculado", "Precio calculado"], ["tachado", "Tachado"], ["gratis", "Gratis"], ["personalizado", "Personalizado"]].map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2"><input type="radio" name={`precio-linea-${index}`} checked={mode === value} onChange={() => onPatch({ modo_precio: value as Linea["modo_precio"], precio_total_personalizado: value === "personalizado" ? total : null })} className="cursor-pointer" />{label}</label>)}</div></td>
  </tr>;
}

export function ServiceWizardBody({ step, linea, grupos, servicios, revistas, onPatch, onSelectService, onApplyPublication, onStep, language='es' }: { step: number; linea: Linea; grupos: { id: string; nombre: string }[]; servicios: any[]; revistas: any[]; onPatch: (patch: Partial<Linea>) => void; onSelectService: (id: string) => void; onApplyPublication: (id: string) => void; onStep: (step: number) => void; language?: string }) {
  const [search, setSearch] = useState("");
  const [preferredPage,setPreferredPage]=useState(false);
  useEffect(()=>{if(!linea.id_publicacion||!linea.id_pagina_publicacion){setPreferredPage(false);return;}let active=true;RevistaService.getPaginas(linea.id_publicacion).then(data=>{if(active)setPreferredPage(Boolean(data?.paginas?.find((page:any)=>page.id_pagina_publicacion===linea.id_pagina_publicacion && String(page.pagina_preferente||'').startsWith('pag_pref_'))));}).catch(()=>{if(active)setPreferredPage(false);});return()=>{active=false;};},[linea.id_publicacion,linea.id_pagina_publicacion]);
  const selectedGroup = grupos.find((group) => group.id === linea.grupo_servicio);
  const magazineChannel = String(selectedGroup?.nombre || "").toLowerCase().includes("revista");
  const normalizeOption = (value: unknown) => String(value || "").trim().replace(/\s+/g, " ");
  const optionKey = (value: unknown) => normalizeOption(value).toLocaleLowerCase("es");
  const uniqueValues = (values: unknown[]): string[] => {
    const options = new Map<string, string>();
    values.forEach((value) => {
      const normalized = normalizeOption(value);
      if (normalized && !options.has(optionKey(normalized))) options.set(optionKey(normalized), normalized);
    });
    return Array.from(options.values());
  };
  const availableRevistas=revistas.filter(item=>String(item.estado_publicacion||'').toLowerCase()!=='publicada');
  const medios = uniqueValues(availableRevistas.map((item) => item.medio_publicacion));
  const editions = uniqueValues(availableRevistas.filter((item) => optionKey(item.medio_publicacion) === optionKey(linea.medio_publicacion)).map((item) => item.edicion_publicacion));
  const publicationDetails = availableRevistas.filter((item) => optionKey(item.medio_publicacion) === optionKey(linea.medio_publicacion) && optionKey(item.edicion_publicacion) === optionKey(linea.edicion_publicacion)).filter((item, index, items) => items.findIndex((candidate) => optionKey(candidate.detalle_publicacion) === optionKey(item.detalle_publicacion)) === index);
  const serviceLabel=(service:any)=>service[`nombre_servicio_${language}`]||service.nombre_servicio_es||service.id_servicio;
  const filteredBase = servicios.filter((service) => {
    if (service.id_medio !== linea.grupo_servicio) return false;
    if (search && !`${serviceLabel(service)} ${service.nombre_servicio_es} ${service.id_servicio}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const filtered = magazineChannel ? filteredBase.filter((service, index, items) => items.findIndex((candidate) => optionKey(serviceLabel(candidate)) === optionKey(serviceLabel(service)) && toNumber(candidate.precio_tarifa ?? candidate.precio_servicio) === toNumber(service.precio_tarifa ?? service.precio_servicio)) === index) : filteredBase;
  const customChannel = linea.grupo_servicio === "otros";

  if (step === 1) return <div><p className="mb-3 text-sm font-semibold text-blue-950">Canal - Grupo de servicios</p><div className="grid gap-4 md:grid-cols-3">{grupos.map((group) => <button key={group.id} type="button" onClick={() => { onPatch({ grupo_servicio: group.id, id_servicio: "", producto: "", medio: "", publicacion: "", revista_id: "", id_publicacion: "", servicio_personalizado: false }); onStep(2); }} className={`cursor-pointer rounded-lg border-2 p-5 text-left transition hover:border-blue-500 hover:bg-blue-50 ${linea.grupo_servicio === group.id ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}><strong className="block text-blue-950">{group.nombre}</strong><span className="mt-1 block text-xs text-gray-500">{group.id}</span></button>)}</div></div>;

  if (step === 2) return <div className="space-y-4">
    <button type="button" onClick={() => onStep(1)} className="cursor-pointer text-sm text-blue-700 hover:underline">← Volver a canales</button>
    <p className="text-sm">Canal - Grupo de servicios: <strong>{selectedGroup?.nombre}</strong></p>
    {magazineChannel && <div className="grid gap-3 md:grid-cols-3"><label className="text-sm">Revista<select value={linea.medio_publicacion || ""} onChange={(event) => onPatch({ medio_publicacion: event.target.value, edicion_publicacion: "", detalle_publicacion: "", revista_id: "", id_publicacion: "" })} className="mt-1 w-full cursor-pointer rounded border bg-slate-800 p-3 text-white"><option value="">Selecciona una revista...</option>{medios.map((medio) => <option key={medio} value={medio}>{medio}</option>)}</select></label><label className="text-sm">Edición<select disabled={!linea.medio_publicacion} value={linea.edicion_publicacion || ""} onChange={(event) => onPatch({ edicion_publicacion: event.target.value, detalle_publicacion: "", id_publicacion: "" })} className="mt-1 w-full cursor-pointer rounded border bg-slate-800 p-3 text-white disabled:cursor-not-allowed disabled:bg-gray-400"><option value="">Selecciona una edición...</option>{editions.map((edition) => <option key={edition} value={edition}>{edition}</option>)}</select></label><label className="text-sm">Detalle de publicación<select disabled={!linea.edicion_publicacion} value={linea.detalle_publicacion || ""} onChange={(event) => { const item = publicationDetails.find((publication) => optionKey(publication.detalle_publicacion) === optionKey(event.target.value)); const id = item?.id_publicacion || ""; onPatch({ detalle_publicacion: event.target.value, id_publicacion: id, revista_id: item?.id_revista || "" }); if (id) onApplyPublication(id); }} className="mt-1 w-full cursor-pointer rounded border bg-slate-800 p-3 text-white disabled:cursor-not-allowed disabled:bg-gray-400"><option value="">Selecciona un detalle...</option>{publicationDetails.map((item) => <option key={item.id_publicacion || item.detalle_publicacion} value={item.detalle_publicacion}>{item.detalle_publicacion}</option>)}</select></label></div>}
    {(!magazineChannel || linea.id_publicacion) ? <><label className="block text-sm">Filtrar servicios por nombre<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o identificador del servicio..." className="mt-1 w-full rounded border bg-slate-800 p-3 text-white placeholder:text-slate-400" /></label><div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">{filtered.map((service) => { const price = toNumber(service.precio_tarifa ?? service.precio_servicio); return <button key={service.id_servicio} type="button" onClick={() => { onSelectService(service.id_servicio); onStep(3); }} className={`flex w-full cursor-pointer items-center justify-between rounded-lg border-2 p-4 text-left hover:border-blue-500 hover:bg-blue-50 ${linea.id_servicio === service.id_servicio ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}><span><strong className="block text-blue-950">{serviceLabel(service)}</strong><span className="text-xs text-gray-500">{service.id_servicio}</span></span><strong className="text-blue-950">{price.toFixed(2)} €</strong></button>; })}{customChannel && <button type="button" onClick={() => { onPatch({ id_servicio: "personalizado", producto: "", servicio_personalizado: true, precio_tarifa: 0, precio_unitario: 0 }); onStep(3); }} className="flex w-full cursor-pointer items-center justify-between rounded-lg border-2 border-dashed p-4 text-left transition hover:border-blue-500 hover:bg-blue-50"><span><strong className="block text-blue-950">Personalizado</strong><span className="text-xs text-gray-500">Escribe libremente el nombre del servicio</span></span><strong className="text-blue-950">Precio editable</strong></button>}{filtered.length === 0 && !customChannel && <p className="rounded bg-gray-50 p-5 text-center text-sm text-gray-500">No hay servicios para este canal.</p>}</div></> : <p className="rounded bg-gray-50 p-5 text-sm text-gray-500">Selecciona primero una revista, una edición y un detalle para ver sus servicios.</p>}
  </div>;

  return <div className="space-y-4"><button type="button" onClick={() => onStep(2)} className="cursor-pointer text-sm text-blue-700 hover:underline">← Volver a servicios</button><div className="rounded border bg-gray-50 p-4"><span className="text-xs uppercase text-gray-500">Servicio seleccionado</span>{linea.servicio_personalizado ? <label className="mt-2 block text-sm">Nombre del servicio personalizado<input autoFocus value={linea.producto} onChange={(event) => onPatch({ producto: event.target.value })} placeholder="Escribe el nombre del servicio..." className="mt-1 w-full rounded border bg-white p-3" /></label> : <div className="mt-1 flex justify-between gap-4"><strong className="text-blue-950">{linea.producto}</strong><strong>{toNumber(linea.precio_tarifa).toFixed(2)} €</strong></div>}</div><div className="grid gap-4 md:grid-cols-2"><label className="text-sm">Descripción<textarea value={linea.descripcion_linea} onChange={(event) => onPatch({ descripcion_linea: event.target.value })} className="mt-1 min-h-24 w-full rounded border p-3" /></label><label className="text-sm">Especificaciones<textarea value={linea.especificaciones_linea || ""} readOnly={preferredPage || linea.especificaciones_bloqueadas} onChange={(event) => onPatch({ especificaciones_linea: event.target.value })} className="mt-1 min-h-24 w-full rounded border p-3 read-only:cursor-not-allowed read-only:bg-gray-100" /></label></div>{magazineChannel && linea.id_publicacion && <MagazinePageSelector publicationId={linea.id_publicacion} selected={linea.id_pagina_publicacion || ""} onSelect={(page) => onPatch({ id_pagina_publicacion: page.id_pagina_publicacion, especificaciones_bloqueadas: String(page.pagina_preferente || "").startsWith("pag_pref_") })} />}</div>;
}

function MagazinePageSelector({ publicationId, selected, onSelect }: { publicationId: string; selected: string; onSelect: (page: any) => void }) {
  const [pages, setPages] = useState<any[]>([]);
  useEffect(() => { RevistaService.getPaginas(publicationId).then((data) => setPages(Array.isArray(data?.paginas) ? data.paginas : [])).catch(() => setPages([])); }, [publicationId]);
  const preferred = pages.filter((page) => String(page.pagina_preferente || "").startsWith("pag_pref_"));
  const placements = pages.filter((page) => ["portada", "interior_portada"].includes(String(page.pagina_preferente || "")));
  return <div className="rounded border p-4"><p className="mb-3 font-semibold text-blue-950">Página preferente</p><div className="grid gap-4 md:grid-cols-2"><div className="grid grid-cols-2 gap-2">{preferred.map((page) => <PageChoice key={page.id_pagina_publicacion} page={page} selected={selected === page.id_pagina_publicacion} onSelect={() => !page.has_content && onSelect(page)} />)}</div><div className="space-y-2">{placements.map((page) => <PageChoice key={page.id_pagina_publicacion} page={page} selected={selected === page.id_pagina_publicacion} onSelect={() => !page.has_content && onSelect(page)} />)}<div className="rounded border border-dashed p-3 text-sm"><strong>Página premium</strong><p className="text-xs text-gray-500">Selecciona una página numerada a la izquierda.</p></div></div></div></div>;
}
