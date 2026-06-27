import React, { FC } from 'react';

interface RegistroCardProps {
  autor: string;
  fecha: string;
  tipoEvento: string;
  detalles: string;
}

const RegistroCard: FC<RegistroCardProps> = ({ autor, fecha, tipoEvento, detalles }) => {
  return (
    <div className='flex flex-col bg-white border border-gray-100 rounded shadow p-6'>
      <div className='flex flex-row'>
        <p className='font-bold pr-1'>Autor:</p>
        <p>{autor}</p>
      </div>
      <div className='flex flex-row'>
        <p className='font-bold pr-1'>Fecha:</p>
        <p>{fecha}</p>
      </div>
      <div className='flex flex-row'>
        <p className='font-bold pr-1'>Tipo de evento:</p>
        <p>{tipoEvento}</p>
      </div>
      <div className='flex flex-col'>
        <p className='font-bold'>Detalles:</p>
        <p>{detalles}</p>
      </div>
    </div>
  );
};

export default RegistroCard;
