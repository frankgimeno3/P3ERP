'use client';

import { isCommercialAgent } from "@/app/config/commercialAgents";
import React, { FC } from 'react';
import TableFilters from '@/app/components/TableFilters';
import DatePartsInput from '@/app/components/DatePartsInput';

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
  children?: React.ReactNode;
}

const getNombreAgente = (agente: Agente) =>
  agente.nombre_completo_agente ||
  `${agente.nombre_agente || ''} ${agente.apellidos_agente || ''}`.trim() ||
  agente.id_agente;

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
  children,
}) => {
  const bloqueaAgente = pestana === 'miasenproceso';
  const bloqueaFechas = false;
  const bloqueaEstado = pestana === 'miasenproceso';
  const inputClass = "w-full rounded-lg border px-3 py-2 text-sm";
  const disabledControlClass = "cursor-not-allowed opacity-70";

  return (
    <div className="flex w-full flex-col bg-white">
      <TableFilters>
      <div className="contents">
        <div className="contents">
          <div className="flex flex-col">
            <label className="mb-1 block text-xs font-extralight text-gray-600">Nombre cliente</label>
            <input
              type="text"
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              placeholder="Nombre de empresa"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 block text-xs font-extralight text-gray-600">C&oacute;digo CRM</label>
            <input
              type="text"
              value={codigoCRMFiltro}
              onChange={(e) => setCodigoCRMFiltro(e.target.value)}
              placeholder="Cuenta de cliente"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 block text-xs font-extralight text-gray-600">Agente</label>
            <select
              value={bloqueaAgente ? agenteActual : agenteFiltro}
              onChange={(e) => !bloqueaAgente && setAgenteFiltro(e.target.value)}
              disabled={bloqueaAgente}
              className={`${inputClass} ${bloqueaAgente ? disabledControlClass : 'cursor-pointer hover:border-blue-950'}`}
            >
              {!bloqueaAgente && <option value="">Todos</option>}
              {agentes.filter(isCommercialAgent).map((agente) => (
                <option key={agente.id_agente} value={agente.id_agente}>
                  {getNombreAgente(agente)}
                </option>
              ))}
            </select>
          </div>

        </div>
        <div className="contents">
          <DatePartsInput label="Desde" value={fechaInicio} onChange={setFechaInicio} disabled={bloqueaFechas} />
          <DatePartsInput label="Hasta" value={fechaFin} onChange={setFechaFin} disabled={bloqueaFechas} />
          <div className="flex flex-col">
            <label className="mb-1 block text-xs font-extralight text-gray-600">Estado</label>
            <select
              value={bloqueaEstado ? 'Pendiente' : estadoFiltro}
              onChange={(e) => !bloqueaEstado && setEstadoFiltro(e.target.value)}
              disabled={bloqueaEstado}
              className={`${inputClass} ${bloqueaEstado ? disabledControlClass : 'cursor-pointer hover:border-blue-950'}`}
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
    {children}</TableFilters></div>
  );
};

export default FiltrosPropuestas;
