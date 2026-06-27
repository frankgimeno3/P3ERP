"use client";
import { useRouter } from 'next/navigation';
import React, { FC, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

interface ConfigExportacion {
  paises: string[];
  actividades: string[];
  presenteEnQQ: string[];
  idsCuentas: string[];
  campos: string[];
}

interface F2expcProps {
  configuracion: ConfigExportacion;
  setFaseExportacionCuenta: (n: number) => void;
}

const F2expc: FC<F2expcProps> = ({ configuracion, setFaseExportacionCuenta }) => {
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setCargando(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      configuracion.campos.length > 0 ? configuracion.campos : ["Sin datos"]
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Exportación");
    XLSX.writeFile(wb, "exportacion_cuentas.xlsx");
  };

  return (
    <div className="bg-white mx-12 my-6 p-12 rounded-xl shadow">
      <p className="text-3xl font-bold text-blue-950 mb-6">Creando exportación</p>
      <div className="flex flex-row items-center justify-between border rounded-lg shadow p-6 mb-8 bg-gray-50">
        <div className='flex flex-col'>
          <h2 className="font-semibold text-xl mb-4">Resumen de configuración</h2>
          <p><strong>Países:</strong> {configuracion.paises.join(', ') || 'Todos'}</p>
          <p><strong>Actividades:</strong> {configuracion.actividades.join(', ') || 'Todas'}</p>
          <p><strong>Presente en QQ:</strong> {configuracion.presenteEnQQ.join(', ') || 'Todos'}</p>
          <p><strong>IDs de Cuentas:</strong> {configuracion.idsCuentas.join(', ') || 'Todos'}</p>
          <p><strong>Campos Excel:</strong> {configuracion.campos.join(', ') || 'Todos'}</p>
        </div>
        <div className='pr-12'>
          <button
            className='bg-gray-600 hover:bg-gray-600/90 cursor-pointer rounded-xl shadow-xl text-white text-sm px-3 p-2'
            onClick={() => { setFaseExportacionCuenta(1) }}
          >
            Modificar
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="flex flex-col items-center justify-center my-12">
          <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16 mb-4 animate-spin"></div>
          <p className="text-gray-600">Generando exportación...</p>
        </div>
      ) : (
        <div className='flex flex-col gap-8'>
          <button
            className="bg-blue-950 hover:bg-blue-950/90 text-white font-bold rounded-lg shadow-xl px-4 py-2 cursor-pointer"
            onClick={handleDownload}
          >
            Descargar Excel
          </button>

          <button
            className="bg-blue-950 hover:bg-blue-950/90 text-white font-bold rounded-lg shadow-xl px-4 py-2 cursor-pointer"
            onClick={() => { router.push("/dashboard/clientes/cuentas") }}
          >
            Ir a cuentas
          </button>
        </div>
      )}

      <style jsx>{`
        .loader {
          border-top-color: #1e3a8a;
        }
      `}</style>
    </div>
  );
};

export default F2expc;
