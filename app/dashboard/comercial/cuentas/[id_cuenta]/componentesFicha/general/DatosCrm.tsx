'use client';

import React, { FC, ChangeEvent, useEffect, useMemo, useState } from "react";
import { AgenteService } from "@/app/service/AgenteService";
import { CuentaService } from "@/app/service/CuentaService";
import { FeriaService } from "@/app/service/FeriaService";

interface DatosCRMProps {
  id_cuenta: string;
  nombre_empresa: string;
  id_agente: string;
  id_edisoft: string;
  asignado_a: string;
  receptor_revista: boolean;
  potencial_actual_relacion: string;
  potencial_futuro_encaje: string;
  revisado_ricardo: boolean;
  campanas: string;
  estado_leads_frios: string;
  stands_ferias: string;
  tipo_cuenta: string;
  presente_en_qq: boolean;
  qq: boolean;
  actividades: string;
  descripcion_actividad: string;
  correo_principal: string;
  ferias: string[];
  red_social_prioritaria: string;
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
}

const potencialActualOptions = [
  "Cliente",
  "Altas Posibilidades - buena relación con el responsable",
  "Propuesta desestimada o silencio",
  "Neutral - Intentando contactar con responsable",
  "Neutral - buscando persona de contacto",
  "Bajas posibilidades - responsable actualmente no interesado",
  "No contactar - Responsable adverso",
  "Relacionado - se lleva por agencia",
];

