import React, { FC, useState } from 'react';

interface f1impcProps {
  setFaseImportacionContacto: React.Dispatch<React.SetStateAction<number>>;
  configuracion: string;
  setConfiguracion: React.Dispatch<React.SetStateAction<string>>;
}

const f1impc: FC<f1impcProps> = ({ setFaseImportacionContacto, configuracion, setConfiguracion }) => {
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<string | null>(null);

  const handleContinuar = () => {
    if (!opcionSeleccionada) {
      alert('Debe seleccionar una opción antes de continuar.');
      return;
    }

    // Guardamos la opción seleccionada en configuracion
    setConfiguracion(opcionSeleccionada);

    console.log('Opción seleccionada:', opcionSeleccionada);
    setFaseImportacionContacto(2);
  };

  return (
    <div>
      <p className='font-bold text-xl'>Fase 1/3 - Configuración de coincidencias</p>

      <p className='mt-3'>Qué desea hacer en caso de que dos id de contactos coincidan?</p>

      <section className='my-5 flex flex-col gap-2 my-12'>
        <label className='flex items-center gap-2 cursor-pointer'>
          <input
            type="radio"
            name="conflictoId"
            value="mantener"
            className='cursor-pointer'
            checked={opcionSeleccionada === 'mantener'}
            onChange={(e) => setOpcionSeleccionada(e.target.value)}
          />
          Mantener los datos actuales en el contacto, obviar nuevos datos importados
        </label>

        <label className='flex items-center gap-2 cursor-pointer'>
          <input
            type="radio"
            name="conflictoId"
            value="sustituir_todo"
            className='cursor-pointer'
            checked={opcionSeleccionada === 'sustituir_todo'}
            onChange={(e) => setOpcionSeleccionada(e.target.value)}
          />
          Sustituir todos los datos actuales del contacto por los nuevos importados
        </label>

        <label className='flex items-center gap-2 cursor-pointer'>
          <input
            type="radio"
            name="conflictoId"
            value="sustituir_blanco_manteniendo"
            className='cursor-pointer'
            checked={opcionSeleccionada === 'sustituir_blanco_manteniendo'}
            onChange={(e) => setOpcionSeleccionada(e.target.value)}
          />
          Sustituir únicamente los datos actualmente en blanco por los nuevos datos importados (MANTENIENDO datos en campos que estén en blanco en los datos importados)
        </label>

        <label className='flex items-center gap-2 cursor-pointer'>
          <input
            type="radio"
            name="conflictoId"
            value="sustituir_blanco_borrando"
            className='cursor-pointer'
            checked={opcionSeleccionada === 'sustituir_blanco_borrando'}
            onChange={(e) => setOpcionSeleccionada(e.target.value)}
          />
          Sustituir únicamente los datos actualmente en blanco por los nuevos datos importados (BORRANDO datos en campos que estén en blanco en los datos importados)
        </label>
      </section>

      <button
        className='bg-blue-950 hover:bg-blue-950/90 cursor-pointer text-white font-bold p-2 px-4 rounded-lg shadow-xl'
        onClick={handleContinuar}
      >
        Validar y continuar
      </button>
    </div>
  );
};

export default f1impc;
