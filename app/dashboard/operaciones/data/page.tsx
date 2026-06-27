'use client'
import React, { FC, useState } from 'react';
 import MiddleNav from '../../../general_components/componentes_recurrentes/MiddleNav';
import Importar from './datacomponents/Importar';
import Exportar from './datacomponents/Exportar';
  
const Importexport: FC = () => {
  const [pestana, setPestana] = useState("importar")
 
 
  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">

      <MiddleNav tituloprincipal={` Importaciones y exportaciones  `} />

      <div className="bg-gray-100 min-h-screen px-12 text-gray-600">
     
 

        <div className='mt-5 p-12 rounded-lg shadow-xl bg-white'>
          <div className="flex flex-row relative ">
            <div
              className={`p-3 rounded-tr-lg cursor-pointer w-60 text-center transition-all duration-300
            ${pestana === 'importar' ? 'bg-blue-950 text-white z-30 rounded-tl-lg' : 'z-10 bg-gray-100 hover:bg-gray-200'}`}
              style={{ marginLeft: '0px' }}
              onClick={() => setPestana('importar')}
            >
              Importar
            </div>
            <div
              className={`p-3 rounded-tr-lg cursor-pointer w-60 text-center transition-all duration-300
            ${pestana === 'exportar' ? 'bg-blue-950 text-white z-30 rounded-tl-lg' : 'z-10 bg-gray-100 hover:bg-gray-200'}`}
              style={{ marginLeft: '0px' }}
              onClick={() => setPestana('exportar')}
            >
              Exportar
            </div>
             
          </div>
          <div className='border border-gray-100 shadow-xl'>
            <p className='p-5 text-xl font-bold'>Qué deseas hacer?</p>
          {pestana == "importar" && <Importar />}

          {pestana == "exportar" && <Exportar/>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Importexport;
