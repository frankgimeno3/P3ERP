'use client'
import { isCommercialAgent } from "@/app/config/commercialAgents";
import React, { FC, useEffect, useState } from 'react';
import { AgenteService } from '@/app/service/AgenteService';
import TableFilters from '@/app/components/TableFilters';
import TableColumnFilter from '@/app/components/TableColumnFilter';
import SearchableSelect from '@/app/components/SearchableSelect';
import apiClient from '@/app/apiClient';

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
  const [paises, setPaises] = useState<string[]>([]);
  const [paisError, setPaisError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/api/v1/comercial/cuentas', { params: { countriesOnly: true }, signal: controller.signal })
      .then(response => setPaises(Array.isArray(response.data) ? response.data : []))
      .catch(() => { if (!controller.signal.aborted) setPaisError(true); });
    return () => controller.abort();
  }, []);

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
    <TableFilters>


      <div className="contents">
        <TableColumnFilter label="Nombre empresa" value={clienteFiltro} onChange={setClienteFiltro} />
        <TableColumnFilter label="ID cuenta (Tiger)" value={codigoCrmFiltro} onChange={setCodigoCrmFiltro} />
        <TableColumnFilter label="Código Edisoft" value={codigoEdisoftFiltro} onChange={setCodigoEdisoftFiltro} />
        <label className="block text-xs font-extralight text-gray-600">
          <span className="mb-1 block">Agente asignado</span>
          <select aria-label="Filtrar agente asignado" value={agenteFiltro} onChange={(e) => setAgenteFiltro(e.target.value)} className="w-full cursor-pointer rounded border bg-white p-2 hover:border-blue-400">
            <option value="">Todos los agentes</option>
            {agentes.filter(isCommercialAgent).map((agente) => (
              <option key={agente.id_agente} value={agente.id_agente}>
                {agente.nombre_completo_agente}
              </option>
            ))}
          </select>
        </label>
        <div>
          <label htmlFor="cuentas-pais" className="mb-1 block text-xs font-extralight text-gray-600">País</label>
          <SearchableSelect id="cuentas-pais" label="Filtrar por país" value={paisFiltro} onChange={setPaisFiltro} placeholder="Escribe y selecciona un país" options={[{ value: '', label: 'Todos los países' }, ...paises.map(pais => ({ value: pais, label: pais }))]} />
          {paisError && <p role="alert" className="mt-1 text-xs text-red-700">No se pudieron cargar los países.</p>}
        </div>
        <TableColumnFilter label="Tel principal" value={telFiltro} onChange={setTelFiltro} />
      </div>
    </TableFilters>
  );
};

export default Filtroscuentas;
