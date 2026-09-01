'use client';
import React, { FC, useState, useEffect } from 'react';
import FiltrosPropuestas from './componentesPropuestas/FiltrosPropuestas';
import MiddleNav from '../../../general_components/componentes_recurrentes/MiddleNav';
import Link from 'next/link';
import TodasPropuestas from './componentesPropuestas/tablaspropuestas/TodasPropuestas';
import MisPendientes from './componentesPropuestas/tablaspropuestas/MisPendientes';
import { AgenteService } from '@/app/service/AgenteService';

const Propuestas: FC = () => {
  const [pestana, setPestana] = useState<'miasenproceso' | 'todasporcliente'>('todasporcliente');
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [codigoCRMFiltro, setCodigoCRMFiltro] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [agenteFiltro, setAgenteFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [agenteActual] = useState('ag_25_0004');
  const [agentes, setAgentes] = useState<any[]>([]);

  useEffect(() => {
    AgenteService.getAgentes()
      .then((data) => setAgentes(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error('Error fetching agentes:', error);
        setAgentes([]);
      });
  }, []);

  useEffect(() => {
    if (pestana === 'miasenproceso') {
      setAgenteFiltro(agenteActual);
      setEstadoFiltro('Pendiente');
    } else if (pestana === 'todasporcliente') {
      setFechaInicio('');
      setFechaFin('');
      setEstadoFiltro('');
    }
  }, [pestana, agenteActual]);

  return (
    <div className="flex h-full min-h-screen flex-col bg-white text-gray-700">
      <MiddleNav
        tituloprincipal={`Propuestas para el agente ${agentes.find(a => a.id_agente === agenteActual)?.nombre_completo_agente || agenteActual}`}
      />
      <div className="content-main min-h-screen bg-white px-4 text-sm text-gray-700 md:px-6">
        <div className="flex flex-row justify-end gap-2 py-5">
          <Link
            href="/dashboard/comercial/propuestas/plantillas"
            className="flex min-h-[36px] items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-blue-950 transition-colors hover:bg-gray-50"
          >
            <p>Plantillas</p>
          </Link>
          <Link
            href="/dashboard/comercial/propuestas/crear"
            className="flex min-h-[36px] items-center justify-center rounded-md bg-blue-950/90 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-900"
          >
            <p>Crear propuesta</p>
          </Link>
        </div>
        <div className="overflow-hidden rounded-b-lg bg-white p-6">
          <div className="mb-4 flex flex-row flex-wrap gap-1 border-b border-gray-200">
          <div
              className={`relative cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${
                pestana === 'todasporcliente'
                  ? 'text-blue-800 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-blue-800'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setPestana('todasporcliente')}
            >
              Todas las propuestas
            </div>
            <div
              className={`relative cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${
                pestana === 'miasenproceso'
                  ? 'text-blue-800 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-blue-800'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setPestana('miasenproceso')}
            >
              Mis propuestas pendientes
            </div>
          </div>

          <div className="mb-6">
            <FiltrosPropuestas
              clienteFiltro={clienteFiltro}
              setClienteFiltro={setClienteFiltro}
              codigoCRMFiltro={codigoCRMFiltro}
              setCodigoCRMFiltro={setCodigoCRMFiltro}
              agenteFiltro={agenteFiltro}
              setAgenteFiltro={setAgenteFiltro}
              fechaInicio={fechaInicio}
              setFechaInicio={setFechaInicio}
              fechaFin={fechaFin}
              setFechaFin={setFechaFin}
              estadoFiltro={estadoFiltro}
              setEstadoFiltro={setEstadoFiltro}
              pestana={pestana}
              agenteActual={agenteActual}
              agentes={agentes}
            />
          </div>

          {pestana === 'miasenproceso' && (
            <MisPendientes
              clienteFiltro={clienteFiltro}
              codigoCRMFiltro={codigoCRMFiltro}
              agenteActual={agenteActual}
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
            />
          )}

          {pestana === 'todasporcliente' && (
            <TodasPropuestas
              clienteFiltro={clienteFiltro}
              codigoCRMFiltro={codigoCRMFiltro}
              agenteFiltro={agenteFiltro}
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              estadoFiltro={estadoFiltro}
              agentes={agentes}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Propuestas;
