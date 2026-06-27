import React, { FC, useState } from 'react';

interface f2impcProps {
  setFaseImportacionContacto: React.Dispatch<React.SetStateAction<number>>;
  configuracion: string;
}

const f2impc: FC<f2impcProps> = ({ setFaseImportacionContacto, configuracion }) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(''); // Limpiar errores anteriores

    if (!e.target.files || e.target.files.length === 0) {
      setArchivo(null);
      return;
    }

    const file = e.target.files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'xls' && extension !== 'xlsx') {
      setError('Solo se permiten archivos Excel (.xls o .xlsx)');
      setArchivo(null);
      e.target.value = ''; // Limpiar input
      return;
    }

    setArchivo(file);
  };

  const handleContinuar = () => {
    if (!archivo) return;

    console.log('Archivo seleccionado:', archivo.name);
    setFaseImportacionContacto(3);
  };

  // Deshabilitar botón si no hay archivo o hay error
  const botonDisabled = !archivo || error !== '';

  return (
    <div>
      <p className='font-bold text-xl'>Fase 2/3 - Importación</p>

      <div className='flex flex-row items-center justify-between border border-gray-100 rounded-xl shadow-xl p-5 m-5'>
        <div className='flex flex-col'>
          <p className='font-bold'>Resumen de configuración actual</p>
          <p className='text-gray-400'>
            Opción seleccionada: <span className='font-bold'>{configuracion}</span>
          </p>
        </div>
        <button className='bg-gray-600 hover:bg-gray-600/90 cursor-pointer rounded-xl shadow-xl text-white text-sm px-3 p-2  '
        onClick={()=>{setFaseImportacionContacto(1)}}>Modificar</button>
      </div>

      <div className='my-12'>
        <label className='block font-semibold mb-2'>Seleccione un archivo Excel:</label>
        <div className="relative w-full max-w-sm">
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={handleArchivoChange}
            id="archivo"
            className="hidden"
          />
          <label
            htmlFor="archivo"
            className="flex items-center justify-between border p-2 rounded-md cursor-pointer bg-white hover:bg-gray-100"
          >
            <span>{archivo ? archivo.name : "Selecciona un archivo"}</span>
            <span className="ml-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm">Subir</span>
          </label>
        </div>

        {error && <p className='mt-2 text-red-600'>{error}</p>}
        {archivo && !error && <p className='mt-2 text-green-600'>Archivo listo: {archivo.name}</p>}
      </div>

      <button
        className={`bg-blue-950 text-white font-bold p-2 px-4 rounded-lg shadow-xl
          ${botonDisabled ? 'cursor-not-allowed bg-blue-950/50' : 'hover:bg-blue-950/90 cursor-pointer'}`}
        onClick={handleContinuar}
        disabled={botonDisabled}
      >
        Validar y continuar
      </button>
    </div>
  );
};

export default f2impc;
