"use client"
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import VentanaFichaje from '@/app/general_components/otros_componentes/VentanaFichaje';
import { useRouter } from 'next/navigation';
import React, { FC, useState } from 'react';

interface MainDashboardProps { }

const MainDashboard: FC<MainDashboardProps> = ({ }) => {
  const router = useRouter()

  const [usuarioActual] = useState("Usuario");
  const [userType] = useState("superadmin");



  return (
    <div className='bg-white h-full min-h-screen p-12 text-gray-600'>
      <MiddleNav tituloprincipal={'Página de inicio'} />
      <div className='flex flex-row justify-between items-center'>
        <div className='flex flex-col '>
          <p className='text-xl'>Bienvenido, {usuarioActual}</p>
          <p>Haz click en uno de los desplegables del menú izquierdo para comenzar.</p>
          <p>Se mostrarán módulos para usuario tipo {userType}.</p>
        </div>
        <VentanaFichaje />
      </div>

    </div>
  );
};

export default MainDashboard;
