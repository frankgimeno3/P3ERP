"use client"

import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import React, { FC, useState } from 'react';
import F1impc from "./fasesImpCont/f1impc";
import F2impc from "./fasesImpCont/f2impc";
import F3impc from "./fasesImpCont/f3impc";

interface ImportarContactosProps {}

interface InterfazIncidencia {
  existe: boolean;
  contenido: string;
}

const ImportarContactos: FC<ImportarContactosProps> = () => {
  const [faseImportacionContacto, setFaseImportacionContacto] = useState<number>(1);
  const [configuracion, setConfiguracion] = useState<string>("");
  const [incidencias, setIncidencias] = useState<InterfazIncidencia | null>(null);

  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal="Importación de contactos" />
      <div className="bg-white mx-12 my-6 p-12 rounded-xl shadow">
        <p className='text-3xl font-bold text-blue-950 pb-12'>Importación de contactos</p>
        {faseImportacionContacto === 1 ? (
          <F1impc
            setFaseImportacionContacto={setFaseImportacionContacto}
            configuracion={configuracion}
            setConfiguracion={setConfiguracion}
          />
        ) : faseImportacionContacto === 2 ? (
          <F2impc
            setFaseImportacionContacto={setFaseImportacionContacto}
            configuracion={configuracion}
          />
        ) : (
          <F3impc setFaseImportacionContacto={setFaseImportacionContacto} incidencias={incidencias} />
        )}
      </div>
    </div>
  );
};

export default ImportarContactos;
