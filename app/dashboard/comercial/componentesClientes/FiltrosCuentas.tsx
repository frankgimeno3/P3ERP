'use client'
import React, { FC, useEffect, useState } from 'react';
import { AgenteService } from '@/app/service/AgenteService';
import TableColumnFilter from '@/app/components/TableColumnFilter';

interface Agente {
  id_agente: string;
  nombre_completo_agente: string;
}

interface FiltroscuentasProps {
  clienteFiltro: string;
  setClienteFiltro: (value: string) => void;
  codigoCrmFiltro: string;
  codigoEdisoftFiltro: string;
  setCodigoEdisoftFiltro: (value: string) => void;
  setCodigoCrmFiltro: (value: string) => void;
  agenteFiltro: string;
  setAgenteFiltro: (value: string) => void;
  telFiltro: string;
  setTelFiltro: (value: string) => void;
  paisFiltro: string;
  setPaisFiltro: (value: string) => void;
}

const Filtroscuentas: FC<FiltroscuentasProps> = ({
  clienteFiltro,
  setClienteFiltro,
  codigoCrmFiltro,
  codigoEdisoftFiltro,
  setCodigoEdisoftFiltro,
  setCodigoCrmFiltro,
  agenteFiltro,
  setAgenteFiltro,
  telFiltro,
  setTelFiltro,
  paisFiltro,
  setPaisFiltro,
}) => {
  const [agentes, setAgentes] = useState<Agente[]>([]);

  useEffect(() => {
    let isMounted = true;
    AgenteService.getAgentes()
      .then((data) => {
        if (isMounted) setAgentes(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error('Error fetching agentes:', error);
        if (isMounted) setAgentes([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex w-full flex-col justify-left rounded bg-white p-5">
      <p className="mb-2 text-lg font-semibold">Buscador de cuentas</p>

      <div className="grid w-full grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <TableColumnFilter label="Nombre empresa" value={clienteFiltro} onChange={setClienteFiltro} />
        <TableColumnFilter label="ID cuenta (Tiger)" value={codigoCrmFiltro} onChange={setCodigoCrmFiltro} />
        <TableColumnFilter label="Código Edisoft" value={codigoEdisoftFiltro} onChange={setCodigoEdisoftFiltro} />
        <details>
          <summary className="cursor-pointer rounded p-1 hover:bg-blue-100 hover:text-blue-950">Agente asignado{agenteFiltro ? ' · Filtro activo' : ''}</summary>
          <select aria-label="Filtrar agente asignado" value={agenteFiltro} onChange={(e) => setAgenteFiltro(e.target.value)} className="mt-2 w-full cursor-pointer rounded border bg-white p-2 hover:border-blue-400">
            <option value="">Todos los agentes</option>
            {agentes.map((agente) => (
              <option key={agente.id_agente} value={agente.id_agente}>
                {agente.nombre_completo_agente}
              </option>
            ))}
          </select>
        </details>
        <TableColumnFilter label="País" value={paisFiltro} onChange={setPaisFiltro} />
        <TableColumnFilter label="Tel principal" value={telFiltro} onChange={setTelFiltro} />
      </div>
    </div>
  );
};

export default Filtroscuentas;
