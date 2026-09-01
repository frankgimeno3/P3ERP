'use client'
import React, { FC, useEffect, useState } from 'react';
import { AgenteService } from '@/app/service/AgenteService';

interface Agente {
  id_agente: string;
  nombre_completo_agente: string;
}

interface FiltroscuentasProps {
  clienteFiltro: string;
  setClienteFiltro: (value: string) => void;
  codigoCrmFiltro: string;
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

      <div className="flex w-full flex-row items-end justify-between gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium">Nombre cliente</label>
          <input type="text" value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)} placeholder="Nombre de empresa" className="rounded border px-2 py-1" />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium">Codigo CRM</label>
          <input type="text" value={codigoCrmFiltro} onChange={(e) => setCodigoCrmFiltro(e.target.value)} placeholder="Cuenta de cliente" className="rounded border px-2 py-1" />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium">Agente</label>
          <select value={agenteFiltro} onChange={(e) => setAgenteFiltro(e.target.value)} className="rounded border px-2 py-1">
            <option value="">Todos los agentes</option>
            {agentes.map((agente) => (
              <option key={agente.id_agente} value={agente.id_agente}>
                {agente.nombre_completo_agente}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="font-medium">Pais</label>
          <input type="text" value={paisFiltro} onChange={(e) => setPaisFiltro(e.target.value)} placeholder="Ej: Espana" className="rounded border px-2 py-1" />
        </div>

        <div className="flex flex-col">
          <label className="font-medium">Tel principal</label>
          <input type="number" value={telFiltro} onChange={(e) => setTelFiltro(e.target.value)} placeholder="Ej: 123" className="rounded border px-2 py-1" />
        </div>
      </div>
    </div>
  );
};

export default Filtroscuentas;
