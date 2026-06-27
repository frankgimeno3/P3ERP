'use client'

import Link from 'next/link';
import React, { FC } from 'react';

interface FiltrosContactosProps {
  contactoFiltro: string;
  setContactoFiltro: (value: string) => void;
  apellidosFiltro: string;
  setApellidosFiltro: (value: string) => void;
  codigoContactoFiltro: string;
  setCodigoContactoFiltro: (value: string) => void;
  empresaAsociadaFiltro: string;
  setEmpresaAsociadaFiltro: (value: string) => void;
  telFiltro: string;
  setTelFiltro: (value: string) => void;
  emailFiltro: string;
  setEmailFiltro: (value: string) => void;
  paisFiltro: string;
  setPaisFiltro: (value: string) => void;
}

const FiltrosContactos: FC<FiltrosContactosProps> = ({
  contactoFiltro,
  setContactoFiltro,
  apellidosFiltro,
  setApellidosFiltro,
  codigoContactoFiltro,
  setCodigoContactoFiltro,
  empresaAsociadaFiltro,
  setEmpresaAsociadaFiltro,
  telFiltro,
  setTelFiltro,
  emailFiltro,
  setEmailFiltro,
  paisFiltro,
  setPaisFiltro
}) => {

  return (
    <div className="flex flex-col justify-left w-full  bg-white rounded p-5">
      <p className="text-lg font-semibold">Buscador de contactos</p>
      <div className='flex flex-col'>
        <div className='flex flex-row gap-8 w-full justify-between items-end'>

<div className='flex flex-1 flex-col mt-2'>
              <label className='text-sm font-medium'>Nombre del contacto</label>
            <input
              type='text'
              value={contactoFiltro}
              onChange={(e) => setContactoFiltro(e.target.value)}
              placeholder='Nombre del contacto'
              className='border px-2 py-1 rounded text-sm'            />
          </div>

          <div className='flex flex-1 flex-col mt-2'>
            <label className='text-sm font-medium'>Apellidos cliente</label>
            <input
              type='text'
              value={apellidosFiltro}
              onChange={(e) => setApellidosFiltro(e.target.value)}
              placeholder='Apellidos del cliente'
              className='border px-2 py-1 rounded text-sm'            />
          </div>

          <div className='flex flex-1 flex-col mt-2'>
            <label className='text-sm font-medium'>Código Contacto</label>
            <input
              type='number'
              value={codigoContactoFiltro}
              onChange={(e) => setCodigoContactoFiltro(e.target.value)}
              placeholder='Código del contacto'
              className='border px-2 py-1 rounded text-sm'            />
          </div>

          <div className='flex flex-1 flex-col mt-2'>
            <label className='text-sm font-medium'>Empresa asociada</label>
            <input
              type='number'
              value={empresaAsociadaFiltro}
              onChange={(e) => setEmpresaAsociadaFiltro(e.target.value)}
              placeholder='Ej: 123'
              className='border px-2 py-1 rounded text-sm'            />
          </div>
        </div>
        <div className='flex flex-row gap-8 pb-3 w-full justify-between items-end'>
          <div className='flex flex-1 flex-col mt-2'>
            <label className='text-sm font-medium'>Tel principal</label>
            <input
              type='number'
              value={telFiltro}
              onChange={(e) => setTelFiltro(e.target.value)}
              placeholder='Teléfono'
              className='border px-2 py-1 rounded text-sm'            />
          </div>


          <div className='flex flex-1 flex-col mt-2'>
            <label className='text-sm font-medium'>Email</label>
            <input
              type='text'
              value={emailFiltro}
              onChange={(e) => setEmailFiltro(e.target.value)}
              placeholder='correo@ejemplo.com'
              className='border px-2 py-1 rounded text-sm'            />
          </div>

          <div className='flex flex-1 flex-col mt-2'>
            <label className='text-sm font-medium'>País</label>
            <input
              type='text'
              value={paisFiltro}
              onChange={(e) => setPaisFiltro(e.target.value)}
              placeholder='España'
              className='border px-2 py-1 rounded text-sm'            />
          </div>
          <div className='flex flex-1 flex-col mt-2'>

          <Link
            href="/dashboard/clientes/contactos/crear"
            className='bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900 mt-2'
          >
            <p>Buscar</p>
          </Link>
                    </div>

        </div>
      </div>
    </div>
  );
};

export default FiltrosContactos;
