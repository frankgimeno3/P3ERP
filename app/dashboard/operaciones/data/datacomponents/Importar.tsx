import Link from 'next/link';
import React, { FC } from 'react';

interface ImportarProps {

}

const Importar: FC<ImportarProps> = ({ }) => {
  return (
    <div className='flex flex-col p-5 gap-5'>
      <Link
        href="/dashboard/operaciones/data/importar/contactos"
        className='flex flex-row cursor-pointer bg-blue-950 hover:bg-blue-950/90 rounded-lg shadow-xl p-12'
      >
        <p className='font-bold text-white'>Importar contactos</p>
      </Link>
      <Link
        href="/dashboard/operaciones/data/importar/cuentas"
        className='flex flex-row cursor-pointer bg-blue-950 hover:bg-blue-950/90 rounded-lg shadow-xl p-12'
      >
        <p className='font-bold text-white'>Importar cuentas</p>
      </Link>
    </div>
  );
};

export default Importar;