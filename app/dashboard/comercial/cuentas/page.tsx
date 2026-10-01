'use client'
import React, { FC, useState, useEffect } from 'react';
import Filtroscuentas from '../componentesClientes/FiltrosCuentas';
import Tablacuentas from '../componentesClientes/TablaCuentas';
import MiddleNav from '../../../general_components/componentes_recurrentes/MiddleNav';
import Link from 'next/link';
import apiClient from '@/app/apiClient';

const Cuentas: FC = () => {

  const [total, setTotal] = useState<number | null>(null);
  const [totalError, setTotalError] = useState(false);
  useEffect(() => { let active = true; apiClient.get('/api/v1/comercial/cuentas', { params: { countOnly: true } }).then(response => { if (active) setTotal(response.data.total); }).catch(() => { if (active) setTotalError(true); }); return () => { active = false; }; }, []);
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [codigoCrmFiltro, setCodigoCrmFiltro] = useState('');
  const [codigoEdisoftFiltro, setCodigoEdisoftFiltro] = useState('');
  const [agenteFiltro, setAgenteFiltro] = useState('');
  const [telFiltro, setTelFiltro] = useState('');
  const [paisFiltro, setPaisFiltro] = useState('');
  
  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">

      <MiddleNav tituloprincipal={` Cuentas  `} />
      <div className="bg-gray-100 min-h-screen px-8 text-gray-600">
        <p role="status" className="pt-4 text-sm font-semibold">{totalError ? 'No se ha podido cargar el total de cuentas.' : total === null ? 'Cargando total…' : `Total de cuentas: ${total.toLocaleString('es-ES')}`}</p>
        <div className="flex flex-row justify-end py-4">
          <Link
            href="/dashboard/comercial/cuentas/crear"
            className="bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900 text-sm"
          >
            <p>Crear cuenta</p>
          </Link>
        </div>
 
          <Filtroscuentas
            clienteFiltro={clienteFiltro}
            setClienteFiltro={setClienteFiltro}
            codigoCrmFiltro={codigoCrmFiltro}
            setCodigoCrmFiltro={setCodigoCrmFiltro}
            codigoEdisoftFiltro={codigoEdisoftFiltro}
            setCodigoEdisoftFiltro={setCodigoEdisoftFiltro}
            agenteFiltro={agenteFiltro}
            setAgenteFiltro={setAgenteFiltro}
            telFiltro={telFiltro}
            setTelFiltro={setTelFiltro}
            paisFiltro={paisFiltro}
            setPaisFiltro={setPaisFiltro}
          />

          <Tablacuentas
            codigoEdisoftFiltro={codigoEdisoftFiltro}
            clienteFiltro={clienteFiltro}
            codigoCrmFiltro={codigoCrmFiltro}
            agenteFiltro={agenteFiltro}
            telFiltro={telFiltro}
            paisFiltro={paisFiltro}
          />
        </div>
      </div>
 
  );
};

export default Cuentas;
