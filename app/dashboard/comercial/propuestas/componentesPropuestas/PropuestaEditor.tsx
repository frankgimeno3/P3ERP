"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { CuentaService } from "@/app/service/CuentaService";
import { ContactoService } from "@/app/service/ContactoService";
import { ServicioService } from "@/app/service/ServicioService";
import { PropuestaService } from "@/app/service/PropuestaService";
import { AgenteService } from "@/app/service/AgenteService";
import { RevistaService } from "@/app/service/RevistaService";

type Linea = {
  id_linea_propuesta?: string;
  id_servicio: string;
  medio: string;
  publicacion: string;
  producto: string;
  precio_tarifa: number;
  descuento_producto: number;
  precio_unitario: number;
  unidades: number;
  descripcion_linea: string;
  deadline_publicacion: string;
  fecha_publicacion_publicacion: string;
  grupo_servicio?: string;
  revista_id?: string;
  id_publicacion?: string;
};

type Cobro = {
  id_cobro_propuesta?: string;
  numero_cobro: number;
  fecha_cobro: string;
  importe_cobro: number;
  forma_cobro: string;
  banco_cobro: string;
  observaciones_cobro: string;
};

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
};

const emptyLinea = (): Linea => ({
  id_servicio: "",
  medio: "",
  publicacion: "",
  producto: "",
  precio_tarifa: 0,
  descuento_producto: 0,
  precio_unitario: 0,
  unidades: 1,
  descripcion_linea: "",
  deadline_publicacion: "",
  fecha_publicacion_publicacion: "",
});

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
  d.setMonth(d.getMonth() + 2);
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
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    const [dd, mm, yyyy] = normalized.split("/");
    return { dd, mm, yyyy };
  }
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parts = getDateParts(value);
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span>{label}</span>
      <div className="grid grid-cols-[64px_64px_90px] gap-2">
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
      </div>
    </div>
  );
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

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
  const serviciosFiltrados = linea.grupo_servicio
    ? servicios.filter((servicio) => servicio.id_medio === linea.grupo_servicio)
    : servicios;
  const servicioSeleccionado = servicios.find((servicio) => servicio.id_servicio === linea.id_servicio);
  const esRevista = String(linea.medio || servicioSeleccionado?.nombre_medio || servicioSeleccionado?.id_medio || "")
    .toLowerCase()
    .includes("revista");
  const revistasFiltradas = revistas;

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

      <label className="flex flex-col gap-1 text-sm">
        Producto
        <input value={linea.producto} onChange={(event) => onPatch({ producto: event.target.value })} className="rounded-lg border p-2" />
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
      <DatePartsInput label="Deadline publicación" value={linea.deadline_publicacion} onChange={(value) => onPatch({ deadline_publicacion: value })} />
      <DatePartsInput label="Fecha publicación" value={linea.fecha_publicacion_publicacion} onChange={(value) => onPatch({ fecha_publicacion_publicacion: value })} />
      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Descripción
        <textarea value={linea.descripcion_linea} onChange={(event) => onPatch({ descripcion_linea: event.target.value })} className="min-h-24 rounded-lg border p-2" />
      </label>
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
  };
}

