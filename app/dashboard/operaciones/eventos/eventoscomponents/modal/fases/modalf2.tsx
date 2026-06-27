import React, { FC, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Configuracion } from '../ExtraerInformeModal';

interface Modalf2Props {
  setModalFase: React.Dispatch<React.SetStateAction<number>>;
  configuracion: Configuracion;
}

const Modalf2: FC<Modalf2Props> = ({ setModalFase, configuracion }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500); // Simula carga
    return () => clearTimeout(timer);
  }, []);

  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet([configuracion]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Informe");
    XLSX.writeFile(workbook, "informe.xlsx");
  };

  return (
    <div>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className='font-bold text-blue-950/70 text-lg pb-5'>Cargando datos del informe</p>
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-950"></div>
        </div>
      ) : (
        <div className='flex flex-col gap-6'>
          <p className='font-bold text-blue-950/70 text-lg'>Resumen de los parámetros seleccionados</p>
          <div className='flex flex-col bg-white border border-gray-100 rounded-lg shadow-xl p-5 gap-2'>
            <div className='flex justify-between'><strong>Agente:</strong> <span>{configuracion.agente}</span></div>
            <div className='flex justify-between'><strong>Tipo de evento:</strong> <span>{configuracion.tipoEvento}</span></div>
            <div className='flex justify-between'><strong>Fecha inicio:</strong> <span>{configuracion.mesInicio}/{configuracion.anoInicio}</span></div>
            <div className='flex justify-between'><strong>Fecha fin:</strong> <span>{configuracion.mesFinal}/{configuracion.anoFinal}</span></div>
          </div>

          <div className='flex flex-row gap-4 mt-4'>
            <button
              className="px-3 py-1 rounded-lg shadow bg-blue-950 hover:bg-blue-950/90 text-white cursor-pointer"
              onClick={handleDownloadExcel}
            >
              Descargar Excel
            </button>
            <button
              className="px-3 py-1 rounded-lg shadow bg-gray-400 hover:bg-gray-500 text-white cursor-pointer"
              onClick={() => setModalFase(1)}
            >
              Modificar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Modalf2;
