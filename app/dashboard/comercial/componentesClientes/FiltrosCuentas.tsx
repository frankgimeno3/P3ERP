'use client'
import { useRouter } from 'next/navigation';
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
}) => {
  const router = useRouter();
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
      <div className="flex flex-col justify-left w-full  bg-white rounded p-5">
      <p className="text-lg font-semibold mb-2">Buscador de cuentas</p>

      <div className='flex flex-row w-full justify-between items-end'>

         {/* Nombre cliente */}
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

        {/* Código CRM */}
        <div className="flex flex-col">
          <label className="text-sm font-medium">Código CRM</label>
          <input
            type="text"
            value={codigoCrmFiltro}
            onChange={(e) => setCodigoCrmFiltro(e.target.value)}
            placeholder="Cuenta de cliente"
            className="border px-2 py-1 rounded"
          />
        </div>

        {/* Agente */}
        <div className="flex flex-col">
          <label className="text-sm font-medium">Agente</label>
          <select
            value={agenteFiltro}
            onChange={(e) => setAgenteFiltro(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="">Todos los agentes</option>
            {agentes.map((agente) => (
              <option key={agente.id_agente} value={agente.id_agente}>
                {agente.nombre_completo_agente}
              </option>
            ))}
          </select>
        </div>
        <div className='flex flex-col'>
          <label className=' font-medium'>Tel principal</label>
          <input
            type='number'
            value={telFiltro}
            onChange={(e) => setTelFiltro(e.target.value)}
            placeholder='Ej: 123'
            className='border px-2 py-1 rounded'
          />
        </div>
        </div>
      </div>


   );
};

export default Filtroscuentas;
