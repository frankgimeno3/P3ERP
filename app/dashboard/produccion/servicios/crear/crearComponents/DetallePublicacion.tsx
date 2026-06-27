"use client"
import React, { FC } from 'react';
import data from '@/app/contents/publicacionesContents.json';

interface DetallePublicacionProps {
    publicacionSeleccionada: string;
}

const DetallePublicacion: FC<DetallePublicacionProps> = ({ publicacionSeleccionada }) => {
    const publicacion = data.find(
        (item) => item.id_publicacion === publicacionSeleccionada
    );

    if (!publicacion) {
        return (
            <div className="p-4 bg-white rounded shadow">
                <p className="text-gray-500">No se encontró la publicación seleccionada.</p>
            </div>
        );
    }

    return (
        <div className="pb-4  rounded shadow-xl space-y-2 text-left bg-gray-100/30">
            <p className='text-white italic bg-blue-950 w-full py-4 px-8 '>Datos de la publicación: </p>
            <div className='flex flex-col px-8  '>

                <div className='flex flex-row gap-12 pt-5'>
                    <div className='flex flex-col flex-1 pb-5  gap-3'>
                        <span className="font-semibold text-blue-950">Publicación: </span>
                        <span className='text-sm'>{publicacion.medio_publicacion}</span>
                    </div>
                    <div className='flex flex-col flex-1 pb-5  gap-3'>
                        <span className="font-semibold text-blue-950">Edición: </span>
                        <span className='text-sm'>{publicacion.edicion_publicacion}</span>
                    </div>
                    <div className='flex flex-col flex-1 pb-5  gap-3'>
                        <span className="font-semibold text-blue-950">Número: </span>
                        <span className='text-sm'>{publicacion.detalle_publicacion}</span>
                    </div>
                </div>
                <div className='flex flex-row '>

                    <div className='flex flex-col w-1/3 pb-5  gap-3'>
                        <span className="font-semibold text-blue-950">Deadline Material: </span>
                        <span className='text-sm'>{publicacion.deadline_material}</span>
                    </div>
                    <div className='flex flex-col w-1/3 pb-5 pl-4  gap-3'>
                        <span className="font-semibold text-blue-950">Fecha Publicación: </span>
                        <span className='text-sm'>{publicacion.fecha_publicacion}</span>
                    </div>
 
                </div>
            </div>

        </div>
    );
};

export default DetallePublicacion;
