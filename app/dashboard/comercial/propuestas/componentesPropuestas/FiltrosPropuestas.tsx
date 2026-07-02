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

  return (
    <div className="flex flex-col w-full bg-white rounded p-5">
      <p className="text-lg font-semibold mb-2">Buscador de propuestas</p>
      <div className="flex flex-row w-full justify-between items-center">
        <div className="flex flex-wrap gap-4 items-end p-5">
          <div className="flex flex-col">
            <label className="text-sm font-medium">Nombre cliente</label>
            <input
              type="text"
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              placeholder="Nombre de empresa"
              className="border px-2 py-1 rounded"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Código CRM</label>
            <input
              type="text"
              value={codigoCRMFiltro}
              onChange={(e) => setCodigoCRMFiltro(e.target.value)}
              placeholder="Cuenta de cliente"
              className="border px-2 py-1 rounded"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Agente</label>
            <select
              value={bloqueaAgente ? agenteActual : agenteFiltro}
              onChange={(e) => !bloqueaAgente && setAgenteFiltro(e.target.value)}
              disabled={bloqueaAgente}
              className={`border px-2 py-1 rounded ${bloqueaAgente ? 'bg-blue-950/50 text-white cursor-not-allowed' : ''}`}
            >
              {!bloqueaAgente && <option value="">Todos</option>}
              {agentes.map((agente) => (
                <option key={agente.id_agente} value={agente.id_agente}>
                  {getNombreAgente(agente)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Desde</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => !bloqueaFechas && setFechaInicio(e.target.value)}
              disabled={bloqueaFechas}
              className={`border px-2 py-1 rounded ${bloqueaFechas ? 'bg-blue-950/50 text-white cursor-not-allowed' : ''}`}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Hasta</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => !bloqueaFechas && setFechaFin(e.target.value)}
              disabled={bloqueaFechas}
              className={`border px-2 py-1 rounded ${bloqueaFechas ? 'bg-blue-950/50 text-white cursor-not-allowed' : ''}`}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Estado</label>
            <select
              value={bloqueaEstado ? 'Pendiente' : estadoFiltro}
              onChange={(e) => !bloqueaEstado && setEstadoFiltro(e.target.value)}
              disabled={bloqueaEstado}
              className={`border px-2 py-1 rounded ${bloqueaEstado ? 'bg-blue-950/50 text-white cursor-not-allowed' : ''}`}
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
