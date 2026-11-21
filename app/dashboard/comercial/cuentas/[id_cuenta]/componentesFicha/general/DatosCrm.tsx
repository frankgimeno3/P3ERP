'use client';
import SearchableSelect from "@/app/components/SearchableSelect";

import React, { FC, ChangeEvent, useEffect, useState } from "react";
import { AgenteService } from "@/app/service/AgenteService";
import { CuentaService } from "@/app/service/CuentaService";
import type { SocialProfile } from "@/app/lib/accountSocialProfiles";
import CommercialClassifications from "@/app/components/CommercialClassifications";
import SegmentacionProduccion from "./SegmentacionProduccion";
import CatalogosCuenta, { type Catalogo } from "./CatalogosCuenta";
import RedesSociales from "./RedesSociales";
import { AccountCampaigns } from "@/app/components/CommercialCampaigns";
import { YesNoToggle } from "./Direcciones";
import IdentidadCuenta, { AccountAssignments } from "./IdentidadCuenta";
import EnvioPropuestasAnuales from "./EnvioPropuestasAnuales";

interface DatosCRMProps {
  id_agente: string; asignado_a: string; summary: React.ReactNode; description: React.ReactNode;
  segmentacion: Record<string,string>;
  onSegmentacionChange: (data: Record<string,string>) => void;
  commercialDetails: React.ReactNode;
  id_cuenta: string;
  id_edisoft: string;
  pais_cuenta: string;
  receptor_revista: boolean;
  suscriptor_revista: boolean;
  potencial_actual_relacion: string;
  potencial_futuro_encaje: string;
  descripcion_actividad: string;
  correo_principal: string;
  redesSociales: SocialProfile[];
  onRedesSocialesSaved: (profiles: SocialProfile[]) => void;
  seguimiento_qq: string; canal_youtube: string;
  catalogos: string;
  catalogos_enlaces: Catalogo[];
  array_cuentas_distribuidoras: any[];
  array_cuentas_distribuidas: any[];
  onChange: (field: string, value: string | boolean | any[]) => void;
}

interface Agente {
  id_agente: string;
  nombre_completo_agente: string;
  email_agente?: string;
  nombre_agente?: string;
  apellidos_agente?: string;
  estado_agente?: string;
  is_empleado_account?: boolean;
}

const fieldClass = "w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400";

