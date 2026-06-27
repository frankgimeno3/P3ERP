import Link from 'next/link';
import React, { FC } from 'react';

interface ExportarProps {
  
}

const Exportar: FC<ExportarProps> = ({ }) => {
  return (
    <div className='flex flex-col p-5 gap-5'>
      <Link
        href="/dashboard/operaciones/data/exportar/contactos"
        className='flex flex-row cursor-pointer bg-blue-950 hover:bg-blue-950/90 rounded-lg shadow-xl p-12'
      >
        <p className='font-bold text-white'>Exportar contactos</p>
      </Link>
      <Link
        href="/dashboard/operaciones/data/exportar/cuentas"
        className='flex flex-row cursor-pointer bg-blue-950 hover:bg-blue-950/90 rounded-lg shadow-xl p-12'
      >
        <p className='font-bold text-white'>Exportar cuentas</p>
      </Link>
    </div>
  );  
};

export default Exportar;