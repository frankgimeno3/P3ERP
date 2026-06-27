'use client';

import React, { FC, useState } from 'react';

interface Props {
  onFiltrar: (mes: string, anio: string) => void;
}

const FiltroTemporal: FC<Props> = ({ onFiltrar }) => {
  const [mes, setMes] = useState('02');
  const [anio, setAnio] = useState('2025');

  const handleFiltrar = () => {
    onFiltrar(mes, anio);
  };


  return (
    <div className='flex flex-row  bg-blue-950 text-white  justify-between items-end text-lg rounded-t  px-6 pt-6 pb-3' >
      <div className='flex flex-col justify-left'>
        <p className='text-xl font-bold'>Eventos de fichaje</p>
        <p>Mostrando datos del mes {mes} del año {anio}</p>
      </div>
      <div className='flex flex-row  items-center justify-end p-2  text-right text-sm'>
        <div className='flex flex-row items-center'>
          <p>Mostrar datos del mes:</p>
          <select
            className="text-gray-600 px-2 py-1 rounded bg-white ml-5"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          >
            {[...Array(12)].map((_, i) => {
              const month = (i + 1).toString().padStart(2, '0');
              return <option className='text-black' key={month} value={month}>{month}</option>;
            })}
          </select>
        </div>

        <div className='flex flex-row items-center ml-5 '>
          <p>Mostrar datos del año:</p>
          <select
            className="text-gray-600 px-2 py-1 rounded bg-white ml-5"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          >
            {[...Array(6)].map((_, i) => {
              const year = (2030 - i).toString();
              return <option className='text-black' key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>

        <button
          className='  px-3 py-1 ml-5 cursor-pointer border border-gray-600 rounded hover:bg-gray-200 hover:text-black transition-color'
          onClick={handleFiltrar}
        >
          Actualizar resultaods
        </button>
      </div>
    </div>
  );
};

export default FiltroTemporal;