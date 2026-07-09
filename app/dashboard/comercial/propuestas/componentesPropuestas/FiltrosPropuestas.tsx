'use client';

import React, { FC } from 'react';

interface Agente {
  id_agente: string;
  nombre_completo_agente: string;
  nombre_agente?: string;
  apellidos_agente?: string;
}

interface FiltrosPropuestasProps {
  clienteFiltro: string;
  setClienteFiltro: (value: string) => void;
  codigoCRMFiltro: string;
  setCodigoCRMFiltro: (value: string) => void;
  agenteFiltro: string;
  setAgenteFiltro: (value: string) => void;
  fechaInicio: string;
  setFechaInicio: (value: string) => void;
  fechaFin: string;
  setFechaFin: (value: string) => void;
  estadoFiltro: string;
  setEstadoFiltro: (value: string) => void;
  pestana: 'miasenproceso' | 'todasporcliente';
  agenteActual: string;
  agentes: Agente[];
}

const getNombreAgente = (agente: Agente) =>
  agente.nombre_completo_agente ||
  `${agente.nombre_agente || ''} ${agente.apellidos_agente || ''}`.trim() ||
  agente.id_agente;

const parseDateParts = (value: string) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/) || String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return { day: '', month: '', year: '' };
  return match[0].includes('-')
    ? { day: match[3], month: match[2], year: match[1] }
    : { day: match[1], month: match[2], year: match[3] };
};

const joinDateParts = (current: string, field: 'day' | 'month' | 'year', nextValue: string) => {
  const parts = parseDateParts(current);
  const next = { ...parts, [field]: nextValue.replace(/\D/g, '').slice(0, field === 'year' ? 4 : 2) };
  if (!next.day && !next.month && !next.year) return '';
  return `${next.year.padStart(4, '0')}-${next.month.padStart(2, '0')}-${next.day.padStart(2, '0')}`;
};

function DatePartsFilter({
  label,
  value,
  onChange,
  disabled,
  disabledClassName,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  disabledClassName: string;
}) {
  const parts = parseDateParts(value);
  const inputClass = `w-16 rounded-lg border px-3 py-2 text-sm ${disabled ? disabledClassName : ''}`;

  return (
    <div className="flex flex-col">
      <label className="mb-1 block text-xs text-gray-600">{label}</label>
      <div className="flex gap-1.5">
        <input value={parts.day} onChange={(e) => !disabled && onChange(joinDateParts(value, 'day', e.target.value))} disabled={disabled} placeholder="dd" className={inputClass} />
        <input value={parts.month} onChange={(e) => !disabled && onChange(joinDateParts(value, 'month', e.target.value))} disabled={disabled} placeholder="mm" className={inputClass} />
        <input value={parts.year} onChange={(e) => !disabled && onChange(joinDateParts(value, 'year', e.target.value))} disabled={disabled} placeholder="yyyy" className={`w-20 rounded-lg border px-3 py-2 text-sm ${disabled ? disabledClassName : ''}`} />
      </div>
    </div>
  );
}

const FiltrosPropuestas: FC<FiltrosPropuestasProps> = ({
  clienteFiltro,
  setClienteFiltro,
  codigoCRMFiltro,
  setCodigoCRMFiltro,
  agenteFiltro,
  setAgenteFiltro,
  fechaInicio,
  setFechaInicio,
  fechaFin,
  setFechaFin,
  estadoFiltro,
  setEstadoFiltro,
  pestana,
  agenteActual,
  agentes,
}) => {
  const bloqueaAgente = pestana === 'miasenproceso';
  const bloqueaFechas = pestana === 'todasporcliente';
  const bloqueaEstado = pestana === 'miasenproceso';
  const inputClass = "w-full rounded-lg border px-3 py-2 text-sm";
  const disabledControlClass = "cursor-not-allowed opacity-70";

  return (
    <div className="flex w-full flex-col bg-white">
      <p className="mb-3 text-sm font-semibold text-gray-700">Buscador de propuestas</p>
      <div className="flex w-full flex-row items-center justify-between">
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="flex flex-col">
            <label className="mb-1 block text-xs text-gray-600">Nombre cliente</label>
            <input
              type="text"
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              placeholder="Nombre de empresa"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 block text-xs text-gray-600">C&oacute;digo CRM</label>
            <input
              type="text"
              value={codigoCRMFiltro}
              onChange={(e) => setCodigoCRMFiltro(e.target.value)}
              placeholder="Cuenta de cliente"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 block text-xs text-gray-600">Agente</label>
            <select
              value={bloqueaAgente ? agenteActual : agenteFiltro}
              onChange={(e) => !bloqueaAgente && setAgenteFiltro(e.target.value)}
              disabled={bloqueaAgente}
              className={`${inputClass} ${bloqueaAgente ? disabledControlClass : ''}`}
            >
              {!bloqueaAgente && <option value="">Todos</option>}
              {agentes.map((agente) => (
                <option key={agente.id_agente} value={agente.id_agente}>
                  {getNombreAgente(agente)}
                </option>
              ))}
            </select>
          </div>

          <DatePartsFilter label="Desde" value={fechaInicio} onChange={setFechaInicio} disabled={bloqueaFechas} disabledClassName={disabledControlClass} />
          <DatePartsFilter label="Hasta" value={fechaFin} onChange={setFechaFin} disabled={bloqueaFechas} disabledClassName={disabledControlClass} />

          <div className="flex flex-col">
            <label className="mb-1 block text-xs text-gray-600">Estado</label>
            <select
              value={bloqueaEstado ? 'Pendiente' : estadoFiltro}
              onChange={(e) => !bloqueaEstado && setEstadoFiltro(e.target.value)}
              disabled={bloqueaEstado}
              className={`${inputClass} ${bloqueaEstado ? disabledControlClass : ''}`}
            >
              {!bloqueaEstado && <option value="">Todos</option>}
              <option value="Pendiente">Pendiente</option>
              {!bloqueaEstado && (
                <>
                  <option value="Aceptada">Aceptada</option>
                  <option value="Rechazada">Rechazada</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiltrosPropuestas;
