'use client';
import React, { FC, useState } from 'react';
import ContenidoPorCliente from './contratoscomponents/ContenidoPorCliente';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';

interface ContratosProps { }

const Contratos: FC<ContratosProps> = ({ }) => {
  const [pestana, setPestana] = useState<'curso' | 'anteriores'>('curso');

  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">

      <MiddleNav tituloprincipal="Contratos" />

      <div className="bg-gray-100 min-h-screen px-12 text-gray-600">
        <div className="mt-6 flex flex-row">
          {[
            { key: 'curso', label: 'Contratos en curso' },
            { key: 'anteriores', label: 'Contratos anteriores' },
          ].map((tab, index) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPestana(tab.key as 'curso' | 'anteriores')}
              className={`w-60 cursor-pointer rounded-tr-lg p-3 text-center text-sm transition-all duration-300 ${
                pestana === tab.key ? 'z-30 rounded-tl-lg bg-blue-950 text-white' : 'z-10 bg-white text-gray-700 hover:bg-gray-200'
              }`}
              style={{ marginLeft: index === 0 ? '0px' : '-5px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <ContenidoPorCliente estado={pestana} />
      </div>
    </div>
  );
};

export default Contratos;
