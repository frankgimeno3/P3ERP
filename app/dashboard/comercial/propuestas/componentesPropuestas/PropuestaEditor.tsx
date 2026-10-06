"use client";
import SortableTable from '@/app/components/SortableTable';

import DateInputRow from "@/app/components/DateInputRow";
import { isCommercialAgent } from "@/app/config/commercialAgents";
import {PageChoice,ProposalLineRow,ServiceWizardBody,emptyLinea,type Linea} from "@/app/components/ProposalServices";
import AccountSearchModal from "@/app/components/AccountSearchModal";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { CuentaService } from "@/app/service/CuentaService";
import { ContactoService } from "@/app/service/ContactoService";
import { ServicioService } from "@/app/service/ServicioService";
import { PropuestaService } from "@/app/service/PropuestaService";
import { AgenteService } from "@/app/service/AgenteService";
import { RevistaService } from "@/app/service/RevistaService";
import PropuestaPreview from "@/app/dashboard/comercial/propuestas/componentesPropuestas/PropuestaPreview";
import ProposalTemplatePicker from './ProposalTemplatePicker';
import { addCalendarMonths } from '@/app/config/paymentDates';

type Cobro = {
  id_cobro_propuesta?: string;
  numero_cobro: number;
  fecha_cobro: string;
  importe_cobro: number;
  forma_cobro: string;
  banco_cobro: string;
  observaciones_cobro: string;
};

type TransferenciaIntercambio = { fecha_proporcion3: string; fecha_contraparte: string; importe: number };

type FormState = {
  id_propuesta: string;
  id_cuenta_propuesta: string;
  id_contacto_propuesta: string;
  id_agente_propuesta: string;
  estado_propuesta: string;
  fase_propuesta: string;
  fecha_envio_propuesta: string;
  fecha_validez_propuesta: string;
  nombre_propuesta: string;
  comentarios_adicionales: string;
  forma_cobro_propuesta: string;
  descuento_final_propuesta: number;
  iva_aplicable: boolean;
  datos_facturacion: Record<string, string>;
  contacto_personalizado: { nombre: string; email: string; cargo: string } | null;
  lineas: Linea[];
  cobros: Cobro[];
  base_imponible_personalizada: boolean;
  importe_base_personalizada: number;
  es_intercambio: boolean;
  condiciones_intercambio: string;
  intercambio_precio_final: boolean;
  intercambio_transferencias: boolean;
  fecha_pago_proporcion3: string;
  fecha_pago_contraparte: string;
  importe_intercambio: number;
  idioma_propuesta: "es" | "en" | "it" | "pt";
  tipo_descuento_final: "porcentaje" | "importe";
  transferencias_intercambio: TransferenciaIntercambio[];
  moneda: "€" | "$";
};

const emptyCobro = (numero: number, importe = 0): Cobro => ({
  numero_cobro: numero,
  fecha_cobro: "",
  importe_cobro: importe,
  forma_cobro: "Transferencia bancaria",
  banco_cobro: "Banco Sabadell",
  observaciones_cobro: "",
});

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `prop_${crypto.randomUUID()}`;
  return `prop_${Date.now()}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function validUntil() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function normalizeDateText(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [yyyy, mm, dd] = text.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  return text;
}

function getDateParts(value = "") {
  const normalized = normalizeDateText(value);
  const [dd = "", mm = "", yyyy = ""] = normalized.split("/");
  if (normalized.includes("/")) return { dd, mm, yyyy };
  return { dd: "", mm: "", yyyy: "" };
}

function setDatePart(value: string, part: "dd" | "mm" | "yyyy", next: string) {
  const current = getDateParts(value);
  const cleaned = next.replace(/\D/g, "").slice(0, part === "yyyy" ? 4 : 2);
  const updated = { ...current, [part]: cleaned };
  if (!updated.dd && !updated.mm && !updated.yyyy) return "";
  return `${updated.dd}/${updated.mm}/${updated.yyyy}`;
}

function DatePartsInput({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const parts = getDateParts(value);
  const complete = /^\d{2}\/\d{2}\/\d{4}$/.test(value);
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span>{label}{required && <RequiredBadge complete={complete} />}</span>
      <DateInputRow className="grid grid-cols-[64px_64px_90px] gap-2">
        <input
          inputMode="numeric"
          placeholder="dd"
          value={parts.dd}
          onChange={(event) => onChange(setDatePart(value, "dd", event.target.value))}
          className="rounded-lg border p-2"
        />
        <input
          inputMode="numeric"
          placeholder="mm"
          value={parts.mm}
          onChange={(event) => onChange(setDatePart(value, "mm", event.target.value))}
          className="rounded-lg border p-2"
        />
        <input
          inputMode="numeric"
          placeholder="yyyy"
          value={parts.yyyy}
          onChange={(event) => onChange(setDatePart(value, "yyyy", event.target.value))}
          className="rounded-lg border p-2"
        />
      </DateInputRow>
    </div>
  );
}

function RequiredBadge({ complete }: { complete: boolean }) {
  return <span className={`ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${complete ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>{complete ? "1/1" : "0/1"}</span>;
}

