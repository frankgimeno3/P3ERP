'use client';
import React, { FC, useEffect, useState } from 'react';
import ContenidoPorCliente from './contratoscomponents/ContenidoPorCliente';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';

interface ContratosProps { }

const Contratos: FC<ContratosProps> = ({ }) => {
  // const [agenteActual, setAgenteActual] = useState("usuario")

  //   useEffect(() => {
  //     try {
  //       const payload = JSON.parse(localStorage.getItem("userPayload") || "{}");
  //        if (payload) { setAgenteActual(payload.email)}
  //     } catch (e) {
  //       console.error("Error leyendo payload del usuario:", e);
  //     }  
  //   }, []);
  

    
  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">

      <MiddleNav tituloprincipal={`Contratos en curso  `} />

      <div className="bg-gray-100 min-h-screen px-12 text-gray-600">
        <ContenidoPorCliente />
      </div>
    </div>
  );
};

export default Contratos;