const potencialFuturoOptions = [
  "Máximo - Cliente nuestro y-o anunciante competencia",
  "Alto - Encaja por sector y por mercado",
  "Neutral - no es anunciante habitual",
  "Neutral - no determinado",
  "Bajo - Encaja por producto pero no por mercado",
  "Nulo - Es y será otro sector y mercado",
];

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
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{label}</span>
        <button
          type="button"
          onClick={onOpen}
          className={`flex w-28 items-center rounded-full border p-1 text-xs font-medium transition ${
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
    CuentaService.getCuentas({ clienteFiltro: query })
      .then((data) => setCuentas(Array.isArray(data) ? data.slice(0, 20) : []))
      .catch(() => setCuentas([]));
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-blue-950">{title}</h3>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100">x</button>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar cuenta..."
          className={fieldClass}
        />
        <div className="mt-4 max-h-72 overflow-y-auto border border-gray-200">
          {cuentas.map((cuenta) => (
            <button
              key={cuenta.id_cuenta}
              type="button"
              onClick={() => setSelected(cuenta)}
              className={`block w-full border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                selected?.id_cuenta === cuenta.id_cuenta ? "bg-blue-50 text-blue-950" : ""
              }`}
            >
              <span className="font-medium">{cuenta.nombre_empresa || cuenta.id_cuenta}</span>
              <span className="ml-2 text-xs text-gray-400">{cuenta.id_cuenta}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
            className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:bg-gray-400"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

const DatosCRM: FC<DatosCRMProps> = ({
  id_cuenta,
  nombre_empresa,
  id_agente,
  id_edisoft,
  asignado_a,
  receptor_revista,
  potencial_actual_relacion,
  potencial_futuro_encaje,
  revisado_ricardo,
  campanas,
  estado_leads_frios,
  stands_ferias,
  tipo_cuenta,
  presente_en_qq,
  qq,
  actividades,
  descripcion_actividad,
  correo_principal,
  ferias,
  red_social_prioritaria,
  catalogos,
  array_cuentas_distribuidoras,
  array_cuentas_distribuidas,
  cuenta_agencia,
  fuente_novedades,
  onChange,
}) => {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [feriasDisponibles, setFeriasDisponibles] = useState<any[]>([]);
  const [modalCuenta, setModalCuenta] = useState<"distribuidoras" | "distribuidas" | null>(null);
  const feriasSeleccionadas = useMemo(() => new Set(Array.isArray(ferias) ? ferias : []), [ferias]);

  useEffect(() => {
    AgenteService.getAgentes()
      .then((data) => setAgentes(Array.isArray(data) ? data : []))
      .catch(() => setAgentes([]));
    FeriaService.getFerias()
      .then((data) => setFeriasDisponibles(Array.isArray(data) ? data : []))
      .catch(() => setFeriasDisponibles([]));
  }, []);

  const handleTextChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(e.target.name, e.target.value);
  };

  const handleBooleanChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.name, e.target.value === "true");
  };

  const toggleFeria = (idFeria: string) => {
    const next = new Set(feriasSeleccionadas);
    if (next.has(idFeria)) next.delete(idFeria);
    else next.add(idFeria);
    onChange("ferias", Array.from(next));
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
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Detalles de la cuenta</h2>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <label className="space-y-1">
            <span className="font-medium">Código Tiger</span>
            <input type="text" value={id_cuenta} disabled className={`${fieldClass} bg-gray-100`} />
          </label>
          <label className="space-y-1">
            <span className="font-medium">Código Edisoft</span>
            <input name="id_edisoft" value={id_edisoft} onChange={handleTextChange} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="font-medium">Nombre Empresa</span>
            <input name="nombre_empresa" value={nombre_empresa} onChange={handleTextChange} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="font-medium">Agente</span>
            <select name="id_agente" value={id_agente} onChange={handleTextChange} className={fieldClass}>
              <option value="">Sin asignar</option>
              {agentes.map((agente) => (
                <option key={agente.id_agente} value={agente.id_agente}>
                  {agente.nombre_completo_agente || `${agente.nombre_agente || ""} ${agente.apellidos_agente || ""}`.trim() || agente.id_agente}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-medium">Asignado a</span>
            <select name="asignado_a" value={asignado_a} onChange={handleTextChange} className={fieldClass}>
              <option value="">Sin asignar</option>
              {agentes.filter((agente) => agente.email_agente).map((agente) => (
                <option key={agente.id_agente} value={agente.email_agente}>
                  {agente.email_agente}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-medium">Receptor Revista</span>
            <select name="receptor_revista" value={String(receptor_revista)} onChange={handleBooleanChange} className={fieldClass}>
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          </label>
          <label className="space-y-1 md:col-span-3 lg:col-span-1">
            <span className="font-medium">Potencial actual - Relación</span>
            <select name="potencial_actual_relacion" value={potencial_actual_relacion} onChange={handleTextChange} className={fieldClass}>
              <option value="">Sin definir</option>
              {potencialActualOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="space-y-1 md:col-span-3 lg:col-span-2">
            <span className="font-medium">Potencial futuro - Encaje con nuestros medios</span>
            <select name="potencial_futuro_encaje" value={potencial_futuro_encaje} onChange={handleTextChange} className={fieldClass}>
              <option value="">Sin definir</option>
              {potencialFuturoOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
      </section>

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
          <label className="space-y-1 md:col-span-3">
            <span className="font-medium">Stands en próximas ferias</span>
            <textarea name="stands_ferias" value={stands_ferias} onChange={handleTextChange} className={`${fieldClass} min-h-24`} />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Actividades Información Producción</h2>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <label className="space-y-1">
            <span className="font-medium">Tipo cuenta</span>
            <input name="tipo_cuenta" value={tipo_cuenta} onChange={handleTextChange} className={fieldClass} />
          </label>
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

          <div className="space-y-2 md:col-span-3">
            <span className="font-medium">Ferias</span>
            <div className="grid grid-cols-1 gap-2 rounded border border-gray-200 p-3 md:grid-cols-2 lg:grid-cols-3">
              {feriasDisponibles.map((feria) => (
                <label key={feria.id_feria} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={feriasSeleccionadas.has(feria.id_feria)}
                    onChange={() => toggleFeria(feria.id_feria)}
                  />
                  <span>{feria.nombre_feria || feria.titulo_especifico_edicion || feria.id_feria}</span>
                </label>
              ))}
              {feriasDisponibles.length === 0 && <p className="text-xs text-gray-500">No hay ferias disponibles.</p>}
            </div>
          </div>

          <label className="space-y-1">
            <span className="font-medium">Red social prioritaria</span>
            <input name="red_social_prioritaria" value={red_social_prioritaria} onChange={handleTextChange} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="font-medium">Catálogos</span>
            <input name="catalogos" value={catalogos} onChange={handleTextChange} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="font-medium">Cuenta agencia</span>
            <select name="cuenta_agencia" value={cuenta_agencia || "No"} onChange={handleTextChange} className={fieldClass}>
              <option value="No">No</option>
              <option value="Sí">Sí</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-medium">Fuentes novedades</span>
            <input name="fuente_novedades" value={fuente_novedades} onChange={handleTextChange} className={fieldClass} />
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
