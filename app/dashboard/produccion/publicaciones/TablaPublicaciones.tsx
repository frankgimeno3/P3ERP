"use client"
import { useRouter } from 'next/navigation';
import React, { FC } from 'react';
import data from '@/app/contents/publicacionesContents.json'  

interface TablaPublicacionesProps { }

const TablaPublicaciones: FC<TablaPublicacionesProps> = ({ }) => {
  const router = useRouter();

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  return (
    <div className='flex flex-row justify-between w-full items-center bg-white rounded'>
      <table className='min-w-full'>
        <thead className='bg-blue-950 text-white'>
          <tr>
            <th className='text-left p-2 font-light w-2/8'>Publicación</th>
            <th className='text-left p-2 font-light w-2/8'>Edición</th>
            <th className='text-left p-2 font-light w-1/8'>Número</th>
            <th className='text-left p-2 font-light w-1/8'>Deadline Material</th>
            <th className='text-left p-2 font-light w-1/8'>Fecha Publicación</th>
            <th className='text-left p-2 font-light w-1/8'>Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              onClick={(e) => handleRowClick(e, `/dashboard/produccion/publicaciones/${item.id_publicacion}`)}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <td className='p-2 border-b border-gray-200'>{item.medio_publicacion}</td>
              <td className='p-2 border-b border-gray-200'>{item.edicion_publicacion}</td>
              <td className='p-2 border-b border-gray-200'>{item.detalle_publicacion}</td>
              <td className='p-2 border-b border-gray-200'>{item.deadline_material}</td>
              <td className='p-2 border-b border-gray-200'>{item.fecha_publicacion}</td>
              <td className='p-2 border-b border-gray-200'>{item.estado_publicacion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaPublicaciones;