"use client";
import SearchableSelect from "@/app/components/SearchableSelect";

import React, { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { PropuestaService } from "@/app/service/PropuestaService";
import { ServicioService } from "@/app/service/ServicioService";
import { AgenteService } from "@/app/service/AgenteService";
import { CuentaService } from "@/app/service/CuentaService";
import { ContactoService } from "@/app/service/ContactoService";
import PropuestaPreview from "@/app/dashboard/comercial/propuestas/componentesPropuestas/PropuestaPreview";

type Picker = "cuenta" | "contacto" | null;

function DateParts({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const raw = String(value || "");
  const parts = raw.includes("-") && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw.split("-").reverse() : raw.split("/");
  const set = (index: number, next: string) => {
    const values = [parts[0] || "", parts[1] || "", parts[2] || ""];
    values[index] = next.replace(/\D/g, "").slice(0, index === 2 ? 4 : 2);
    onChange(values.join("/"));
  };
  return <label className="text-sm"><span className="mb-1 block font-medium">{label}</span><span className="grid grid-cols-[60px_60px_84px] gap-2"><input inputMode="numeric" aria-label={`${label}: día`} placeholder="dd" value={parts[0] || ""} onChange={(event) => set(0, event.target.value)} className="rounded border p-2" /><input inputMode="numeric" aria-label={`${label}: mes`} placeholder="mm" value={parts[1] || ""} onChange={(event) => set(1, event.target.value)} className="rounded border p-2" /><input inputMode="numeric" aria-label={`${label}: año`} placeholder="yyyy" value={parts[2] || ""} onChange={(event) => set(2, event.target.value)} className="rounded border p-2" /></span></label>;
}

function PencilIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><path d="m4 20 4.2-1 10.6-10.6a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z" /><path d="m14.5 7.1 2.8 2.8" /></svg>; }
function TrashIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg>; }
function Chevron({ open }: { open: boolean }) { return <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 fill-none stroke-current transition-transform ${open ? "rotate-180" : ""}`} strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>; }


export default function ResumenPropuesta({ params }: { params: Promise<{ id_propuesta: string }> }) {
  const { id_propuesta } = use(params);
  const router = useRouter();
  const [draft, setDraft] = useState<any>(null);
  const [servicios, setServicios] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [contactos, setContactos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState<Picker>(null);
  const [filter, setFilter] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [proposalData, servicesData, agentsData, accountsData] = await Promise.all([PropuestaService.getPropuestaById(id_propuesta), ServicioService.getServicios(), AgenteService.getAgentes(), CuentaService.getCuentas()]);
      setDraft(proposalData);
      setServicios(Array.isArray(servicesData) ? servicesData : []); setAgentes(Array.isArray(agentsData) ? agentsData : []); setCuentas(Array.isArray(accountsData) ? accountsData : []);
    } catch { setError("No se ha podido cargar la propuesta."); }
    finally { setLoading(false); }
  }, [id_propuesta]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!draft?.id_cuenta_propuesta) { setContactos([]); return; }
    ContactoService.getContactos({ id_cuenta: draft.id_cuenta_propuesta }).then((data) => setContactos(Array.isArray(data) ? data : [])).catch(() => setContactos([]));
  }, [draft?.id_cuenta_propuesta]);
  useEffect(() => {
    if (!picker) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setPicker(null);
    window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
  }, [picker]);
  useEffect(() => {
    if (!pendingStatus) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) setPendingStatus(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [pendingStatus, saving]);

  const account = cuentas.find((item) => item.id_cuenta === draft?.id_cuenta_propuesta) || (draft?.cuenta?.id_cuenta ? draft.cuenta : null);
  const accountName = account?.nombre_empresa || draft?.contacto?.nombre_empresa || draft?.datos_facturacion?.nombre_fiscal || draft?.id_cuenta_propuesta;
  const contact = contactos.find((item) => item.id_contacto === draft?.id_contacto_propuesta) || draft?.contacto;
  const filteredRows = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const rows = picker === "cuenta" ? cuentas : contactos;
    if (!query) return rows;
    return rows.filter((item) => Object.values(item).some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [cuentas, contactos, filter, picker]);

  async function saveGeneral() {
    setSaving(true); setError("");
    try {
      const updated = await PropuestaService.updatePropuesta(id_propuesta, {
        nombre_propuesta: draft.nombre_propuesta,
        idioma_propuesta: draft.idioma_propuesta,
        fecha_envio_propuesta: draft.fecha_envio_propuesta,
        fecha_validez_propuesta: draft.fecha_validez_propuesta,
        id_agente_propuesta: draft.id_agente_propuesta,
        id_cuenta_propuesta: draft.id_cuenta_propuesta,
        id_contacto_propuesta: draft.id_contacto_propuesta,
        contacto_personalizado: null,
        comentarios_adicionales: draft.comentarios_adicionales,
      });
      setDraft((current: any) => ({ ...current, ...updated, cuenta: account, contacto: contact }));
    } catch (requestError: any) { setError(requestError?.response?.data?.detail || requestError?.response?.data?.message || "No se han podido guardar los datos generales."); }
    finally { setSaving(false); }
  }

  async function setEstado(estado: string, rejectOtherPending = false) {
    setSaving(true); setError("");
    try {
      const updated = await PropuestaService.updatePropuesta(id_propuesta, {
        estado_propuesta: estado,
        rechazar_otras_pendientes: rejectOtherPending,
      });
      setDraft((current: any) => ({ ...current, ...updated }));
      setStatusOpen(false);
      setPendingStatus(null);
      if (/aceptad/i.test(estado) && updated?.contrato_creado_id) {
        router.push(`/dashboard/comercial/contratos/${encodeURIComponent(updated.contrato_creado_id)}`);
        router.refresh();
      } else if (/rechazad/i.test(estado)) {
        router.push("/dashboard/comercial/propuestas");
        router.refresh();
      }
    }
    catch (requestError: any) {
      const detail = requestError?.data?.detail || requestError?.data?.message || requestError?.response?.data?.detail || requestError?.response?.data?.message || requestError?.message;
      setError(typeof detail === "string" ? detail : "No se ha podido cambiar el estado de la propuesta.");
    }
    finally { setSaving(false); }
  }
  function requestStatusChange(estado: string) {
    setStatusOpen(false);
    if (/aceptad|rechazad/i.test(estado)) setPendingStatus(estado);
    else void setEstado(estado);
  }
  async function borrar() {
    if (!window.confirm("¿Eliminar esta propuesta?")) return;
    setSaving(true); await PropuestaService.deletePropuesta(id_propuesta); router.push("/dashboard/comercial/propuestas"); router.refresh();
  }

  const estado = String(draft?.estado_propuesta || "Pendiente");
  const statusClass = /aceptad/i.test(estado) ? "bg-green-100 text-green-800" : /rechazad/i.test(estado) ? "bg-red-100 text-red-800" : /pendiente/i.test(estado) ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-700";

  return <div className="min-h-screen bg-gray-100 text-gray-600">
    <MiddleNav tituloprincipal={draft?.nombre_propuesta || `Propuesta ${id_propuesta}`} />
    <main className="px-6 py-6 lg:px-12">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{estado}</span><div className="relative"><button type="button" onClick={() => setStatusOpen((value) => !value)} disabled={saving} className="flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed">Marcar como <Chevron open={statusOpen} /></button>{statusOpen && <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border bg-white p-1 shadow-xl">{["Pendiente", "Aceptada", "Rechazada"].map((item) => <button key={item} type="button" onClick={() => requestStatusChange(item)} className="block w-full cursor-pointer rounded px-3 py-2 text-left text-sm hover:bg-blue-50">{item}</button>)}</div>}</div></div>
        <div className="flex items-center gap-2"><Link href={`/dashboard/comercial/propuestas/${id_propuesta}/editar`} aria-label="Editar propuesta" className="cursor-pointer rounded-lg border border-blue-950 p-2 text-blue-950 transition hover:bg-blue-50"><PencilIcon /></Link><button type="button" onClick={() => void borrar()} disabled={saving} aria-label="Eliminar propuesta" className="cursor-pointer rounded-lg border border-red-300 p-2 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed"><TrashIcon /></button></div>
      </div>
      {error && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p>Cargando propuesta...</p>}
      {!loading && draft && <>
        <section className="mb-5 rounded-xl border bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-blue-950">Datos editables de la propuesta</h2><button type="button" onClick={() => void saveGeneral()} disabled={saving} className="cursor-pointer rounded-lg bg-blue-950 px-4 py-2 text-sm text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Guardando..." : "Guardar datos"}</button></div><div className="grid gap-4 lg:grid-cols-3"><label className="text-sm lg:col-span-2"><span className="mb-1 block font-medium">Título</span><input value={draft.nombre_propuesta || ""} onChange={(event) => setDraft((current: any) => ({ ...current, nombre_propuesta: event.target.value }))} className="w-full rounded border p-2" /></label><label className="text-sm"><span className="mb-1 block font-medium">Idioma</span><select value={draft.idioma_propuesta || "es"} onChange={(event) => setDraft((current: any) => ({ ...current, idioma_propuesta: event.target.value }))} className="w-full cursor-pointer rounded border bg-white p-2 hover:border-blue-950"><option value="es">Español</option><option value="en">Inglés</option><option value="it">Italiano</option><option value="pt">Portugués</option></select></label><DateParts label="Fecha de creación" value={draft.fecha_envio_propuesta || ""} onChange={(value) => setDraft((current: any) => ({ ...current, fecha_envio_propuesta: value }))} /><DateParts label="Fecha de expiración" value={draft.fecha_validez_propuesta || ""} onChange={(value) => setDraft((current: any) => ({ ...current, fecha_validez_propuesta: value }))} /><label className="text-sm"><span className="mb-1 block font-medium">Agente</span><select value={draft.id_agente_propuesta || ""} onChange={(event) => setDraft((current: any) => ({ ...current, id_agente_propuesta: event.target.value }))} className="w-full cursor-pointer rounded border bg-white p-2 hover:border-blue-950"><option value="">Selecciona agente</option>{agentes.map((item) => <option key={item.id_agente} value={item.id_agente}>{item.nombre_completo_agente || item.nombre_agente || item.id_agente}</option>)}</select></label><div className="rounded border p-3 text-sm"><span className="block text-xs uppercase text-gray-400">Cuenta</span><div className="mt-1 flex items-center justify-between gap-3"><strong>{accountName || "—"}</strong><button type="button" onClick={() => { setFilter(""); setPicker("cuenta"); }} className="cursor-pointer rounded border px-3 py-1 text-blue-950 hover:bg-blue-50">Modificar</button></div></div><div className="rounded border p-3 text-sm"><span className="block text-xs uppercase text-gray-400">Contacto</span><div className="mt-1 flex items-center justify-between gap-3"><strong>{contact?.nombre_completo_contacto || draft.id_contacto_propuesta || "—"}</strong><button type="button" onClick={() => { setFilter(""); setPicker("contacto"); }} disabled={!draft.id_cuenta_propuesta} className="cursor-pointer rounded border px-3 py-1 text-blue-950 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Modificar</button></div></div><label className="text-sm lg:col-span-3"><span className="mb-1 block font-medium">Comentarios adicionales</span><textarea value={draft.comentarios_adicionales || ""} onChange={(event) => setDraft((current: any) => ({ ...current, comentarios_adicionales: event.target.value }))} placeholder="Añade observaciones o información complementaria de la propuesta..." className="min-h-28 w-full resize-y rounded border p-3 outline-none transition focus:border-blue-950" /></label></div></section>
        <div className="mb-4 flex flex-wrap justify-end gap-2"><Link href={`/dashboard/comercial/propuestas/${id_propuesta}/editar?fase=2`} className="flex cursor-pointer items-center gap-2 rounded-lg border border-blue-950 px-3 py-2 text-sm text-blue-950 transition hover:bg-blue-50"><PencilIcon /> Editar servicios</Link><Link href={`/dashboard/comercial/propuestas/${id_propuesta}/editar?fase=3`} className="flex cursor-pointer items-center gap-2 rounded-lg border border-blue-950 px-3 py-2 text-sm text-blue-950 transition hover:bg-blue-50"><PencilIcon /> Editar pagos</Link></div>
        <PropuestaPreview propuesta={{ ...draft, cuenta: account || { nombre_empresa: accountName }, contacto: contact }} agentes={agentes} servicios={servicios} />
        <div className="mt-6 flex justify-center"><Link href={`/dashboard/comercial/propuestas/replicarcar/${id_propuesta}`} className="cursor-pointer rounded-lg bg-blue-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900">Crear una propuesta copiando servicios de esta</Link></div>
      </>}
    </main>
    {pendingStatus && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-status-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setPendingStatus(null); }}>
      <section className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <button type="button" aria-label="Cerrar" disabled={saving} onClick={() => setPendingStatus(null)} className="absolute right-3 top-2 cursor-pointer text-3xl leading-none text-gray-500 transition hover:text-gray-900 disabled:cursor-not-allowed">×</button>
        <h2 id="confirm-status-title" className="pr-8 text-xl font-semibold text-blue-950">Confirmar propuesta {pendingStatus.toLowerCase()}</h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {/aceptad/i.test(pendingStatus)
            ? "Se crearán el contrato, sus líneas, contenidos, cobros y órdenes asociadas."
            : "La propuesta quedará rechazada."}
        </p>
        <p className="mt-3 text-sm font-medium text-gray-800">¿Quieres continuar?</p>
        <div className="mt-6 flex flex-col items-stretch gap-2">
          <button type="button" disabled={saving} onClick={() => void setEstado(pendingStatus)} className={`cursor-pointer rounded px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${/aceptad/i.test(pendingStatus) ? "bg-green-700 hover:bg-green-800" : "bg-red-700 hover:bg-red-800"}`}>{saving ? "Procesando..." : `Sí, marcar como ${pendingStatus.toLowerCase()}`}</button>
          {/aceptad/i.test(pendingStatus) && <button type="button" disabled={saving} onClick={() => void setEstado(pendingStatus, true)} className="cursor-pointer rounded border border-green-700 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50">Sí, aceptar y marcar el resto de propuestas como rechazadas</button>}
          <button type="button" disabled={saving} onClick={() => setPendingStatus(null)} className="cursor-pointer rounded border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed">Cancelar</button>
        </div>
      </section>
    </div>}
    {picker && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={picker === "cuenta" ? "Modificar cuenta" : "Modificar contacto"}><div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><h2 className="text-lg font-semibold text-blue-950">{picker === "cuenta" ? "Seleccionar cuenta" : "Seleccionar contacto"}</h2><button type="button" aria-label="Cerrar modal" onClick={() => setPicker(null)} className="cursor-pointer rounded px-2 py-1 text-xl hover:bg-gray-100">×</button></div><div className="p-5"><SearchableSelect label={picker==='cuenta'?'Cuenta':'Contacto'} value="" onChange={id=>{const item=(picker==='cuenta'?cuentas:contactos).find((r:any)=>(picker==='cuenta'?r.id_cuenta:r.id_contacto)===id);if(!item)return;if(picker==='cuenta')setDraft((current:any)=>({...current,id_cuenta_propuesta:item.id_cuenta,cuenta:item,id_contacto_propuesta:'',contacto:null}));else setDraft((current:any)=>({...current,id_contacto_propuesta:item.id_contacto,contacto:item,contacto_personalizado:null}));setPicker(null);}} options={(picker==='cuenta'?cuentas:contactos).map((item:any)=>({value:picker==='cuenta'?item.id_cuenta:item.id_contacto,label:picker==='cuenta'?[item.nombre_empresa,item.id_cuenta,item.pais_cuenta,item.correo_principal].filter(Boolean).join(' · '):[item.nombre_completo_contacto,item.email_contacto,item.telefono_contacto].filter(Boolean).join(' · ')}))} /></div></div></div>}
  </div>;
}
