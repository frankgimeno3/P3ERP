"use client"
import React, { FC } from 'react';
import data from '@/app/contents/publicacionesContents.json'  

interface TablaPublicacionesProps {
  setFaseCrearServicio: React.Dispatch<React.SetStateAction<number>>;
  setPublicacionSeleccionada: React.Dispatch<React.SetStateAction<string>>;
}

const TablaPublicaciones: FC<TablaPublicacionesProps> = ({ setFaseCrearServicio, setPublicacionSeleccionada}) => {
  
  const handlePublicationSelection = (id_publicacion: string) => {
    setPublicacionSeleccionada(id_publicacion);
    setTimeout(() => {
      setFaseCrearServicio(1);
    }, 300); // 300ms = 0.3 segundos
  };

  return (
    <div className='flex flex-row justify-between w-full items-center bg-white rounded text-xs'>
      <table className='min-w-full'>
        <thead className='bg-blue-950 text-white'>
          <tr>
            <th className='text-left p-2 font-light w-2/7'>Publicación</th>
            <th className='text-left p-2 font-light w-1/7'>Edición</th>
            <th className='text-left p-2 font-light w-1/7'>Número</th>
            <th className='text-left p-2 font-light w-1/7'>Deadline Material</th>
            <th className='text-left p-2 font-light w-1/7'>Fecha Publicación</th>
            <th className='text-left p-2 font-light w-1/7'>Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              className='hover:bg-gray-50 cursor-pointer  text-left'
              onClick={() => handlePublicationSelection(item.id_publicacion)}
            >
              <td className='p-2 border-b border-gray-200'>{item.medio_publicacion}</td>
              <td className='p-2 border-b border-gray-200'>{item.edicion_publicacion}</td>
              <td className='p-2 border-b border-gray-200'>{item.detalle_publicacion}</td>
              <td className='p-2 border-b border-gray-200'>{item.deadline_material}</td>
              <td className='p-2 border-b border-gray-200'>{item.fecha_publicacion}</td>
              <td className='p-2 border-b border-gray-200'>{item.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaPublicaciones;