function ToggleQuestion({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="text-sm"><p className="mb-2">{label}</p><div className="flex items-center gap-3"><span className={!checked ? "font-semibold text-blue-950" : "text-gray-500"}>No</span><Switch checked={checked} onChange={onChange} label={label} /><span className={checked ? "font-semibold text-blue-950" : "text-gray-500"}>Sí</span></div></div>;
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors hover:ring-2 hover:ring-blue-200 ${checked ? "bg-blue-950" : "bg-gray-300"}`}><span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} /></button>;
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Editor legado conservado para compatibilidad con propuestas anteriores.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LineaEditor({
  linea,
  index,
  servicios,
  gruposServicio,
  revistas,
  onPatch,
  onSelectServicio,
  onApplyRevista,
  onRemove,
}: {
  linea: Linea;
  index: number;
  servicios: any[];
  gruposServicio: { id: string; nombre: string }[];
  revistas: any[];
  onPatch: (patch: Partial<Linea>) => void;
  onSelectServicio: (idServicio: string) => void;
  onApplyRevista: (idPublicacion: string) => void;
  onRemove?: () => void;
}) {
  const [paginas, setPaginas] = useState<any[]>([]);
  const serviciosFiltrados = linea.grupo_servicio
    ? servicios.filter((servicio) => servicio.id_medio === linea.grupo_servicio)
    : servicios;
  const servicioSeleccionado = servicios.find((servicio) => servicio.id_servicio === linea.id_servicio);
  const esRevista = String(linea.medio || servicioSeleccionado?.nombre_medio || servicioSeleccionado?.id_medio || "")
    .toLowerCase()
    .includes("revista");
  const revistasFiltradas = revistas;

  useEffect(() => {
    if (!linea.id_publicacion) { setPaginas([]); return; }
    RevistaService.getPaginas(linea.id_publicacion).then((data) => setPaginas(Array.isArray(data?.paginas) ? data.paginas : [])).catch(() => setPaginas([]));
  }, [linea.id_publicacion]);

  return (
    <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        Grupo de servicios
        <select
          value={linea.grupo_servicio || ""}
          onChange={(event) => onPatch({ grupo_servicio: event.target.value, id_servicio: "", producto: "", medio: "", publicacion: "", id_publicacion: "" })}
          className="rounded-lg border p-2"
        >
          <option value="">Selecciona grupo</option>
          {gruposServicio.map((grupo) => (
            <option key={grupo.id} value={grupo.id}>
              {grupo.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Servicio
        <select
          value={linea.id_servicio}
          onChange={(event) => onSelectServicio(event.target.value)}
          disabled={!linea.grupo_servicio}
          className="rounded-lg border p-2 disabled:bg-gray-100"
        >
          <option value="">Selecciona servicio</option>
          {serviciosFiltrados.map((servicio) => (
            <option key={servicio.id_servicio} value={servicio.id_servicio}>
              {servicio.nombre_servicio_es || servicio.es?.nombre || servicio.id_servicio}
            </option>
          ))}
        </select>
      </label>

      {esRevista && (
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Publicación
          <select
            value={linea.id_publicacion || ""}
            onChange={(event) => {
              onPatch({ id_publicacion: event.target.value });
              onApplyRevista(event.target.value);
            }}
            className="rounded-lg border p-2"
          >
            <option value="">Selecciona publicacion</option>
            {revistasFiltradas.map((revista) => (
              <option key={revista.id_publicacion || revista.id_revista} value={revista.id_publicacion || revista.id_revista}>
                {revista.revista} - {revista.edicion} - numero {revista.numero_publicacion || revista.publicacion}
              </option>
            ))}
          </select>
        </label>
      )}

      {esRevista && linea.id_publicacion && <div className="md:col-span-2 rounded border p-4"><p className="mb-3 text-sm font-semibold">Páginas preferentes de la publicación</p><div className="grid gap-4 md:grid-cols-2"><div><p className="mb-2 text-xs font-semibold uppercase text-gray-500">Preferentes disponibles</p><div className="grid grid-cols-2 gap-2">{paginas.filter((page) => String(page.pagina_preferente || "").startsWith("pag_pref_")).map((page) => <PageChoice key={page.id_pagina_publicacion} page={page} selected={linea.id_pagina_publicacion === page.id_pagina_publicacion} onSelect={() => !page.has_content && onPatch({ id_pagina_publicacion: page.id_pagina_publicacion })} />)}</div></div><div><p className="mb-2 text-xs font-semibold uppercase text-gray-500">Posibilidades</p><div className="space-y-2">{paginas.filter((page) => ["portada", "interior_portada"].includes(String(page.pagina_preferente || ""))).map((page) => <PageChoice key={page.id_pagina_publicacion} page={page} selected={linea.id_pagina_publicacion === page.id_pagina_publicacion} onSelect={() => !page.has_content && onPatch({ id_pagina_publicacion: page.id_pagina_publicacion })} />)}<div className="rounded border border-dashed p-3 text-sm"><strong>Página premium</strong><p className="text-xs text-gray-500">Selecciona una página numerada a la izquierda.</p></div></div></div></div><div className="mt-3 flex gap-4 text-xs"><span className="text-green-700">● Disponible</span><span className="text-orange-600">● Ofrecida</span><span className="text-red-700">● Vendida</span></div></div>}

      <label className="flex flex-col gap-1 text-sm">
        Servicio
        <input value={linea.producto} readOnly className="cursor-not-allowed rounded-lg border bg-gray-100 p-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Unidades
        <input type="number" value={linea.unidades} onChange={(event) => onPatch({ unidades: toNumber(event.target.value) })} className="rounded-lg border p-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Medio
        <input value={linea.medio} onChange={(event) => onPatch({ medio: event.target.value })} className="rounded-lg border p-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Publicación
        <textarea value={linea.publicacion} onChange={(event) => onPatch({ publicacion: event.target.value })} className="min-h-20 rounded-lg border p-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Precio tarifa
        <input type="number" value={linea.precio_tarifa} onChange={(event) => onPatch({ precio_tarifa: toNumber(event.target.value) })} className="rounded-lg border p-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Precio unitario
        <input type="number" value={linea.precio_unitario} onChange={(event) => onPatch({ precio_unitario: toNumber(event.target.value) })} className="rounded-lg border p-2" />
      </label>
      {(linea.modo_precio || "calculado") === "calculado" && <label className="flex flex-col gap-1 text-sm">Descuento unitario (%)<input type="number" min="0" max="100" value={linea.descuento_producto} onChange={(event) => onPatch({ descuento_producto: toNumber(event.target.value) })} className="rounded-lg border p-2" /></label>}
      <DatePartsInput label="Deadline publicación" value={linea.deadline_publicacion} onChange={(value) => onPatch({ deadline_publicacion: value })} />
      <DatePartsInput label="Fecha publicación" value={linea.fecha_publicacion_publicacion} onChange={(value) => onPatch({ fecha_publicacion_publicacion: value })} />
      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Descripción
        <textarea value={linea.descripcion_linea} onChange={(event) => onPatch({ descripcion_linea: event.target.value })} className="min-h-24 rounded-lg border p-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Especificaciones
        <textarea value={linea.especificaciones_linea || ""} onChange={(event) => onPatch({ especificaciones_linea: event.target.value })} className="min-h-20 rounded-lg border p-2" />
      </label>
      <fieldset className="md:col-span-2 rounded border p-3 text-sm"><legend className="font-medium">Acciones de precio</legend><div className="mt-2 flex flex-wrap gap-4">{[["calculado", "Precio calculado"], ["tachado", "Tachado"], ["gratis", "Gratis"], ["personalizado", "Personalizado"]].map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2"><input type="radio" name={`modo-${index}`} checked={(linea.modo_precio || "calculado") === value} onChange={() => onPatch({ modo_precio: value as Linea["modo_precio"], precio_total_personalizado: value === "personalizado" ? toNumber(linea.precio_unitario) * toNumber(linea.unidades) : null })} className="cursor-pointer" />{label}</label>)}</div>{linea.modo_precio === "personalizado" && <label className="mt-3 block">Total personalizado<input type="number" min="0" value={linea.precio_total_personalizado ?? 0} onChange={(event) => onPatch({ precio_total_personalizado: toNumber(event.target.value) })} className="ml-3 rounded border p-2" /></label>}</fieldset>
      {onRemove && (
        <div className="md:col-span-2">
          <button type="button" onClick={onRemove} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Quitar línea {index + 1}
          </button>
        </div>
      )}
    </div>
  );
}

function defaultForm(cuentaId = ""): FormState {
  const id = makeId();
  return {
    id_propuesta: id,
    id_cuenta_propuesta: cuentaId,
    id_contacto_propuesta: "",
    id_agente_propuesta: "",
    estado_propuesta: "Borrador",
    fase_propuesta: "1",
    fecha_envio_propuesta: normalizeDateText(today()),
    fecha_validez_propuesta: normalizeDateText(validUntil()),
    nombre_propuesta: "",
    comentarios_adicionales: "",
    forma_cobro_propuesta: "Transferencia bancaria",
    descuento_final_propuesta: 0,
    iva_aplicable: true,
    datos_facturacion: {},
    contacto_personalizado: null,
    lineas: [],
    cobros: [],
    base_imponible_personalizada: false,
    importe_base_personalizada: 0,
    es_intercambio: false,
    condiciones_intercambio: "",
    intercambio_precio_final: false,
    intercambio_transferencias: false,
    fecha_pago_proporcion3: "",
    fecha_pago_contraparte: "",
    importe_intercambio: 0,
    idioma_propuesta: "es",
    tipo_descuento_final: "porcentaje",
    transferencias_intercambio: [],
    moneda: "€",
  };
}

function mapPropuestaToForm(propuesta: any): FormState {
  return {
    ...defaultForm(),
    id_propuesta: propuesta.id_propuesta,
    id_cuenta_propuesta: propuesta.id_cuenta_propuesta ?? "",
    id_contacto_propuesta: propuesta.id_contacto_propuesta ?? "",
    id_agente_propuesta: propuesta.id_agente_propuesta ?? "",
    estado_propuesta: propuesta.estado_propuesta ?? "Borrador",
    fase_propuesta: propuesta.fase_propuesta ?? "1",
    fecha_envio_propuesta: normalizeDateText(String(propuesta.fecha_envio_propuesta ?? "").slice(0, 10)),
    fecha_validez_propuesta: normalizeDateText(String(propuesta.fecha_validez_propuesta ?? "").slice(0, 10)),
    nombre_propuesta: propuesta.nombre_propuesta ?? "",
    comentarios_adicionales: propuesta.comentarios_adicionales ?? "",
    forma_cobro_propuesta: propuesta.forma_cobro_propuesta ?? "Transferencia bancaria",
    descuento_final_propuesta: toNumber(propuesta.descuento_final_propuesta),
    iva_aplicable: Boolean(propuesta.iva_aplicable),
    datos_facturacion: propuesta.datos_facturacion ?? {},
    contacto_personalizado: propuesta.contacto_personalizado ?? null,
    lineas: Array.isArray(propuesta.lineas) ? propuesta.lineas : [],
    cobros: Array.isArray(propuesta.cobros) ? propuesta.cobros : [],
    base_imponible_personalizada: Boolean(propuesta.base_imponible_personalizada),
    importe_base_personalizada: toNumber(propuesta.importe_base_personalizada),
    es_intercambio: Boolean(propuesta.es_intercambio),
    condiciones_intercambio: propuesta.condiciones_intercambio ?? "",
    intercambio_precio_final: Boolean(propuesta.intercambio_precio_final),
    intercambio_transferencias: Boolean(propuesta.intercambio_transferencias),
    fecha_pago_proporcion3: propuesta.fecha_pago_proporcion3 ?? "",
    fecha_pago_contraparte: propuesta.fecha_pago_contraparte ?? "",
    importe_intercambio: toNumber(propuesta.importe_intercambio),
    idioma_propuesta: propuesta.idioma_propuesta ?? "es",
    tipo_descuento_final: propuesta.tipo_descuento_final ?? "porcentaje",
    transferencias_intercambio: Array.isArray(propuesta.transferencias_intercambio) ? propuesta.transferencias_intercambio : [],
    moneda: propuesta.moneda === "$" ? "$" : "€",
  };
}

export default function PropuestaEditor({
  mode,
  idPropuesta,
  cuentaInicial,
  initialStep,
}: {
  mode: "create" | "edit" | "replicate";
  idPropuesta?: string;
  cuentaInicial?: string;
  initialStep?: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState(mode === "replicate" ? 0 : 1);
  const [form, setForm] = useState<FormState>(() => defaultForm(cuentaInicial));
  const formRef=useRef(form);
  formRef.current=form;
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [accountSearch,setAccountSearch]=useState(false);
  const [contactos, setContactos] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [revistas, setRevistas] = useState<any[]>([]);
  const [lineModalIndex, setLineModalIndex] = useState<number | null>(null);
  const [lineModalDraft, setLineModalDraft] = useState<Linea | null>(null);
  const [lineModalStep, setLineModalStep] = useState(1);
  const [loading, setLoading] = useState(mode === "edit" || mode === "replicate");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [manualContact, setManualContact] = useState(false);
  const [templateOpen,setTemplateOpen]=useState(false);
  const [preferredPageIds,setPreferredPageIds]=useState<Set<string>>(new Set());
  const publicationIds=[...new Set(form.lineas.map(line=>line.id_publicacion).filter(Boolean))].join('|');
  useEffect(()=>{const ids=publicationIds.split('|').filter(Boolean);if(!ids.length){setPreferredPageIds(new Set());return;}let active=true;Promise.all(ids.map(id=>RevistaService.getPaginas(id))).then(results=>{if(!active)return;setPreferredPageIds(new Set(results.flatMap(result=>result?.paginas||[]).filter((page:any)=>String(page.pagina_preferente||'').startsWith('pag_pref_')).map((page:any)=>page.id_pagina_publicacion)));}).catch(()=>{if(active)setPreferredPageIds(new Set());});return()=>{active=false;};},[publicationIds]);

  useEffect(() => setSaved(false), [form]);

  useEffect(() => {
    ServicioService.getServicios().then((data) => setServicios(Array.isArray(data) ? data.filter((item) => item.disponibilidad !== "Oculto") : [])).catch(() => setServicios([]));
    AgenteService.getAgentes().then((data) => setAgentes(Array.isArray(data) ? data : [])).catch(() => setAgentes([]));
    RevistaService.getRevistas().then((data) => setRevistas(Array.isArray(data) ? data : [])).catch(() => setRevistas([]));
  }, []);

  useEffect(()=>{let active=true;if(form.id_cuenta_propuesta)CuentaService.getCuentaById(form.id_cuenta_propuesta).then(account=>{if(active)setCuentas([account]);}).catch(reason=>{if(active)setError(reason.message);});else setCuentas([]);return()=>{active=false;};},[form.id_cuenta_propuesta]);

  useEffect(() => {
    if (!form.id_cuenta_propuesta) {
      setContactos([]);
      return;
    }
    let active=true;const accountId=form.id_cuenta_propuesta;
    ContactoService.getContactos({ id_cuenta: accountId })
      .then((data) => {if(!active)return;const rows=Array.isArray(data)?data:[];setContactos(rows);setManualContact(rows.length===0||Boolean(formRef.current.contacto_personalizado));setForm(prev=>{
        if(prev.id_cuenta_propuesta!==accountId)return prev;
        if(!rows.length)return {...prev,id_contacto_propuesta:'',contacto_personalizado:prev.contacto_personalizado||{nombre:'',email:'',cargo:''}};
        if(prev.id_contacto_propuesta||prev.contacto_personalizado)return prev;
        return {...prev,id_contacto_propuesta:rows.find(item=>item.es_principal)?.id_contacto||rows[0].id_contacto};
      });})
      .catch(() => {if(active)setContactos([]);});return()=>{active=false;};
  }, [form.id_cuenta_propuesta]);

  useEffect(() => {
    if (mode !== "edit" || !idPropuesta) return;
    setLoading(true);
    PropuestaService.getPropuestaById(idPropuesta)
      .then((data) => {
        setForm(mapPropuestaToForm(data));
        const editableDraft = String(data?.estado_propuesta || "").toLowerCase().match(/borrador|construcci/);
        setStep(initialStep ? Math.min(4, Math.max(1, initialStep)) : editableDraft ? Math.min(4, Math.max(1, Number(data?.fase_propuesta) || 1)) : 4);
      })
      .catch(() => setError("No se ha podido cargar la propuesta."))
      .finally(() => setLoading(false));
  }, [mode, idPropuesta, router, initialStep]);

  useEffect(() => {
    if (mode !== "replicate" || !idPropuesta) return;
    setLoading(true);
    PropuestaService.getPropuestaById(idPropuesta)
      .then((data) => {
        const fresh = defaultForm("");
        setForm({
          ...fresh,
          idioma_propuesta: data.idioma_propuesta || "es",
          lineas: (data.lineas || []).map((linea: Linea) => ({ ...linea, id_linea_propuesta: undefined })),
          descuento_final_propuesta: toNumber(data.descuento_final_propuesta),
          tipo_descuento_final: data.tipo_descuento_final || "porcentaje",
          base_imponible_personalizada: Boolean(data.base_imponible_personalizada),
          importe_base_personalizada: toNumber(data.importe_base_personalizada),
        });
        setStep(0);
      })
      .catch(() => setError("No se ha podido cargar la propuesta que quieres replicar."))
      .finally(() => setLoading(false));
  }, [mode, idPropuesta]);

  useEffect(() => {
    if (!cuentaInicial || mode !== "create") return;
    setForm((prev) => ({ ...prev, id_cuenta_propuesta: cuentaInicial }));
  }, [cuentaInicial, mode]);

  useEffect(() => {
    if (lineModalIndex === null) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setLineModalIndex(null); setLineModalDraft(null); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [lineModalIndex]);

  const cuenta = useMemo(
    () => cuentas.find((item) => item.id_cuenta === form.id_cuenta_propuesta),
    [cuentas, form.id_cuenta_propuesta],
  );
  useEffect(() => {
    if (!cuenta) return;
    const country = String(cuenta.pais_facturacion || cuenta.pais_cuenta || "").trim().toLowerCase();
    setForm((prev) => ({ ...prev, iva_aplicable: ["españa", "espana", "spain", "es"].includes(country) }));
  }, [cuenta]);

  useEffect(() => {
    if (!cuenta || mode === "edit") return;
    setForm((prev) => {
      const fechaTitulo = String(prev.fecha_envio_propuesta || "").replaceAll("/", "-");
      const nombre = prev.nombre_propuesta || `prop_${cuenta.id_cuenta}_${fechaTitulo}`;
      return {
        ...prev,
        nombre_propuesta: nombre,
        id_agente_propuesta: prev.id_agente_propuesta || agentes.find((agent) => agent.id_agente === cuenta.id_agente && isCommercialAgent(agent))?.id_agente || "",
        datos_facturacion: {
          nombre_fiscal: cuenta.nombre_fiscal || cuenta.nombre_empresa || "",
          vat_code: cuenta.vat_code || "",
          pais_facturacion: cuenta.pais_facturacion || cuenta.pais_cuenta || "",
          direccion_facturacion: cuenta.direccion_facturacion || "",
          poblacion_facturacion: cuenta.poblacion_facturacion || "",
          cp_facturacion: cuenta.cp_facturacion || "",
          mail_contabilidad: cuenta.mail_contabilidad || "",
        },
      };
    });
  }, [cuenta, mode, agentes]);

  const lineTotal = (line: Linea) => {
    if (line.modo_precio === "gratis" || line.modo_precio === "tachado") return 0;
    if (line.modo_precio === "personalizado") return toNumber(line.precio_total_personalizado);
    const gross = toNumber(line.precio_unitario) * toNumber(line.unidades || 1);
    return line.tipo_descuento_producto === "importe" ? Math.max(0, gross - toNumber(line.descuento_producto)) : gross * (1 - toNumber(line.descuento_producto) / 100);
  };
  const subtotal = form.lineas.reduce((sum, line) => sum + lineTotal(line), 0);
  const generalDiscountAmount = form.tipo_descuento_final === "porcentaje"
    ? subtotal * Math.min(100, Math.max(0, toNumber(form.descuento_final_propuesta))) / 100
    : Math.min(subtotal, Math.max(0, toNumber(form.descuento_final_propuesta)));
  const calculatedBase = Math.max(0, subtotal - generalDiscountAmount);
  const baseImponible = form.base_imponible_personalizada ? Math.max(0, toNumber(form.importe_base_personalizada)) : calculatedBase;
  const totalConIva = form.iva_aplicable ? baseImponible * 1.21 : baseImponible;
  const cobrosTotal = form.cobros.reduce((sum, cobro) => sum + toNumber(cobro.importe_cobro), 0);
  const cuentaEspanola = ["españa", "espana", "spain", "es"].includes(String(cuenta?.pais_cuenta || cuenta?.pais_facturacion || "").trim().toLowerCase());

  useEffect(() => {
    if (step !== 3 || form.cobros.length) return;
    setForm((prev) => ({ ...prev, cobros: [{ ...emptyCobro(1, totalConIva), fecha_cobro: addCalendarMonths('', 2), banco_cobro: cuentaEspanola ? "Banco Santander" : "Banco Sabadell" }] }));
  }, [cuentaEspanola, form.cobros.length, step, totalConIva]);

  function updateLine(index: number, patch: Partial<Linea>) {
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      lineas: prev.lineas.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  }

  const gruposServicio = useMemo(() => {
    const channelNames: Record<string, string> = {
      vidrioperfil_portal: "Vidrioperfil Portal",
      vidrioperfil_newsletter: "Vidrioperfil Newsletter",
      newsletter_personalizado: "Newsletter Personalizado",
      revista: "Revista",
      suscripcion: "Suscripción",
      otros: "Otros",
    };
    const channelOrder = Object.keys(channelNames);
    const map = new Map<string, string>();
    servicios.forEach((servicio) => {
      const id = servicio.id_medio || "";
      if (!id) return;
      map.set(id, channelNames[id] || servicio.nombre_medio || id);
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre })).sort((a, b) => {
      const aIndex = channelOrder.indexOf(a.id);
      const bIndex = channelOrder.indexOf(b.id);
      return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex);
    });
  }, [servicios]);

  const revistasById = useMemo(() => {
    const map = new Map<string, any>();
    revistas.forEach((revista) => map.set(revista.id_publicacion || revista.id_revista, revista));
    return map;
  }, [revistas]);

  function servicePatch(idServicio: string): Partial<Linea> {
    const servicio = servicios.find((item) => item.id_servicio === idServicio);
    const precio = toNumber(servicio?.precio_tarifa ?? servicio?.precio_servicio);
    const language = form.idioma_propuesta;
    const suffix = language === "es" ? "es" : language;
    const medio = servicio?.[`medio_servicio_${suffix}`] || servicio?.medio_servicio_es || "";
    const edicion = servicio?.[`edicion_servicio_${suffix}`] || servicio?.edicion_servicio_es || "";
    const publicacion = servicio?.[`publicacion_servicio_${suffix}`] || servicio?.publicacion_servicio_es || "";
    const nombre = servicio?.[`nombre_servicio_${suffix}`] || servicio?.nombre_servicio_es || "";
    const selectedMagazine=lineModalDraft?.id_publicacion ? revistasById.get(lineModalDraft.id_publicacion) : null;
    const issue=selectedMagazine?.numero_publicacion||selectedMagazine?.numero||'';
    const issueWord={es:'número',en:'issue',it:'numero',pt:'número'}[language];
    return {
      grupo_servicio: servicio?.id_medio || "",
      id_servicio: idServicio,
      medio,
      publicacion: `${edicion} ${publicacion} ${issue?`${issueWord} ${issue}`:''}`.trim(),
      producto: nombre,
      descripcion_linea: `${edicion} ${publicacion}`.trim(),
      especificaciones_linea: nombre,
      servicio_personalizado: false,
      precio_tarifa: precio,
      precio_unitario: precio,
      deadline_publicacion: servicio?.fecha_deadline_servicio || "",
      fecha_publicacion_publicacion: servicio?.fecha_publicacion_servicio || "",
    };
  }

  function publicationPatch(idPublicacion: string): Partial<Linea> {
    const revista = revistasById.get(idPublicacion);
    return {
      id_publicacion: idPublicacion,
      publicacion: revista ? `${revista.revista} ${revista.edicion} numero ${revista.numero_publicacion || revista.publicacion}` : "",
      deadline_publicacion: revista?.deadline_materiales || "",
      fecha_publicacion_publicacion: revista?.fecha_publicacion || "",
    };
  }

  async function save(nextEstado?: string, nextFase?: string) {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        estado_propuesta: nextEstado ?? form.estado_propuesta,
        fase_propuesta: nextFase ?? String(step),
        importe_total_bi_propuesta: baseImponible,
        importe_propuesta_con_iva: totalConIva,
        forma_cobro_propuesta: form.cobros[0]?.forma_cobro || form.forma_cobro_propuesta,
      };
      const saved =
        mode === "edit"
          ? await PropuestaService.updatePropuesta(form.id_propuesta, payload)
          : await PropuestaService.createPropuesta(payload);
      setSaved(true);
      return saved;
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se ha podido guardar la propuesta.");
    } finally {
      setSaving(false);
    }
  }

  function saveDraftAndExit() {
    const keepStatus = mode === "edit" && !/borrador|construcci/i.test(form.estado_propuesta);
    void save(keepStatus ? form.estado_propuesta : "En construcción", String(step)).then((result) => {
      if (result) router.push("/dashboard/comercial/propuestas");
    });
  }

  const manualContactValid = Boolean(form.contacto_personalizado?.nombre.trim() && form.contacto_personalizado?.email.trim());
  const datesStep1Valid = /^\d{2}\/\d{2}\/\d{4}$/.test(form.fecha_envio_propuesta) && /^\d{2}\/\d{2}\/\d{4}$/.test(form.fecha_validez_propuesta);
  const canStep1 = Boolean(form.id_cuenta_propuesta && (form.id_contacto_propuesta || manualContactValid) && form.nombre_propuesta.trim() && datesStep1Valid);
  const step1Issues = [
    !form.id_cuenta_propuesta && "Debes seleccionar una cuenta.",
    !(form.id_contacto_propuesta || manualContactValid) && "Debes seleccionar un contacto o completar el contacto manual.",
    !form.nombre_propuesta.trim() && "Debes indicar el título de la propuesta.",
    !datesStep1Valid && "Las fechas de creación y expiración deben estar completas en formato dd/mm/aaaa.",
  ].filter((issue): issue is string => Boolean(issue));
  const step2Issues = form.lineas.length === 0 ? ["Debes añadir al menos un servicio."] : form.lineas.flatMap((line, index) => {
    const issues: string[] = [];
    if (!line.id_servicio) issues.push(`Línea ${index + 1}: falta seleccionar un servicio.`);
    if ((line.servicio_personalizado || line.id_servicio === "personalizado") && !line.producto.trim()) issues.push(`Línea ${index + 1}: falta escribir el nombre del servicio personalizado.`);
    if (toNumber(line.unidades) <= 0) issues.push(`Línea ${index + 1}: las unidades deben ser mayores que cero.`);
    return issues;
  });
  const canStep2 = step2Issues.length === 0;
  const validDateText = (value: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(value);
  const transfersValid = !form.intercambio_transferencias || (form.transferencias_intercambio.length > 0 && form.transferencias_intercambio.every((item) => validDateText(item.fecha_proporcion3) && validDateText(item.fecha_contraparte) && item.importe > 0));
  const exchangeValid = !form.es_intercambio || Boolean(form.condiciones_intercambio.trim() && transfersValid);
  const paymentsHaveDates = form.cobros.every((cobro) => validDateText(cobro.fecha_cobro));
  const canStep3 = form.cobros.length > 0 && paymentsHaveDates && Math.abs(cobrosTotal - totalConIva) < 0.02 && exchangeValid;
  const step3Issues = [
    form.cobros.length === 0 && "Debes añadir al menos un pago.",
    form.cobros.length > 0 && !paymentsHaveDates && "Todos los pagos deben tener una fecha completa en formato dd/mm/aaaa.",
    Math.abs(cobrosTotal - totalConIva) >= 0.02 && (cobrosTotal > totalConIva
      ? `El total de los pagos excede en ${(cobrosTotal - totalConIva).toFixed(2)} ${form.moneda} el importe de la propuesta.`
      : `Al total de los pagos le faltan ${(totalConIva - cobrosTotal).toFixed(2)} ${form.moneda} para alcanzar el importe de la propuesta.`),
    !exchangeValid && "Debes completar las condiciones y los datos obligatorios del intercambio.",
  ].filter((issue): issue is string => Boolean(issue));
  const isDraftProposal = /borrador|construcci/i.test(form.estado_propuesta);

  function finishOrReturnToProposal() {
    if (!isDraftProposal && mode === "edit") {
      router.push(`/dashboard/comercial/propuestas/${form.id_propuesta}`);
      return;
    }
    void save("Pendiente", "4").then((result) => {
      if (result) router.push(`/dashboard/comercial/propuestas/${result.id_propuesta}`);
    });
  }

  async function advance() {
    if (step === 0) {
      setStep(1);
      return;
    }
    const next = step + 1;
    const result = await save(mode === "edit" && !isDraftProposal ? form.estado_propuesta : "En construcción", String(next));
    if (!result) return;
    if (mode !== "edit") {
      router.push(`/dashboard/comercial/propuestas/${result.id_propuesta}/editar`);
      return;
    }
    setStep(next);
    setForm(mapPropuestaToForm(result));
  }
  const title = mode === "edit" ? `Editar propuesta ${form.id_propuesta}` : mode === "replicate" ? `Replicar propuesta ${idPropuesta}` : "Crear propuesta";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-600">
        <MiddleNav tituloprincipal={title} />
        <div className="p-12">Cargando propuesta...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-600">
      <MiddleNav tituloprincipal={title} />
      <div className="px-4 py-6 md:px-6">
        {step >= 2 && <div className="mb-4 flex justify-end gap-3">
          <button type="button" onClick={() => void save(mode === "edit" && !isDraftProposal ? form.estado_propuesta : "En construcción", String(step))} disabled={saving} aria-label="Guardar cambios" className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-green-50 disabled:cursor-not-allowed ${saved ? "border-green-600 bg-green-50 text-green-700" : "border-blue-950 text-blue-950"}`}>
            <span aria-hidden="true">▣</span> {saved ? "Guardado" : "Guardar"}
          </button>
          <button onClick={saveDraftAndExit} disabled={saving || !form.id_cuenta_propuesta} className="cursor-pointer rounded-lg border border-blue-950 px-4 py-2 text-sm text-blue-950 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">
            Guardar y salir
          </button>
          <Link href="/dashboard/comercial/propuestas" className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700">
            Cancelar
          </Link>
        </div>}

        <div className="rounded-lg bg-white shadow-xl">
          <div className="flex border-b border-gray-200 bg-gray-50 px-6 py-4">
            {(mode === "replicate" ? [0, 1, 2, 3, 4] : [1, 2, 3, 4]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => item < step && setStep(item)}
                disabled={item > step}
                className={`mr-3 h-10 w-10 rounded-full text-sm font-semibold ${item <= step ? "cursor-pointer hover:ring-2 hover:ring-blue-200" : "cursor-not-allowed"} ${step === item ? "bg-blue-950 text-white" : item < step ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}
              >
                {item}
              </button>
            ))}
            <span className="self-center text-sm">
              {step === 1 && "Datos generales"}
              {step === 0 && "Servicios que se replicarán"}
              {step === 2 && "Servicios"}
              {step === 3 && "Pagos"}
              {step === 4 && "Revisión"}
            </span>
          </div>

          <div className="space-y-6 p-8">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            {step === 0 && (
              <section className="space-y-4">
                <div><h2 className="text-lg font-semibold text-blue-950">Servicios que se replicarán</h2><p className="text-sm text-gray-500">Estos servicios se copiarán a una propuesta nueva. En la fase 2 podrás modificar precios, unidades, descuentos, descripciones y especificaciones.</p></div>
                <div className="overflow-x-auto rounded-lg border"><SortableTable className="min-w-full text-sm"><thead className="bg-slate-800 text-white"><tr><th className="p-3 text-left">Servicio</th><th className="p-3 text-left">Descripción</th><th className="p-3 text-left">Especificaciones</th><th className="p-3 text-right">Unidades</th><th className="p-3 text-right">Precio unitario</th></tr></thead><tbody>{form.lineas.map((linea, index) => <tr key={`${linea.id_servicio}-${index}`} className="border-t"><td className="p-3 font-medium text-blue-950">{linea.producto || linea.id_servicio}</td><td className="p-3">{linea.descripcion_linea || "—"}</td><td className="p-3">{linea.especificaciones_linea || "—"}</td><td className="p-3 text-right">{linea.unidades}</td><td className="p-3 text-right">{toNumber(linea.precio_unitario).toFixed(2)} €</td></tr>)}</tbody></SortableTable></div>
              </section>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <section>
                  <h2 className="mb-3 text-lg font-semibold text-blue-950">Datos generales</h2>
                  <p className="mb-3 text-sm text-gray-500">Selecciona una cuenta para comenzar la propuesta.<RequiredBadge complete={Boolean(cuenta)} /></p>
                  <button type="button" onClick={()=>setAccountSearch(true)} className="w-full cursor-pointer rounded border bg-white p-3 text-left hover:bg-blue-50">{cuenta ? cuenta.nombre_empresa+' · '+cuenta.id_cuenta : 'Buscar y seleccionar cuenta'}</button>
                  {accountSearch&&<AccountSearchModal accounts={cuentas} onClose={()=>setAccountSearch(false)} onSelect={id=>{setManualContact(false);setContactos([]);setForm(prev=>({...prev,id_cuenta_propuesta:id,id_contacto_propuesta:'',contacto_personalizado:null}));setAccountSearch(false);}}/>}
                </section>

                {cuenta && <section>
                  <div className="mb-4 rounded border border-green-300 bg-green-50 p-4 text-sm"><span className="block text-xs font-semibold uppercase text-green-700">Cuenta seleccionada</span><strong className="text-blue-950">{cuenta.nombre_empresa || cuenta.id_cuenta}</strong><span className="ml-2 text-gray-600">({cuenta.id_cuenta}) · {cuenta.pais_cuenta || "País sin indicar"}</span></div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-4"><div><h3 className="font-semibold text-blue-950">Contactos de la cuenta<RequiredBadge complete={Boolean(form.id_contacto_propuesta || manualContactValid)} /></h3><p className="text-sm text-gray-500">Selecciona obligatoriamente un contacto para continuar.</p></div><div className="rounded border bg-gray-50 p-3 text-sm"><p>¿Deseas introducir el contacto manualmente?</p><div className="mt-2 flex items-center justify-center gap-3"><span>No</span><button type="button" role="switch" aria-checked={manualContact} aria-label="Introducir el contacto manualmente" disabled={contactos.length===0} onClick={() => { const checked = !manualContact; setManualContact(checked); setForm((prev) => ({ ...prev, id_contacto_propuesta: "", contacto_personalizado: checked ? { nombre: "", email: "", cargo: "" } : null })); }} className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors hover:ring-2 hover:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:ring-0 ${manualContact ? "bg-blue-950" : "bg-gray-300"}`}><span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${manualContact ? "translate-x-5" : "translate-x-0"}`} /></button><span>Sí</span></div></div></div>
                  {!manualContact ? <div className="overflow-x-auto border"><SortableTable className="min-w-full text-sm"><thead className="bg-blue-950 text-white"><tr><th className="p-2 text-left">Nombre</th><th className="p-2 text-left">Correo</th><th className="p-2 text-left">Teléfono</th></tr></thead><tbody>{contactos.map((item) => <tr key={item.id_contacto} onClick={() => setForm((prev) => ({ ...prev, id_contacto_propuesta: item.id_contacto, contacto_personalizado: null }))} className={`cursor-pointer border-t hover:bg-blue-50 ${form.id_contacto_propuesta === item.id_contacto ? "bg-green-50" : ""}`}><td className="p-2">{item.nombre_completo_contacto}</td><td className="p-2">{item.email_contacto || "-"}</td><td className="p-2">{item.telefono_contacto || "-"}</td></tr>)}</tbody></SortableTable></div> : <div className="grid gap-3 md:grid-cols-2"><label className="text-sm">Nombre del contacto<RequiredBadge complete={Boolean(form.contacto_personalizado?.nombre.trim())} /><input value={form.contacto_personalizado?.nombre || ""} onChange={(event) => setForm((prev) => ({ ...prev, contacto_personalizado: { nombre: event.target.value, email: prev.contacto_personalizado?.email || "", cargo: "" } }))} className="mt-1 w-full rounded border p-2" /></label><label className="text-sm">Correo del contacto<RequiredBadge complete={Boolean(form.contacto_personalizado?.email.trim())} /><input type="email" value={form.contacto_personalizado?.email || ""} onChange={(event) => setForm((prev) => ({ ...prev, contacto_personalizado: { nombre: prev.contacto_personalizado?.nombre || "", email: event.target.value, cargo: "" } }))} className="mt-1 w-full rounded border p-2" /></label></div>}
                </section>}
                <label className="block text-sm">Título de la propuesta<RequiredBadge complete={Boolean(form.nombre_propuesta.trim())} /><input value={form.nombre_propuesta} onChange={(event) => setForm((prev) => ({ ...prev, nombre_propuesta: event.target.value }))} className="mt-1 w-full rounded border p-2" /></label>
                <label className="block text-sm">Idioma de la propuesta<RequiredBadge complete={Boolean(form.idioma_propuesta)} /><select value={form.idioma_propuesta} onChange={(event) => setForm((prev) => ({ ...prev, idioma_propuesta: event.target.value as FormState["idioma_propuesta"] }))} className="mt-1 w-full cursor-pointer rounded border bg-white p-2 hover:border-blue-950"><option value="es">Español</option><option value="en">Inglés</option><option value="it">Italiano</option><option value="pt">Portugués</option></select></label>
                <label className="block text-sm">Moneda<RequiredBadge complete={Boolean(form.moneda)} /><select value={form.moneda} onChange={(event) => setForm((prev) => ({ ...prev, moneda: event.target.value as FormState["moneda"] }))} className="mt-1 w-full cursor-pointer rounded border bg-white p-2 hover:border-blue-950"><option value="€">Euro (€)</option><option value="$">Dólar ($)</option></select></label>
                <div className="grid gap-4 md:grid-cols-2"><DatePartsInput required label="Fecha de creación" value={form.fecha_envio_propuesta} onChange={(value) => setForm((prev) => ({ ...prev, fecha_envio_propuesta: value }))} /><DatePartsInput required label="Fecha estimada de expiración" value={form.fecha_validez_propuesta} onChange={(value) => setForm((prev) => ({ ...prev, fecha_validez_propuesta: value }))} /></div>
              </div>
            )}

            {false && step === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Cuenta
                  <select
                    value={form.id_cuenta_propuesta}
                    onChange={(event) => setForm((prev) => ({ ...prev, id_cuenta_propuesta: event.target.value, id_contacto_propuesta: "" }))}
                    className="rounded-lg border p-2"
                  >
                    <option value="">Selecciona una cuenta</option>
                    {cuentas.map((item) => (
                      <option key={item.id_cuenta} value={item.id_cuenta}>
                        {item.nombre_empresa} ({item.id_cuenta})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Contacto
                  <select
                    value={form.id_contacto_propuesta}
                    onChange={(event) => setForm((prev) => ({ ...prev, id_contacto_propuesta: event.target.value, contacto_personalizado: null }))}
                    className="rounded-lg border p-2"
                  >
                    <option value="">Selecciona un contacto</option>
                    {contactos.map((item) => (
                      <option key={item.id_contacto} value={item.id_contacto}>
                        {item.nombre_completo_contacto} ({item.email_contacto})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Nombre de propuesta
                  <input value={form.nombre_propuesta} onChange={(event) => setForm((prev) => ({ ...prev, nombre_propuesta: event.target.value }))} className="rounded-lg border p-2" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Agente
                  <select
                    value={form.id_agente_propuesta}
                    onChange={(event) => setForm((prev) => ({ ...prev, id_agente_propuesta: event.target.value }))}
                    className="rounded-lg border p-2"
                  >
                    <option value="">Selecciona agente</option>
                    {agentes.filter(isCommercialAgent).map((agente) => (
                      <option key={agente.id_agente} value={agente.id_agente}>
                        {agente.nombre_completo_agente || `${agente.nombre_agente || ""} ${agente.apellidos_agente || ""}`.trim() || agente.id_agente}
                      </option>
                    ))}
                  </select>
                </label>
                <DatePartsInput label="Fecha envío propuesta" value={form.fecha_envio_propuesta} onChange={(value) => setForm((prev) => ({ ...prev, fecha_envio_propuesta: value }))} />
                <DatePartsInput label="Fecha validez propuesta" value={form.fecha_validez_propuesta} onChange={(value) => setForm((prev) => ({ ...prev, fecha_validez_propuesta: value }))} />
                <div className="md:col-span-2 rounded-lg border p-4">
                  <p className="mb-3 text-sm font-semibold">Contacto personalizado</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {["nombre", "email", "cargo"].map((field) => (
                      <input
                        key={field}
                        placeholder={field}
                        value={(form.contacto_personalizado as any)?.[field] ?? ""}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            id_contacto_propuesta: "",
                            contacto_personalizado: { nombre: "", email: "", cargo: "", ...(prev.contacto_personalizado ?? {}), [field]: event.target.value },
                          }))
                        }
                        className="rounded-lg border p-2"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex justify-end"><button type="button" onClick={()=>setTemplateOpen(true)} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900">Usar plantilla</button></div>
                <div className="rounded border bg-white p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-blue-950">Datos de la propuesta</h2><button type="button" onClick={() => setStep(1)} className="cursor-pointer text-sm text-blue-800 underline hover:text-blue-950">Volver a Datos generales</button></div><div className="grid gap-3 text-sm md:grid-cols-2"><p><span className="block text-gray-500">Cuenta</span><strong>{cuenta?.nombre_empresa || form.id_cuenta_propuesta}</strong></p><p><span className="block text-gray-500">País</span><strong>{cuenta?.pais_cuenta || "-"}</strong></p><p><span className="block text-gray-500">Título</span><strong>{form.nombre_propuesta}</strong></p><p><span className="block text-gray-500">Fecha de creación</span><strong>{form.fecha_envio_propuesta}</strong></p><p><span className="block text-gray-500">Fecha estimada de expiración</span><strong>{form.fecha_validez_propuesta}</strong></p></div></div>
                <div className="overflow-x-auto rounded-lg">
                  <SortableTable className="min-w-[900px] w-full text-xs"><thead className="bg-slate-700 text-white"><tr><th className="p-3" /><th className="p-3 text-left">Servicio</th><th className="p-3 text-left">Descripción</th><th className="p-3 text-left">Especificaciones</th><th className="p-3">Unidades</th><th className="p-3">Precio unitario</th><th className="p-3">Descuento</th><th className="p-3">Total servicio</th><th className="p-3 text-left">Acciones</th></tr></thead><tbody>
                    <tr className="bg-slate-300"><td colSpan={9} className="p-3 text-center"><button type="button" onClick={() => { setLineModalDraft(emptyLinea()); setLineModalIndex(0); setLineModalStep(1); }} className="cursor-pointer rounded bg-blue-50 px-4 py-2 font-medium text-blue-950 hover:bg-blue-100">+ Agregar servicio aquí</button></td></tr>
                    {form.lineas.map((linea, index) => <React.Fragment key={linea.id_linea_propuesta || index}><ProposalLineRow linea={linea} index={index} total={lineTotal(linea)} moneda={form.moneda} lockSpecifications={preferredPageIds.has(linea.id_pagina_publicacion||'')} onPatch={(patch) => updateLine(index, patch)} onRemove={() => setForm((prev) => ({ ...prev, lineas: prev.lineas.filter((_, i) => i !== index) }))} /><tr className="bg-slate-300"><td colSpan={9} className="p-3 text-center"><button type="button" onClick={() => { setLineModalDraft(emptyLinea()); setLineModalIndex(index + 1); setLineModalStep(1); }} className="cursor-pointer rounded bg-blue-50 px-4 py-2 font-medium text-blue-950 hover:bg-blue-100">+ Agregar servicio aquí</button></td></tr></React.Fragment>)}
                  </tbody></SortableTable>
                </div>
                <div className="ml-auto w-full max-w-md space-y-3 rounded border bg-white p-4 text-sm">
                  <div className="flex justify-between"><span>Total antes del descuento</span><strong>{subtotal.toFixed(2)} {form.moneda}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>Descuento general</span><div className="flex items-center gap-2"><span className={form.tipo_descuento_final === "porcentaje" ? "font-semibold text-blue-950" : "text-gray-400"}>%</span><Switch label="Tipo de descuento general" checked={form.tipo_descuento_final === "importe"} onChange={(exact) => setForm((prev) => ({ ...prev, tipo_descuento_final: exact ? "importe" : "porcentaje", descuento_final_propuesta: 0 }))} /><span className={form.tipo_descuento_final === "importe" ? "font-semibold text-blue-950" : "text-gray-400"}>€</span><input type="number" min="0" max={form.tipo_descuento_final === "porcentaje" ? 100 : subtotal} value={form.descuento_final_propuesta} onChange={(event) => { const maximum = form.tipo_descuento_final === "porcentaje" ? 100 : subtotal; setForm((prev) => ({ ...prev, descuento_final_propuesta: Math.min(maximum, Math.max(0, toNumber(event.target.value))) })); }} className="w-24 rounded border p-2 text-right" /></div></div>
                  <div className="flex justify-between text-gray-500"><span>Descuento aplicado</span><span>-{generalDiscountAmount.toFixed(2)} {form.moneda}</span></div>
                  <div className="flex justify-between"><span>Base imponible</span><strong>{baseImponible.toFixed(2)} {form.moneda}</strong></div>
                  <div className="flex justify-between"><span>IVA ({form.iva_aplicable ? "21%" : "0%"})</span><strong>{(totalConIva - baseImponible).toFixed(2)} {form.moneda}</strong></div>
                  <div className="flex justify-between border-t pt-2 text-base text-blue-950"><span>Total</span><strong>{totalConIva.toFixed(2)} {form.moneda}</strong></div>
                </div>
                <div className="rounded border bg-white p-4"><label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.base_imponible_personalizada} onChange={(event) => setForm((prev) => ({ ...prev, base_imponible_personalizada: event.target.checked, importe_base_personalizada: event.target.checked ? calculatedBase : 0 }))} className="cursor-pointer" />BASE IMPONIBLE final PERSONALIZADA</label>{form.base_imponible_personalizada && <input type="number" min="0" value={form.importe_base_personalizada} onChange={(event) => setForm((prev) => ({ ...prev, importe_base_personalizada: toNumber(event.target.value) }))} className="mt-3 rounded border p-2" />}</div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded border bg-white p-5"><p className="text-sm font-semibold">Importe total</p><p className="mt-1 text-2xl font-bold text-blue-950">{totalConIva.toFixed(2)} {form.moneda}</p></div>
                <div className="rounded border bg-white p-5"><p className="font-semibold">Intercambio</p><div className="mt-3"><ToggleQuestion label="¿Es un intercambio?" checked={form.es_intercambio} onChange={(checked) => setForm((prev) => ({ ...prev, es_intercambio: checked, intercambio_precio_final: false, intercambio_transferencias: false, transferencias_intercambio: [] }))} /></div></div>
                {form.es_intercambio && <div className="space-y-4 rounded border bg-white p-5"><label className="block text-sm">¿Qué queremos a cambio del intercambio?<textarea value={form.condiciones_intercambio} onChange={(event) => setForm((prev) => ({ ...prev, condiciones_intercambio: event.target.value }))} className="mt-1 min-h-28 w-full rounded border p-3" /></label><ToggleQuestion label="¿Hay un precio final para el intercambio?" checked={form.intercambio_precio_final} onChange={(checked) => setForm((prev) => ({ ...prev, intercambio_precio_final: checked, intercambio_transferencias: checked ? prev.intercambio_transferencias : false }))} />{form.intercambio_precio_final && <ToggleQuestion label="¿Deberá haber transferencias bancarias?" checked={form.intercambio_transferencias} onChange={(checked) => setForm((prev) => ({ ...prev, intercambio_transferencias: checked, transferencias_intercambio: checked ? (prev.transferencias_intercambio.length ? prev.transferencias_intercambio : [{ fecha_proporcion3: "", fecha_contraparte: "", importe: 0 }]) : [] }))} />}{form.intercambio_precio_final && form.intercambio_transferencias && <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold text-blue-950">Transferencias del intercambio</h3><button type="button" onClick={() => setForm((prev) => ({ ...prev, transferencias_intercambio: [...prev.transferencias_intercambio, { fecha_proporcion3: "", fecha_contraparte: "", importe: 0 }] }))} className="cursor-pointer rounded bg-blue-950 px-3 py-2 text-sm text-white hover:bg-blue-900">Agregar transferencia</button></div>{form.transferencias_intercambio.map((transfer, index) => <div key={index} className="grid gap-3 rounded border p-3 md:grid-cols-[1fr_1fr_1fr_auto]"><DatePartsInput required label="Fecha del pago de Proporción 3" value={transfer.fecha_proporcion3} onChange={(value) => setForm((prev) => ({ ...prev, transferencias_intercambio: prev.transferencias_intercambio.map((item, itemIndex) => itemIndex === index ? { ...item, fecha_proporcion3: value } : item) }))} /><DatePartsInput required label="Fecha del pago de la contraparte" value={transfer.fecha_contraparte} onChange={(value) => setForm((prev) => ({ ...prev, transferencias_intercambio: prev.transferencias_intercambio.map((item, itemIndex) => itemIndex === index ? { ...item, fecha_contraparte: value } : item) }))} /><label className="text-sm">Importe a intercambiar<input type="number" min="0" value={transfer.importe} onChange={(event) => setForm((prev) => ({ ...prev, transferencias_intercambio: prev.transferencias_intercambio.map((item, itemIndex) => itemIndex === index ? { ...item, importe: toNumber(event.target.value) } : item) }))} className="mt-1 w-full rounded border p-2" /></label><button type="button" onClick={() => setForm((prev) => ({ ...prev, transferencias_intercambio: prev.transferencias_intercambio.filter((_, itemIndex) => itemIndex !== index) }))} className="mt-6 h-10 cursor-pointer rounded bg-red-50 px-3 text-red-700 hover:bg-red-100">Eliminar</button></div>)}</div>}</div>}
                <div className="flex justify-between rounded-lg bg-gray-50 p-4 text-sm"><span>IVA determinado por el país: <strong>{form.iva_aplicable ? "21%" : "0%"}</strong></span><span>Total de la propuesta: <strong>{totalConIva.toFixed(2)} €</strong></span></div>
                <div className="flex justify-between">
                  <p className="font-semibold">Cobros</p>
                  <button type="button" onClick={() => setForm((prev) => ({ ...prev, cobros: [...prev.cobros, { ...emptyCobro(prev.cobros.length + 1, prev.cobros.length ? 0 : totalConIva), fecha_cobro: addCalendarMonths(prev.cobros.at(-1)?.fecha_cobro || '', prev.cobros.length ? 1 : 2), banco_cobro: cuentaEspanola ? 'Banco Santander' : 'Banco Sabadell' }] }))} className="cursor-pointer rounded-lg bg-blue-950 px-4 py-2 text-xs text-white hover:bg-blue-900">
                    Anadir cobro
                  </button>
                </div>
                {form.cobros.map((cobro, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border p-3 text-xs md:grid-cols-5 [&_legend]:text-xs [&_input]:text-xs [&_select]:text-xs">
                    <DatePartsInput required
                      label="Fecha cobro"
                      value={cobro.fecha_cobro}
                      onChange={(value) => setForm((prev) => ({ ...prev, cobros: prev.cobros.map((item, i) => (i === index ? { ...item, fecha_cobro: value } : item)) }))}
                    />
                    <label className="flex flex-col gap-1 text-xs">
                      Importe
                      <input type="number" value={cobro.importe_cobro} onChange={(event) => setForm((prev) => ({ ...prev, cobros: prev.cobros.map((item, i) => (i === index ? { ...item, importe_cobro: toNumber(event.target.value) } : item)) }))} className="rounded-lg border p-2" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      Forma de cobro
                      <select value={cobro.forma_cobro} onChange={(event) => { const method = event.target.value; const bank = method === "PayPal" ? "PayPal" : cuentaEspanola ? "Banco Santander" : "Banco Sabadell"; setForm((prev) => ({ ...prev, cobros: prev.cobros.map((item, i) => (i === index ? { ...item, forma_cobro: method, banco_cobro: bank } : item)) })); }} className="cursor-pointer rounded-lg border p-2">
                        <option>Transferencia bancaria</option>
                        <option>Recibo</option>
                        <option>PayPal</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      Banco
                      <select value={cobro.banco_cobro} onChange={(event) => setForm((prev) => ({ ...prev, cobros: prev.cobros.map((item, i) => (i === index ? { ...item, banco_cobro: event.target.value } : item)) }))} className="rounded-lg border p-2">
                        <option>Banco Sabadell</option>
                        <option>Banco Santander</option>
                        <option>PayPal</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, cobros: prev.cobros.filter((_, i) => i !== index) }))} className="cursor-pointer rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100">
                      Quitar
                    </button>
                  </div>
                ))}
                <p className={`text-right text-sm ${Math.abs(cobrosTotal - totalConIva) < 0.02 ? "text-green-700" : "text-red-700"}`}>{Math.abs(cobrosTotal - totalConIva) < 0.02 ? `El total de los pagos (${cobrosTotal.toFixed(2)} €) coincide con el importe total de la propuesta.` : cobrosTotal > totalConIva ? `El total de los pagos (${cobrosTotal.toFixed(2)} €) excede en ${(cobrosTotal - totalConIva).toFixed(2)} € el importe total de la propuesta (${totalConIva.toFixed(2)} €).` : `Al total de los pagos (${cobrosTotal.toFixed(2)} €) le faltan ${(totalConIva - cobrosTotal).toFixed(2)} € para llegar al importe total de la propuesta (${totalConIva.toFixed(2)} €).`}</p>
              </div>
            )}

            {step === 4 && <PropuestaPreview propuesta={{ ...form, cuenta, contacto: contactos.find((item) => item.id_contacto === form.id_contacto_propuesta), importe_total_bi_propuesta: baseImponible, importe_propuesta_con_iva: totalConIva }} agentes={agentes} servicios={servicios} editableAgent onAgentChange={(id) => setForm((prev) => ({ ...prev, id_agente_propuesta: id }))} editableComments onCommentsChange={(value) => setForm((prev) => ({ ...prev, comentarios_adicionales: value }))} />}

            {false && step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Miniatura de propuesta</p>
                  {false && <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, lineas: [...prev.lineas, emptyLinea()] }));
                      setLineModalIndex(form.lineas.length);
                    }}
                    className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white"
                  >
                    Añadir línea
                  </button>}
                </div>

                <div className="rounded-lg border bg-white p-6 shadow-sm">
                  <div className="border-b pb-4">
                    <p className="text-xs uppercase text-gray-400">Propuesta</p>
                    <h3 className="text-xl font-semibold text-blue-950">{form.nombre_propuesta || form.id_propuesta}</h3>
                    <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                      <p><strong>Cuenta:</strong> {cuenta?.nombre_empresa || form.id_cuenta_propuesta}</p>
                      <p><strong>Agente:</strong> {agentes.find((item) => item.id_agente === form.id_agente_propuesta)?.nombre_completo_agente || form.id_agente_propuesta}</p>
                      <p><strong>Contacto:</strong> {contactos.find((item) => item.id_contacto === form.id_contacto_propuesta)?.nombre_completo_contacto || form.contacto_personalizado?.nombre}</p>
                      <p><strong>Validez:</strong> {form.fecha_validez_propuesta || "-"}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {form.lineas.map((linea, index) => (
                      <div key={index} className="grid gap-2 rounded border border-gray-200 p-3 text-sm md:grid-cols-[1fr_110px_110px_auto]">
                        <div>
                          <p className="font-medium text-blue-950">{linea.producto || "Línea sin producto"}</p>
                          <p className="text-xs text-gray-500">{linea.medio || "-"} · {linea.publicacion || "-"}</p>
                        </div>
                        <p>{linea.unidades || 1} uds.</p>
                        <p>{(toNumber(linea.precio_unitario) * toNumber(linea.unidades || 1)).toFixed(2)} EUR</p>
                        {false && <button type="button" onClick={() => setLineModalIndex(index)} className="rounded bg-gray-100 px-3 py-2 text-xs hover:bg-gray-200">
                          Modificar
                        </button>}
                      </div>
                    ))}
                    {form.lineas.length === 0 && <p className="text-sm text-gray-500">No hay líneas añadidas.</p>}
                  </div>

                  <div className="mt-5 border-t pt-4 text-right text-sm">
                    <p>Base imponible: <strong>{baseImponible.toFixed(2)} EUR</strong></p>
                    <p>Total: <strong>{totalConIva.toFixed(2)} EUR</strong></p>
                  </div>
                </div>
                {false && <label className="flex flex-col gap-1 text-sm">
                  Comentarios adicionales
                  <textarea placeholder="Comentarios adicionales" value={form.comentarios_adicionales} onChange={(event) => setForm((prev) => ({ ...prev, comentarios_adicionales: event.target.value }))} className="min-h-28 w-full rounded-lg border p-3" />
                </label>}
              </div>
            )}

            {step === 1 && !canStep1 && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">No puedes continuar todavía:</p><ul className="mt-2 list-disc space-y-1 pl-5">{step1Issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
            {step === 2 && !canStep2 && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">No puedes continuar todavía:</p><ul className="mt-2 list-disc space-y-1 pl-5">{step2Issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
            {step === 3 && !canStep3 && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">No puedes continuar todavía:</p><ul className="mt-2 list-disc space-y-1 pl-5">{step3Issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
            <div className="flex justify-between border-t pt-4">
              <button type="button" onClick={() => setStep(Math.max(mode === "replicate" ? 0 : 1, step - 1))} disabled={step === (mode === "replicate" ? 0 : 1)} className="cursor-pointer rounded-lg bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50">
                Volver
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => void advance()}
                  disabled={(step === 1 && !canStep1) || (step === 2 && !canStep2) || (step === 3 && !canStep3)}
                  className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  Continuar
                </button>
              ) : (
                <button type="button" onClick={finishOrReturnToProposal} disabled={saving || (isDraftProposal && (!canStep1 || !canStep2 || !canStep3))} className="cursor-pointer rounded-lg bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? "Guardando..." : isDraftProposal ? "Crear propuesta" : "Confirmar e ir a la propuesta"}
                </button>
              )}
            </div>

            {lineModalIndex !== null && lineModalDraft && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
                <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div><h3 className="text-lg font-semibold text-blue-950">Seleccionar servicio</h3><p className="text-sm text-gray-500">Fase {lineModalStep}: {lineModalStep === 1 ? "elige el canal" : lineModalStep === 2 ? "elige el servicio" : "configura las especificaciones"}.</p></div>
                    <button type="button" onClick={() => { setLineModalIndex(null); setLineModalDraft(null); }} className="cursor-pointer rounded px-2 py-1 text-gray-500 hover:bg-gray-100">
                      ×
                    </button>
                  </div>
                  <div className="mb-4 flex gap-2 border-y py-3">{["Canal", "Servicio", "Especificaciones"].map((label, index) => <button key={label} type="button" disabled={index + 1 > lineModalStep} onClick={() => setLineModalStep(index + 1)} className={`rounded-full px-3 py-1 text-sm ${index + 1 === lineModalStep ? "bg-blue-100 text-blue-800" : "bg-gray-100"} ${index + 1 <= lineModalStep ? "cursor-pointer hover:bg-blue-50" : "cursor-not-allowed"}`}>{index + 1} · {label}</button>)}</div>
                  <ServiceWizardBody
                    language={form.idioma_propuesta}
                    step={lineModalStep}
                    linea={lineModalDraft}
                    servicios={servicios}
                    grupos={gruposServicio}
                    revistas={revistas}
                    onPatch={(patch) => setLineModalDraft((current) => current ? { ...current, ...patch } : current)}
                    onSelectService={(idServicio) => setLineModalDraft((current) => current ? { ...current, ...servicePatch(idServicio) } : current)}
                    onApplyPublication={(idRevista) => setLineModalDraft((current) => current ? { ...current, ...publicationPatch(idRevista) } : current)}
                    onStep={setLineModalStep}
                  />
                  <div className="mt-5 flex justify-end">
                    <button type="button" onClick={() => { setForm((prev) => ({ ...prev, lineas: [...prev.lineas.slice(0, lineModalIndex), lineModalDraft, ...prev.lineas.slice(lineModalIndex)] })); setLineModalIndex(null); setLineModalDraft(null); }} disabled={lineModalStep < 3 || !lineModalDraft.id_servicio || (lineModalDraft.id_servicio === "personalizado" && !lineModalDraft.producto.trim())} className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white enabled:cursor-pointer enabled:hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-gray-300">
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}
            {templateOpen&&<ProposalTemplatePicker language={form.idioma_propuesta} onLanguageChange={value=>setForm(prev=>({...prev,idioma_propuesta:value as FormState['idioma_propuesta']}))} onUse={(lines,mode)=>{setForm(prev=>({...prev,lineas:mode==='replace'?lines:[...prev.lineas,...lines]}));setTemplateOpen(false);}} onClose={()=>setTemplateOpen(false)}/>}
          </div>
        </div>
      </div>
    </div>
  );
}
