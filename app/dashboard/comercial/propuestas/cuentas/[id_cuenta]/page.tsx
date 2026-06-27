'use client'

import React, { FC, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PropsAprobadasContent from './propuestasclientecomponents/PropsAprobadas';
import PropsPendientesContent from './propuestasclientecomponents/PropsPendientes';
import PropsRechazadasContent from './propuestasclientecomponents/PropsRechazadas';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import cuentas from '@/app/contents/cuentasContents.json'; 

interface PropuestasClienteProps { }

const PropuestasCliente: FC<PropuestasClienteProps> = () => {
  const params = useParams();
  const id_cuenta = params?.id_cuenta as string;

  const [pestana, setPestana] = useState<'pendientes' | 'aprobadas' | 'rechazadas'>('pendientes');

  const nombreEmpresa = useMemo(() => {
    const cuenta = cuentas.find((c: any) => String(c.id_cuenta) === id_cuenta);
    return cuenta?.nombre_empresa || '';
  }, [id_cuenta]);

  return (
    <div className='bg-gray-100 h-full min-h-screen'>
      <MiddleNav tituloprincipal={`Propuestas para ${nombreEmpresa}`} />

      <div className="px-8 text-gray-600">
        <div className='flex flex-col mt-5 p-8 rounded-lg shadow-xl bg-white'>
          <div className='flex flex-row w-full justify-between'>
            <h2 className="text-lg font-semibold mb-4 py-3">
              Propuestas del cliente {nombreEmpresa}
            </h2>

            <div className='flex flex-row gap-8 h-10'>
              <Link
                href={`/dashboard/clientes/cuentas/${id_cuenta}`}
                className='bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900'
              >
                <p>Ficha del cliente</p>
              </Link>

              <Link
                href="/dashboard/comercial/propuestas/crear"
                className='bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900'
              >
                <p>Crear propuesta</p>
              </Link>
            </div>
          </div>

          <div className="flex flex-row relative mb-4 pt-24">
            {['pendientes', 'aprobadas', 'rechazadas'].map((tab) => (
              <div
                key={tab}
                className={`p-3 rounded-tr-lg cursor-pointer w-60 text-center transition-all duration-300
                ${pestana === tab ? 'bg-blue-950 text-white z-30 rounded-tl-lg' : 'z-10 bg-gray-100 hover:bg-gray-200'}`}
                style={{ marginLeft: tab === 'pendientes' ? '0px' : '-5px' }}
                onClick={() => setPestana(tab as any)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </div>
            ))}
          </div>

          <div className="bg-white p-8 shadow-xl rounded-b-lg mb-24">
            {pestana === 'pendientes' && <PropsPendientesContent id_cuenta={id_cuenta} />}
            {pestana === 'aprobadas' && <PropsAprobadasContent id_cuenta={id_cuenta} />}
            {pestana === 'rechazadas' && <PropsRechazadasContent id_cuenta={id_cuenta} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropuestasCliente;
