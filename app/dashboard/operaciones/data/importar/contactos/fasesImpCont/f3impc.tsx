import React, { FC } from 'react';
import { useRouter } from 'next/navigation';

interface F3impcProps {
  setFaseImportacionContacto: React.Dispatch<React.SetStateAction<number>>;
  incidencias: { existe: boolean; contenido: string } | null;
}

const F3impc: FC<F3impcProps> = ({ setFaseImportacionContacto, incidencias }) => {
  const router = useRouter();

  const handleVolverFase2 = () => {
    setFaseImportacionContacto(2);
  };

  const handleIrDashboard = () => {
    router.push('/dashboard/clientes/contactos');
  };

  return (
    <div>
      <p className='font-bold text-xl mb-3'>Resultados de la importación</p>

      {incidencias?.existe ? (
        <div>
          <p className='text-red-600 mb-3'>Se encontraron errores durante la importación:</p>
          <p className='mb-3'>{incidencias.contenido}</p>
          <button
            onClick={handleVolverFase2}
            className='bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded'
          >
            Volver a la fase 2
          </button>
        </div>
      ) : (
        <div>
          <p className='text-green-600 mb-3'>¡Importación completada con éxito!</p>
          <button
            onClick={handleIrDashboard}
            className='bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer'
          >
            Ir a contactos
          </button>
        </div>
      )}
    </div>
  );
};

export default F3impc;
