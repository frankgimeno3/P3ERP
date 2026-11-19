'use client';
import SearchableSelect from "@/app/components/SearchableSelect";

import React, { FC, ChangeEvent, useEffect, useState } from "react";
import { AgenteService } from "@/app/service/AgenteService";
import { CuentaService } from "@/app/service/CuentaService";
import type { SocialProfile } from "@/app/lib/accountSocialProfiles";
import RedesSociales from "./RedesSociales";
import IdentidadCuenta from "./IdentidadCuenta";
import EnvioPropuestasAnuales from "./EnvioPropuestasAnuales";

interface DatosCRMProps {
  commercialDetails: React.ReactNode;
  id_cuenta: string;
  nombre_empresa: string;
  id_agente: string;
  id_edisoft: string;
  asignado_a: string;
  pais_cuenta: string;
  receptor_revista: boolean;
  potencial_actual_relacion: string;
  potencial_futuro_encaje: string;
  revisado_ricardo: boolean;
  campanas: string;
  estado_leads_frios: string;
  tipo_cuenta: string;
  presente_en_qq: boolean;
  qq: boolean;
  actividades: string;
  descripcion_actividad: string;
  correo_principal: string;
  redesSociales: SocialProfile[];
  onRedesSocialesSaved: (profiles: SocialProfile[]) => void;
  catalogos: string;
  array_cuentas_distribuidoras: any[];
  array_cuentas_distribuidas: any[];
  cuenta_agencia: string;
  fuente_novedades: string;
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
  onOpen,
}: {
  label: string;
  items: any[];
  onOpen: () => void;
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
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CuentaSearchModal({
  title,
  onClose,
  onConfirm,
}: {
  title: string;
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
      .then((data) => setCuentas(Array.isArray(data) ? data.slice(0, 20) : []))
      .catch(() => setCuentas([]));
  }, [query]);

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
  commercialDetails,
  id_cuenta,
  nombre_empresa,
  id_agente,
  id_edisoft,
  asignado_a,
  pais_cuenta,
  receptor_revista,
  potencial_actual_relacion,
  potencial_futuro_encaje,
  revisado_ricardo,
  campanas,
  estado_leads_frios,
  tipo_cuenta,
  presente_en_qq,
  qq,
  actividades,
  descripcion_actividad,
  correo_principal,
  redesSociales,
  onRedesSocialesSaved,
  catalogos,
  array_cuentas_distribuidoras,
  array_cuentas_distribuidas,
  cuenta_agencia,
  fuente_novedades,
  onChange,
}) => {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [tiposCuenta, setTiposCuenta] = useState<string[]>([]);
  const [errorTiposCuenta, setErrorTiposCuenta] = useState(false);
  const [modalCuenta, setModalCuenta] = useState<"distribuidoras" | "distribuidas" | null>(null);
  useEffect(() => {
    AgenteService.getAgentes()
      .then((data) => setAgentes(Array.isArray(data) ? data : []))
      .catch(() => setAgentes([]));
    CuentaService.getCuentas({ typesOnly: true })
      .then(setTiposCuenta)
      .catch(() => setErrorTiposCuenta(true));
  }, []);

  const handleTextChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(e.target.name, e.target.value);
  };

  const handleBooleanChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.name, e.target.value === "true");
  };

  const addCuentaRelacionada = (field: "array_cuentas_distribuidoras" | "array_cuentas_distribuidas", cuenta: any) => {
    const current = field === "array_cuentas_distribuidoras" ? array_cuentas_distribuidoras : array_cuentas_distribuidas;
    const next = [...(Array.isArray(current) ? current : [])];
    if (!next.some((item) => item.id_cuenta === cuenta.id_cuenta)) {
      next.push({ id_cuenta: cuenta.id_cuenta, nombre_empresa: cuenta.nombre_empresa });
    }
    onChange(field, next);
    setModalCuenta(null);
  };

  return (
    <div className="space-y-8 p-4">
      <IdentidadCuenta
        data={{ id_cuenta, id_edisoft, nombre_empresa, id_agente, asignado_a, pais_cuenta, potencial_actual_relacion, potencial_futuro_encaje }}
        agents={agentes}
        onChange={onChange}
      />
      {commercialDetails}

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Estado de tareas</h2>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <label className="space-y-1">
            <span className="font-medium">Revisado Ricardo</span>
            <select name="revisado_ricardo" value={String(revisado_ricardo)} onChange={handleBooleanChange} className={fieldClass}>
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-medium">Campañas</span>
            <input name="campanas" value={campanas} onChange={handleTextChange} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="font-medium">Estado leads fríos</span>
            <input name="estado_leads_frios" value={estado_leads_frios} onChange={handleTextChange} className={fieldClass} />
          </label>
          <EnvioPropuestasAnuales key={id_cuenta} idCuenta={id_cuenta} agents={agentes} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Actividades Información Producción</h2>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <label className="space-y-1">
            <span className="font-medium">Tipo cuenta</span>
            <select name="tipo_cuenta" value={tipo_cuenta} onChange={handleTextChange} className={`${fieldClass} cursor-pointer hover:border-blue-500`}>
              <option value="">Sin definir</option>
              {tipo_cuenta && !tiposCuenta.includes(tipo_cuenta) && <option value={tipo_cuenta}>{tipo_cuenta}</option>}
              {tiposCuenta.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
            {errorTiposCuenta && <span className="text-xs text-red-700">No se pudieron cargar los tipos de cuenta.</span>}
          </label>
          <label className="space-y-1">
            <span className="font-medium">Cuenta agencia</span>
            <select name="cuenta_agencia" value={cuenta_agencia || "No"} onChange={handleTextChange} className={`${fieldClass} cursor-pointer hover:border-blue-500`}>
              <option value="No">No</option>
              <option value="Sí">Sí</option>
              {cuenta_agencia && !["No", "Sí"].includes(cuenta_agencia) && <option value={cuenta_agencia}>{cuenta_agencia}</option>}
            </select>
          </label>
          <RedesSociales key={id_cuenta} idCuenta={id_cuenta} profiles={redesSociales} onSaved={onRedesSocialesSaved} />
          <label className="space-y-1">
            <span className="font-medium">Correo principal</span>
            <input name="correo_principal" value={correo_principal} onChange={handleTextChange} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="font-medium">QQ</span>
            <select name="qq" value={String(qq || presente_en_qq)} onChange={handleBooleanChange} className={fieldClass}>
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="font-medium">Catálogos</span>
            <input name="catalogos" value={catalogos} onChange={handleTextChange} className={fieldClass} />
          </label>
          <label className="space-y-1 md:col-span-3">
            <span className="font-medium">Fuentes novedades</span>
            <textarea name="fuente_novedades" value={fuente_novedades} onChange={handleTextChange} className={`${fieldClass} min-h-24`} />
          </label>
          <label className="space-y-1 md:col-span-3">
            <span className="font-medium">Actividades cuenta</span>
            <textarea name="actividades" value={actividades} onChange={handleTextChange} className={`${fieldClass} min-h-24`} />
          </label>
          <label className="space-y-1 md:col-span-3">
            <span className="font-medium">Descripción actividad</span>
            <textarea name="descripcion_actividad" value={descripcion_actividad} onChange={handleTextChange} className={`${fieldClass} min-h-24`} />
          </label>

          <ToggleDistribucion
            label="Tiene distribuidor?"
            items={array_cuentas_distribuidoras}
            onOpen={() => setModalCuenta("distribuidoras")}
          />
          <ToggleDistribucion
            label="Es distribuidor de otras cuentas?"
            items={array_cuentas_distribuidas}
            onOpen={() => setModalCuenta("distribuidas")}
          />
        </div>
      </section>

      {modalCuenta === "distribuidoras" && (
        <CuentaSearchModal
          title="Seleccionar distribuidor"
          onClose={() => setModalCuenta(null)}
          onConfirm={(cuenta) => addCuentaRelacionada("array_cuentas_distribuidoras", cuenta)}
        />
      )}
      {modalCuenta === "distribuidas" && (
        <CuentaSearchModal
          title="Seleccionar cuenta distribuida"
          onClose={() => setModalCuenta(null)}
          onConfirm={(cuenta) => addCuentaRelacionada("array_cuentas_distribuidas", cuenta)}
        />
      )}
    </div>
  );
};

export default DatosCRM;
