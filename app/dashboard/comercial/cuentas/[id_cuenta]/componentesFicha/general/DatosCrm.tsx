'use client';

import React, { FC, ChangeEvent, useEffect, useState } from "react";
import { AgenteService } from "@/app/service/AgenteService";

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
  ferias: string;
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

  useEffect(() => {
    AgenteService.getAgentes()
      .then((data) => setAgentes(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error("Error fetching agentes:", error);
        setAgentes([]);
      });
  }, []);

  const handleTextChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(e.target.name, e.target.value);
  };

  const handleBooleanChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.name, e.target.value === "true");
  };

  const handleArrayTextChange = (field: string, value: string) => {
    const items = value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((nombre_empresa) => ({ nombre_empresa }));
    onChange(field, items);
  };

  const formatArray = (items: any[]) =>
    (Array.isArray(items) ? items : [])
      .map((item) => item?.nombre_empresa || item?.id_cuenta || "")
      .filter(Boolean)
      .join("\n");

  return (
    <div className="p-4 space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Detalles de la cuenta</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
              {agentes
                .filter((agente) => agente.email_agente)
                .map((agente) => (
                  <option key={agente.id_agente} value={agente.email_agente}>
                    {agente.email_agente}
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-medium">Receptor Revista</span>
            <select name="receptor_revista" value={String(receptor_revista)} onChange={handleBooleanChange} className={fieldClass}>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="space-y-1 md:col-span-3 lg:col-span-1">
            <span className="font-medium">Potencial actual - Relación</span>
            <select name="potencial_actual_relacion" value={potencial_actual_relacion} onChange={handleTextChange} className={fieldClass}>
              <option value="">Sin definir</option>
              {potencialActualOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 md:col-span-3 lg:col-span-2">
            <span className="font-medium">Potencial futuro - Encaje con nuestros medios</span>
            <select name="potencial_futuro_encaje" value={potencial_futuro_encaje} onChange={handleTextChange} className={fieldClass}>
              <option value="">Sin definir</option>
              {potencialFuturoOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Estado de Tareas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <label className="space-y-1">
            <span className="font-medium">Revisado Ricardo</span>
            <select name="revisado_ricardo" value={String(revisado_ricardo)} onChange={handleBooleanChange} className={fieldClass}>
              <option value="true">Sí</option>
              <option value="false">No</option>
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
        <h2 className="text-xl font-bold">Actividades Informacion Produccion</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-medium">Ferias</span>
            <input name="ferias" value={ferias} onChange={handleTextChange} className={fieldClass} />
          </label>
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
            <input name="cuenta_agencia" value={cuenta_agencia} onChange={handleTextChange} className={fieldClass} />
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
          <label className="space-y-1 md:col-span-3">
            <span className="font-medium">Cuentas distribuidoras</span>
            <textarea value={formatArray(array_cuentas_distribuidoras)} onChange={(e) => handleArrayTextChange("array_cuentas_distribuidoras", e.target.value)} className={`${fieldClass} min-h-20`} />
          </label>
          <label className="space-y-1 md:col-span-3">
            <span className="font-medium">Cuentas distribuidas</span>
            <textarea value={formatArray(array_cuentas_distribuidas)} onChange={(e) => handleArrayTextChange("array_cuentas_distribuidas", e.target.value)} className={`${fieldClass} min-h-20`} />
          </label>
        </div>
      </section>
    </div>
  );
};

export default DatosCRM;
