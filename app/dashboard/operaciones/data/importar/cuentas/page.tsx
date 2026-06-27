"use client"

import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import React, { FC, useState } from 'react';
import F1impc from "./fasesImpCuen/f1impc";
import F2impc from "./fasesImpCuen/f2impc";
import F3impc from "./fasesImpCuen/f3impc";

interface ImportarCuentasProps {}

interface InterfazIncidencia {
  existe: boolean;
  contenido: string;
}

const ImportarCuentas: FC<ImportarCuentasProps> = () => {
  const [faseImportacionCuenta, setFaseImportacionCuenta] = useState<number>(1);
  const [configuracion, setConfiguracion] = useState<string>("");
  const [incidencias, setIncidencias] = useState<InterfazIncidencia | null>(null);

  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal="Importación de Cuentas" />
      <div className="bg-white mx-12 my-6 p-12 rounded-xl shadow">
        <p className='text-3xl font-bold text-blue-950 pb-12'>Importación de Cuentas</p>
        {faseImportacionCuenta === 1 ? (
          <F1impc
            setFaseImportacionCuenta={setFaseImportacionCuenta}
            configuracion={configuracion}
            setConfiguracion={setConfiguracion}
          />
        ) : faseImportacionCuenta === 2 ? (
          <F2impc
            setFaseImportacionCuenta={setFaseImportacionCuenta}
            configuracion={configuracion}
          />
        ) : (
          <F3impc setFaseImportacionCuenta={setFaseImportacionCuenta} incidencias={incidencias} />
        )}
      </div>
    </div>
  );
};

export default ImportarCuentas;
