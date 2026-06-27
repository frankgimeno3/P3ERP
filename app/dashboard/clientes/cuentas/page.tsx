'use client'
import React, { FC, useState } from 'react';
import Filtroscuentas from '../componentesClientes/FiltrosCuentas';
import Tablacuentas from '../componentesClientes/TablaCuentas';
import MiddleNav from '../../../general_components/componentes_recurrentes/MiddleNav';
import Link from 'next/link';

const Cuentas: FC = () => {

  const [clienteFiltro, setClienteFiltro] = useState('');
  const [codigoCrmFiltro, setCodigoCrmFiltro] = useState('');
  const [agenteFiltro, setAgenteFiltro] = useState('');
  const [telFiltro, setTelFiltro] = useState('');
  
  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">

      <MiddleNav tituloprincipal={` Cuentas  `} />
      <div className="bg-gray-100 min-h-screen px-8 text-gray-600">
        <div className="flex flex-row justify-end py-4">
          <Link
            href="/dashboard/clientes/cuentas/crear"
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
            agenteFiltro={agenteFiltro}
            setAgenteFiltro={setAgenteFiltro}
            telFiltro={telFiltro}
            setTelFiltro={setTelFiltro}
          />

          <Tablacuentas
            clienteFiltro={clienteFiltro}
            codigoCrmFiltro={codigoCrmFiltro}
            agenteFiltro={agenteFiltro}
            telFiltro={telFiltro}
          />
        </div>
      </div>
 
  );
};

export default Cuentas;