function ToggleDistribucion({
  label,
  items,
  onOpen, onRemove,
}: {
  label: string;
  items: any[];
  onOpen: () => void;
  onRemove: (item: any) => void;
}) {
  const activo = Array.isArray(items) && items.length > 0;
  return (
    <div className="space-y-2 md:col-span-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{label}</span>
        <button
          type="button"
          onClick={onOpen}
          aria-label={label}
          aria-haspopup="dialog"
          className={`flex w-28 cursor-pointer items-center rounded-full border p-1 text-xs font-medium transition hover:ring-2 hover:ring-blue-300 ${
            activo ? "border-blue-950 bg-blue-950 text-white" : "border-gray-300 bg-gray-100 text-gray-600"
          }`}
        >
          <span className={`w-1/2 text-center ${activo ? "opacity-60" : ""}`}>No</span>
          <span className={`w-1/2 rounded-full py-1 text-center ${activo ? "bg-white text-blue-950" : "opacity-60"}`}>Sí</span>
        </button>
      </div>
      {activo && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span key={`${item.id_cuenta || item.nombre_empresa}-${index}`} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-950">
              {item.nombre_empresa || item.id_cuenta}
              <button type="button" aria-label="Desvincular" onClick={() => onRemove(item)} className="ml-1 cursor-pointer rounded p-1 hover:bg-blue-200"><svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" stroke="currentColor"><path d="m4 4 8 8m-8 0 8-8"/></svg></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CuentaSearchModal({
  title, exclude,
  onClose,
  onConfirm,
}: {
  title: string;
  exclude: string;
  onClose: () => void;
  onConfirm: (cuenta: any) => void;
}) {
  const [query, setQuery] = useState("");
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    CuentaService.getCuentas({ clienteFiltro: query })
      .then((data) => setCuentas(Array.isArray(data) ? data.filter(cuenta => cuenta.id_cuenta !== exclude).slice(0, 20) : []))
      .catch(() => setCuentas([]));
  }, [query, exclude]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-2xl rounded bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-blue-950">{title}</h3>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="cursor-pointer rounded px-2 py-1 text-gray-600 hover:bg-gray-100">×</button>
        </div>
        <SearchableSelect label="Cuenta" required value={selected?.id_cuenta||''} onChange={id=>setSelected(cuentas.find(c=>c.id_cuenta===id)||null)} onSearchChange={setQuery} options={cuentas.map(c=>({value:c.id_cuenta,label:c.nombre_empresa+' · '+c.id_cuenta}))} />
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="cursor-pointer rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
            className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white enabled:cursor-pointer enabled:hover:bg-blue-900 disabled:bg-gray-400"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

const DatosCRM: FC<DatosCRMProps> = ({
  segmentacion, onSegmentacionChange, commercialDetails, id_agente, asignado_a, summary, description,
  id_cuenta,
  id_edisoft,
  pais_cuenta,
  receptor_revista,
  suscriptor_revista,
  potencial_actual_relacion,
  potencial_futuro_encaje,
  descripcion_actividad,
  correo_principal,
  redesSociales,
  onRedesSocialesSaved,
  seguimiento_qq, canal_youtube, catalogos, catalogos_enlaces,
  array_cuentas_distribuidoras,
  array_cuentas_distribuidas,
  onChange,
}) => {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [modalCuenta, setModalCuenta] = useState<"distribuidoras" | "distribuidas" | null>(null);
  useEffect(() => {
    AgenteService.getAgentes()
      .then((data) => setAgentes(Array.isArray(data) ? data : []))
      .catch(() => setAgentes([]));
  }, []);

  const handleTextChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(e.target.name, e.target.value);
  };

  const handleBooleanChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.name, e.target.value === "true");
  };

  const [unlink, setUnlink] = useState<{field: "array_cuentas_distribuidoras" | "array_cuentas_distribuidas"; id: string; name: string} | null>(null);
  useEffect(() => {
    if (!unlink) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setUnlink(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [unlink]);

  const addCuentaRelacionada = (field: "array_cuentas_distribuidoras" | "array_cuentas_distribuidas", cuenta: any) => {
    const current = field === "array_cuentas_distribuidoras" ? array_cuentas_distribuidoras : array_cuentas_distribuidas;
    const next = [...(Array.isArray(current) ? current : [])];
    if (cuenta.id_cuenta === id_cuenta) return;
    if (!next.some((item) => item.id_cuenta === cuenta.id_cuenta)) {
      next.push({ id_cuenta: cuenta.id_cuenta, nombre_empresa: cuenta.nombre_empresa });
    }
    onChange(field, next);
    setModalCuenta(null);
  };

  return (
    <div className="space-y-8 p-4">
      <IdentidadCuenta
        data={{ id_cuenta, id_edisoft, pais_cuenta, potencial_actual_relacion, potencial_futuro_encaje }}
        onChange={onChange}
        assignments={<AccountAssignments id_agente={id_agente} asignado_a={asignado_a} agents={agentes} onChange={onChange} />}
        summary={summary} description={description}
      >
        {commercialDetails}
      </IdentidadCuenta>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Estado de tareas</h2>
        <div className="grid gap-4 text-sm">
          <div className="rounded bg-gray-50 p-3"><AccountCampaigns key={id_cuenta} accountId={id_cuenta} /></div>
        </div>
          <EnvioPropuestasAnuales key={id_cuenta} idCuenta={id_cuenta} agents={agentes} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Información producción</h2>
        <SegmentacionProduccion data={segmentacion} onChange={onSegmentacionChange}>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <div className="grid content-start gap-4 md:col-span-3">
          <label className="space-y-1">
            <span className="font-medium">Dirección de email principal</span>
            <input name="correo_principal" value={correo_principal} onChange={handleTextChange} className={fieldClass} />
          </label>
          <label className="space-y-1">Seguimiento QQ
            <select name="seguimiento_qq" value={seguimiento_qq} onChange={handleTextChange} className={fieldClass + " cursor-pointer hover:border-blue-800"}>
              <option value="">Selecciona una opción</option>
              {["OKQQ","OKQQ LATAM","OK QQ ESPAÑA Y LATAM","AÑADIRQQ","CAMBIARQQ","QUITARQQ"].map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
          <div className="md:col-span-3"><CatalogosCuenta items={catalogos_enlaces} legacy={catalogos} onChange={items => onChange("catalogos_enlaces", items)} /></div>
          </div>
          <div className="md:col-span-3"><CommercialClassifications kind="actividades-cuentas" record={id_cuenta} /></div>
          <label className="space-y-1 md:col-span-3">
            <span className="font-medium">Descripción actividad</span>
            <textarea name="descripcion_actividad" value={descripcion_actividad} onChange={handleTextChange} className={`${fieldClass} min-h-24`} />
          </label>

          <div className="grid gap-5 md:col-span-3 md:grid-cols-2">
            <RedesSociales key={id_cuenta} idCuenta={id_cuenta} profiles={redesSociales} onSaved={onRedesSocialesSaved} />
            <section>
              <h3 className="font-medium">Vídeos · Canal de YouTube</h3>
              <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="4" fill="#ff0033"/><path d="m10 8 6 4-6 4z" fill="white"/></svg>
              <label className="block">URL del canal<input type="url" name="canal_youtube" className={fieldClass} value={canal_youtube} onChange={handleTextChange}/></label>
            </section>
          </div>
          <div className="grid gap-4 md:col-span-3 md:grid-cols-2">
            <label>Dirección-Contacto artículos ESPAÑA<textarea className={fieldClass} value={segmentacion.articulos_espana || ""} onChange={event => onSegmentacionChange({...segmentacion, articulos_espana:event.target.value})}/></label>
            <label>Dirección-Contacto artículos LATAM<textarea className={fieldClass} value={segmentacion.articulos_latam || ""} onChange={event => onSegmentacionChange({...segmentacion, articulos_latam:event.target.value})}/></label>
          </div>
          <div className="grid gap-4 md:col-span-3 md:grid-cols-2">
            <div className="space-y-3 rounded bg-gray-50 p-3">
          <ToggleDistribucion
            label="Tiene distribuidor?"
            items={array_cuentas_distribuidoras}
            onOpen={() => setModalCuenta("distribuidoras")}
            onRemove={item => setUnlink({field: "array_cuentas_distribuidoras", id: item.id_cuenta, name: item.nombre_empresa || item.id_cuenta})}
          />
          <ToggleDistribucion
            label="Es distribuidor de otras cuentas?"
            items={array_cuentas_distribuidas}
            onOpen={() => setModalCuenta("distribuidas")}
            onRemove={item => setUnlink({field: "array_cuentas_distribuidas", id: item.id_cuenta, name: item.nombre_empresa || item.id_cuenta})}
          />
            </div>
      <div className="space-y-3 rounded bg-gray-50 p-3">
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium">Receptor Revista</span>
          <YesNoToggle value={receptor_revista} onChange={value => onChange("receptor_revista", value)} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium">Suscriptor revista?</span>
          <YesNoToggle value={suscriptor_revista} onChange={value => onChange("suscriptor_revista", value)} />
        </div>
      </div>

          </div>
        </div>
        </SegmentacionProduccion>
      </section>

      {unlink && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
        <div role="dialog" aria-modal="true" aria-label="Desvincular cuenta" className="rounded-xl bg-white p-5 shadow-xl">
          <div className="flex items-center justify-between gap-4"><h3 className="font-semibold">Desvincular cuenta</h3><button type="button" onClick={() => setUnlink(null)} aria-label="Cerrar" className="cursor-pointer rounded px-2 hover:bg-gray-100">×</button></div>
          <p className="my-3">¿Quieres desvincular a {unlink.name}?</p>
          <button type="button" className="cursor-pointer rounded bg-blue-950 px-3 py-2 text-white hover:bg-blue-800" onClick={() => {
            const current = unlink.field === "array_cuentas_distribuidoras" ? array_cuentas_distribuidoras : array_cuentas_distribuidas;
            onChange(unlink.field, current.filter(item => item.id_cuenta !== unlink.id));
            setUnlink(null);
          }}>Desvincular</button>
        </div>
      </div>}
      {modalCuenta === "distribuidoras" && (
        <CuentaSearchModal
          exclude={id_cuenta}
          title="Seleccionar distribuidor"
          onClose={() => setModalCuenta(null)}
          onConfirm={(cuenta) => addCuentaRelacionada("array_cuentas_distribuidoras", cuenta)}
        />
      )}
      {modalCuenta === "distribuidas" && (
        <CuentaSearchModal
          exclude={id_cuenta}
          title="Seleccionar cuenta distribuida"
          onClose={() => setModalCuenta(null)}
          onConfirm={(cuenta) => addCuentaRelacionada("array_cuentas_distribuidas", cuenta)}
        />
      )}
    </div>
  );
};

export default DatosCRM;
