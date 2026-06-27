import React, { FC, ChangeEvent, useState } from 'react';
import TablaPublicaciones from '../crearComponents/TablaPublicaciones';
 
interface Fase0Props {
    setFaseCrearServicio: React.Dispatch<React.SetStateAction<number>>;
    setPublicacionSeleccionada:   React.Dispatch<React.SetStateAction<string>>;
}

const Fase0: FC<Fase0Props> = ({
    setFaseCrearServicio,
     setPublicacionSeleccionada
}) => {
 
  
    return (
        <div className="p-10 px-8   bg-white rounded-2xl shadow-md max-w-9xl mx-auto text-center">
            <h2 className="text-3xl font-semibold mb-4 pt-10">
                Seleccione una publicación
            </h2>
            <p className="text-gray-400 text-center italic mb-1">
                Seleccione la publicación de la tabla para la que quiere crear un nuevo servicio.
            </p>
            <p className="text-gray-400 text-center italic mb-12">
                Más adelante, podrá ir a crear los detalles para el servicio
            </p>
            
            <TablaPublicaciones setFaseCrearServicio={setFaseCrearServicio} setPublicacionSeleccionada={setPublicacionSeleccionada}/>
        </div>
    );
};

export default Fase0;
