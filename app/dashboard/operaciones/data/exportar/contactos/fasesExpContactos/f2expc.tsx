"use client";
import { ContactoService } from "@/app/service/ContactoService";
import { exportRows } from "../../exportRows";
import { useRouter } from 'next/navigation';
import React, { FC, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

interface ConfigExportacion {
  paises: string[];
  idiomas: string[];
  suscripciones: string[];
  idsCuentas: string[];
  idsContactos: string[];
  camposExcel: string[];
}

interface F2expcProps {
  configuracion: ConfigExportacion;
  setFaseExportacionContacto: (n: number) => void;
}

const F2expc: FC<F2expcProps> = ({ configuracion, setFaseExportacionContacto }) => {
  const [cargando, setCargando] = useState(true);
  const [error,setError]=useState("");
  const [rows,setRows]=useState<any[][]>([]);
const router = useRouter()
  useEffect(() => {
    let active=true;
    setCargando(true);setError("");setRows([]);
    ContactoService.getContactos().then(data=>{
      if(active)setRows(exportRows("contactos",data,configuracion));
    }).catch(reason=>{if(active)setError(reason?.message || "No se pudieron cargar los datos reales.");})
      .finally(()=>{if(active)setCargando(false);});
    return ()=>{active=false;};
  }, [configuracion]);

  const handleDownload = () => {
    if(cargando || error || rows.length<2)return;
     const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Exportación");
    XLSX.writeFile(wb, "exportacion_contactos.xlsx");
  };

  return (
    <div className="bg-white mx-12 my-6 p-12 rounded-xl shadow">
      <p className="text-3xl font-bold text-blue-950 mb-6">Creando exportación</p>
       <div className="flex flex-row items-center justify-between border rounded-lg shadow p-6 mb-8 bg-gray-50">
<div className='flex flex-col'>
        <h2 className="font-semibold text-xl mb-4">Resumen de configuración</h2>
        <p><strong>Países:</strong> {configuracion.paises.join(', ') || 'Todos'}</p>
        <p><strong>Idiomas:</strong> {configuracion.idiomas.join(', ') || 'Todos'}</p>
        <p><strong>Suscripciones:</strong> {configuracion.suscripciones.join(', ') || 'Todas'}</p>
        <p><strong>IDs de Cuentas:</strong> {configuracion.idsCuentas.join(', ') || 'Todos'}</p>
        <p><strong>IDs de Contactos:</strong> {configuracion.idsContactos.join(', ') || 'Todos'}</p>
        <p><strong>Campos Excel:</strong> {configuracion.camposExcel.join(', ') || 'Todos'}</p>
      </div>
      <div className='pr-12'>
        <button className='bg-gray-600 hover:bg-gray-600/90 cursor-pointer rounded-xl shadow-xl text-white text-sm px-3 p-2  '
        onClick={()=>{setFaseExportacionContacto(1)}}>Modificar</button>
      </div>
      </div>

       {error && <p role="alert" className="my-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {!cargando && !error && <p className="my-4">{Math.max(0,rows.length-1)} registros encontrados.</p>}
      {cargando ? (
        <div className="flex flex-col items-center justify-center my-12">
          <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16 mb-4 animate-spin"></div>
          <p className="text-gray-600">Generando exportación...</p>
        </div>
      ) : (
        <div className='flex flex-col gap-8'>
        <button
          className="bg-blue-950 enabled:hover:bg-blue-950/90 text-white font-bold rounded-lg shadow-xl px-4 py-2 enabled:cursor-pointer disabled:opacity-50 disabled:cursor-default"
          disabled={Boolean(error) || rows.length<2}
            onClick={handleDownload}
        >
          Descargar Excel
        </button>

         <button
          className="bg-blue-950 enabled:hover:bg-blue-950/90 text-white font-bold rounded-lg shadow-xl px-4 py-2 enabled:cursor-pointer disabled:opacity-50 disabled:cursor-default"
          onClick={()=>{router.push("/dashboard/comercial/contactos")}}
        >
          Ir a contactos
        </button>
            </div>

      )}

      <style jsx>{`
        .loader {
          border-top-color: #1e3a8a; /* azul */
        }
      `}</style>
    </div>
  );
};

export default F2expc;
