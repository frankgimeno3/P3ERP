import { useRouter } from 'next/navigation';
import React, { FC } from 'react';

interface Fase1Props {
  setFaseCrearContacto: React.Dispatch<React.SetStateAction<number>>;

}

const Fase1: FC<Fase1Props> = ({ setFaseCrearContacto }) => {
  const router = useRouter()
  return (
       <div className="flex flex-col p-10 px-8 pb-24 md:px-56 bg-white rounded-2xl shadow-md max-w-5xl mx-auto my-auto text-center">
            <h2 className="text-xl font-semibold pt-10">
                Contacto creado!
            </h2>
      <p className='text-gray-500 pb-6 italic' >Deseas asociarlo a una cuenta? </p>
    
    <div className='flex flex-col gap-6 px-24'>
      <button onClick={() => { router.push('/dashboard/clientes/contactos') }} className='bg-gray-100 hover:bg-gray-100/50 text-sm border border-gray-100 shadow-lg cursor-pointer rounded-lg px-3 py-1'>
        Ahora mismo <span className='font-bold text-md'>no</span>, ir a la ficha completa del contacto
      </button>
        <button onClick={() => { setFaseCrearContacto(2) }} 
        className='bg-gray-100 hover:bg-gray-100/50 text-sm border border-gray-100 shadow-lg cursor-pointer rounded-lg px-3 py-1'>
        <span className='font-bold text-md'>Sí</span>, asociar una cuenta de empresa al contacto
      </button>
    </div>
    </div>
  );
};

export default Fase1;