export default function PropuestaEditor({
  mode,
  idPropuesta,
  cuentaInicial,
}: {
  mode: "create" | "edit";
  idPropuesta?: string;
  cuentaInicial?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(() => defaultForm(cuentaInicial));
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [contactos, setContactos] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [revistas, setRevistas] = useState<any[]>([]);
  const [lineModalIndex, setLineModalIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    CuentaService.getCuentas().then((data) => setCuentas(Array.isArray(data) ? data : [])).catch(() => setCuentas([]));
    ServicioService.getServicios().then((data) => setServicios(Array.isArray(data) ? data : [])).catch(() => setServicios([]));
    AgenteService.getAgentes().then((data) => setAgentes(Array.isArray(data) ? data : [])).catch(() => setAgentes([]));
    RevistaService.getRevistas().then((data) => setRevistas(Array.isArray(data) ? data : [])).catch(() => setRevistas([]));
  }, []);

  useEffect(() => {
    if (!form.id_cuenta_propuesta) {
      setContactos([]);
      return;
    }
    ContactoService.getContactos({ id_cuenta: form.id_cuenta_propuesta })
      .then((data) => setContactos(Array.isArray(data) ? data : []))
      .catch(() => setContactos([]));
  }, [form.id_cuenta_propuesta]);

  useEffect(() => {
    if (mode !== "edit" || !idPropuesta) return;
    setLoading(true);
    PropuestaService.getPropuestaById(idPropuesta)
      .then((data) => {
        setForm(mapPropuestaToForm(data));
        setStep(Math.min(4, Math.max(1, Number(data?.fase_propuesta) || 1)));
      })
      .catch(() => setError("No se ha podido cargar la propuesta."))
      .finally(() => setLoading(false));
  }, [mode, idPropuesta]);

  useEffect(() => {
    if (!cuentaInicial || mode !== "create") return;
    setForm((prev) => ({ ...prev, id_cuenta_propuesta: cuentaInicial }));
  }, [cuentaInicial, mode]);

  const cuenta = useMemo(
    () => cuentas.find((item) => item.id_cuenta === form.id_cuenta_propuesta),
    [cuentas, form.id_cuenta_propuesta],
  );

  useEffect(() => {
    if (!cuenta || mode !== "create") return;
    setForm((prev) => {
      const nombre = prev.nombre_propuesta || `${cuenta.nombre_empresa}_${prev.fecha_envio_propuesta}_${prev.id_propuesta}`;
      return {
        ...prev,
        nombre_propuesta: nombre,
        id_agente_propuesta: prev.id_agente_propuesta || cuenta.id_agente || "",
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
  }, [cuenta, mode]);

  const subtotal = form.lineas.reduce((sum, line) => sum + toNumber(line.precio_unitario) * toNumber(line.unidades || 1), 0);
  const baseImponible = Math.max(0, subtotal - toNumber(form.descuento_final_propuesta));
  const totalConIva = form.iva_aplicable ? baseImponible * 1.21 : baseImponible;
  const cobrosTotal = form.cobros.reduce((sum, cobro) => sum + toNumber(cobro.importe_cobro), 0);

  function updateLine(index: number, patch: Partial<Linea>) {
    setForm((prev) => ({
      ...prev,
      lineas: prev.lineas.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  }

  const gruposServicio = useMemo(() => {
    const map = new Map<string, string>();
    servicios.forEach((servicio) => {
      const id = servicio.id_medio || "";
      if (!id) return;
      map.set(id, servicio.nombre_medio || id);
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [servicios]);

  const revistasById = useMemo(() => {
    const map = new Map<string, any>();
    revistas.forEach((revista) => map.set(revista.id_publicacion || revista.id_revista, revista));
    return map;
  }, [revistas]);

  function selectServicio(index: number, idServicio: string) {
    const servicio = servicios.find((item) => item.id_servicio === idServicio);
    const precio = toNumber(servicio?.precio_tarifa ?? servicio?.precio_servicio);
    updateLine(index, {
      grupo_servicio: servicio?.id_medio || "",
      id_servicio: idServicio,
      id_publicacion: "",
      medio: servicio?.medio_servicio_es || servicio?.es?.medio || servicio?.nombre_medio || "",
      publicacion: servicio?.publicacion_servicio_es || servicio?.es?.publicacion || "",
      producto: servicio?.nombre_servicio_es || servicio?.es?.nombre || "",
      precio_tarifa: precio,
      precio_unitario: precio,
      deadline_publicacion: servicio?.fecha_deadline_servicio || "",
      fecha_publicacion_publicacion: servicio?.fecha_publicacion_servicio || "",
    });
  }

  function applyRevistaToLine(index: number, idPublicacion: string) {
    const revista = revistasById.get(idPublicacion);
    updateLine(index, {
      id_publicacion: idPublicacion,
      publicacion: revista ? `${revista.revista} ${revista.edicion} numero ${revista.numero_publicacion || revista.publicacion}` : "",
      deadline_publicacion: revista?.deadline_materiales || "",
      fecha_publicacion_publicacion: revista?.fecha_publicacion || "",
    } as Partial<Linea>);
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
      router.push(`/dashboard/comercial/propuestas/${saved.id_propuesta}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se ha podido guardar la propuesta.");
    } finally {
      setSaving(false);
    }
  }

  function saveDraftAndExit() {
    void save("Borrador", String(step));
  }

  const canStep1 = form.id_cuenta_propuesta && (form.id_contacto_propuesta || form.contacto_personalizado);
  const canStep2 = form.lineas.length > 0;
  const canStep3 = form.cobros.length > 0 && Math.abs(cobrosTotal - totalConIva) < 0.02;
  const title = mode === "edit" ? `Editar propuesta ${form.id_propuesta}` : "Crear propuesta";

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
      <div className="px-12 py-6">
        <div className="mb-4 flex justify-end gap-3">
          <button onClick={saveDraftAndExit} disabled={saving || !form.id_cuenta_propuesta} className="rounded-lg border border-blue-950 px-4 py-2 text-sm text-blue-950 disabled:opacity-50">
            Guardar borrador
          </button>
          <Link href="/dashboard/comercial/propuestas" className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700">
            Cancelar
          </Link>
        </div>

        <div className="rounded-lg bg-white shadow-xl">
          <div className="flex border-b border-gray-200 bg-gray-50 px-6 py-4">
            {[1, 2, 3, 4].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => item < step && setStep(item)}
                className={`mr-3 h-10 w-10 rounded-full text-sm font-semibold ${step === item ? "bg-blue-950 text-white" : item < step ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}
              >
                {item}
              </button>
            ))}
            <span className="self-center text-sm">
              {step === 1 && "Cuenta y contacto"}
              {step === 2 && "Productos"}
              {step === 3 && "Cobros"}
              {step === 4 && "Miniatura y revisión"}
            </span>
          </div>

          <div className="space-y-6 p-8">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            {step === 1 && (
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
                    {agentes.map((agente) => (
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
                <div className="flex justify-between">
                  <p className="font-semibold">Lineas de propuesta</p>
                  <button type="button" onClick={() => setForm((prev) => ({ ...prev, lineas: [...prev.lineas, emptyLinea()] }))} className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white">
                    Anadir producto
                  </button>
                </div>
                {form.lineas.map((linea, index) => (
                  <LineaEditor
                    key={index}
                    linea={linea}
                    index={index}
                    servicios={servicios}
                    gruposServicio={gruposServicio}
                    revistas={revistas}
                    onPatch={(patch) => updateLine(index, patch)}
                    onSelectServicio={(idServicio) => selectServicio(index, idServicio)}
                    onApplyRevista={(idRevista) => applyRevistaToLine(index, idRevista)}
                    onRemove={() => setForm((prev) => ({ ...prev, lineas: prev.lineas.filter((_, i) => i !== index) }))}
                  />
                ))}
                <div className="text-right text-sm">
                  Subtotal: <strong>{subtotal.toFixed(2)} EUR</strong>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="text-sm">
                    Descuento final
                    <input type="number" value={form.descuento_final_propuesta} onChange={(event) => setForm((prev) => ({ ...prev, descuento_final_propuesta: toNumber(event.target.value) }))} className="mt-1 w-full rounded-lg border p-2" />
                  </label>
                  <label className="flex items-center gap-2 pt-6 text-sm">
                    <input type="checkbox" checked={form.iva_aplicable} onChange={(event) => setForm((prev) => ({ ...prev, iva_aplicable: event.target.checked }))} />
                    Aplicar IVA 21%
                  </label>
                  <div className="rounded-lg bg-gray-50 p-3 text-sm">
                    BI: <strong>{baseImponible.toFixed(2)} EUR</strong>
                    <br />
                    Total: <strong>{totalConIva.toFixed(2)} EUR</strong>
                  </div>
                </div>
                <div className="flex justify-between">
                  <p className="font-semibold">Cobros</p>
                  <button type="button" onClick={() => setForm((prev) => ({ ...prev, cobros: [...prev.cobros, emptyCobro(prev.cobros.length + 1, prev.cobros.length ? 0 : totalConIva)] }))} className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white">
                    Anadir cobro
                  </button>
                </div>
                {form.cobros.map((cobro, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-5">
                    <DatePartsInput
                      label="Fecha cobro"
                      value={cobro.fecha_cobro}
                      onChange={(value) => setForm((prev) => ({ ...prev, cobros: prev.cobros.map((item, i) => (i === index ? { ...item, fecha_cobro: value } : item)) }))}
                    />
                    <label className="flex flex-col gap-1 text-sm">
                      Importe
                      <input type="number" value={cobro.importe_cobro} onChange={(event) => setForm((prev) => ({ ...prev, cobros: prev.cobros.map((item, i) => (i === index ? { ...item, importe_cobro: toNumber(event.target.value) } : item)) }))} className="rounded-lg border p-2" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      Forma de cobro
                      <select value={cobro.forma_cobro} onChange={(event) => setForm((prev) => ({ ...prev, cobros: prev.cobros.map((item, i) => (i === index ? { ...item, forma_cobro: event.target.value } : item)) }))} className="rounded-lg border p-2">
                        <option>Transferencia bancaria</option>
                        <option>Recibo</option>
                        <option>Otro</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      Banco
                      <select value={cobro.banco_cobro} onChange={(event) => setForm((prev) => ({ ...prev, cobros: prev.cobros.map((item, i) => (i === index ? { ...item, banco_cobro: event.target.value } : item)) }))} className="rounded-lg border p-2">
                        <option>Banco Sabadell</option>
                        <option>Banco Santander</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, cobros: prev.cobros.filter((_, i) => i !== index) }))} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      Quitar
                    </button>
                  </div>
                ))}
                <p className={`text-right text-sm ${Math.abs(cobrosTotal - totalConIva) < 0.02 ? "text-green-700" : "text-red-700"}`}>
                  Total cobros: {cobrosTotal.toFixed(2)} EUR
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Miniatura de propuesta</p>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, lineas: [...prev.lineas, emptyLinea()] }));
                      setLineModalIndex(form.lineas.length);
                    }}
                    className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white"
                  >
                    Añadir línea
                  </button>
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
                        <button type="button" onClick={() => setLineModalIndex(index)} className="rounded bg-gray-100 px-3 py-2 text-xs hover:bg-gray-200">
                          Modificar
                        </button>
                      </div>
                    ))}
                    {form.lineas.length === 0 && <p className="text-sm text-gray-500">No hay líneas añadidas.</p>}
                  </div>

                  <div className="mt-5 border-t pt-4 text-right text-sm">
                    <p>Base imponible: <strong>{baseImponible.toFixed(2)} EUR</strong></p>
                    <p>Total: <strong>{totalConIva.toFixed(2)} EUR</strong></p>
                  </div>
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  Comentarios adicionales
                  <textarea placeholder="Comentarios adicionales" value={form.comentarios_adicionales} onChange={(event) => setForm((prev) => ({ ...prev, comentarios_adicionales: event.target.value }))} className="min-h-28 w-full rounded-lg border p-3" />
                </label>
              </div>
            )}

            <div className="flex justify-between border-t pt-4">
              <button type="button" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="rounded-lg bg-gray-200 px-4 py-2 text-sm disabled:opacity-50">
                Volver
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={(step === 1 && !canStep1) || (step === 2 && !canStep2) || (step === 3 && !canStep3)}
                  className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  Continuar
                </button>
              ) : (
                <button type="button" onClick={() => save("Pendiente", "created")} disabled={saving || !canStep1 || !canStep2 || !canStep3} className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50">
                  {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear propuesta"}
                </button>
              )}
            </div>

            {lineModalIndex !== null && form.lineas[lineModalIndex] && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
                <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-blue-950">Modificar línea</h3>
                    <button type="button" onClick={() => setLineModalIndex(null)} className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100">
                      x
                    </button>
                  </div>
                  <LineaEditor
                    linea={form.lineas[lineModalIndex]}
                    index={lineModalIndex}
                    servicios={servicios}
                    gruposServicio={gruposServicio}
                    revistas={revistas}
                    onPatch={(patch) => updateLine(lineModalIndex, patch)}
                    onSelectServicio={(idServicio) => selectServicio(lineModalIndex, idServicio)}
                    onApplyRevista={(idRevista) => applyRevistaToLine(lineModalIndex, idRevista)}
                    onRemove={() => {
                      setForm((prev) => ({ ...prev, lineas: prev.lineas.filter((_, i) => i !== lineModalIndex) }));
                      setLineModalIndex(null);
                    }}
                  />
                  <div className="mt-5 flex justify-end">
                    <button type="button" onClick={() => setLineModalIndex(null)} className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white">
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
