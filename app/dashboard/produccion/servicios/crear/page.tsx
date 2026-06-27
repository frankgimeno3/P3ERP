"use client"
import React, { FC, useState } from 'react';
import Fase0 from './fases/fase0';
import Fase1 from './fases/fase1';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';

interface CrearServicioProps {
  setFaseCrearServicio: React.Dispatch<React.SetStateAction<number>>;
}

const CrearServicio: FC<CrearServicioProps> = ({ }) => {
  const [faseCrearServicio, setFaseCrearServicio] = useState(0);
  const [publicacionSeleccionada, setPublicacionSeleccionada] = useState('');
  const [nombreContenido, setNombreContenido] = useState('');
  const [tipoContenido, setTipoContenido] = useState('');    
  const [especificaciones, setEspecificaciones] = useState('');  

  return (
    <div className="flex flex-col h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal={` Crear servicio  `} />
      <div className="bg-gray-100 h-full min-h-screen p-12 text-gray-600">      
        {faseCrearServicio == 0 && (
          <Fase0 
            setFaseCrearServicio={setFaseCrearServicio} 
            setPublicacionSeleccionada={setPublicacionSeleccionada} 
          />
        )}
        {faseCrearServicio == 1 && (
          <Fase1 
            publicacionSeleccionada={publicacionSeleccionada} 
            nombreContenido={nombreContenido} 
            setNombreContenido={setNombreContenido}
            tipoContenido={tipoContenido} 
            setTipoContenido={setTipoContenido} 
            especificaciones={especificaciones} 
            setEspecificaciones={setEspecificaciones}
          />
        )}
      </div>
    </div>
  );
};

export default CrearServicio;
