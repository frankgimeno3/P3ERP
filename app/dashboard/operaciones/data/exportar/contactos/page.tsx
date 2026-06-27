"use client"
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import React, { FC, useState } from "react";
import F1expc from "./fasesExpContactos/f1expc";
import F2expc from "./fasesExpContactos/f2expc";
 
interface ConfigExportacion {
  paises: string[];
  idiomas: string[];
  suscripciones: string[];
  idsCuentas: string[];
  idsContactos: string[];
  camposExcel: string[];
}

const ExportarContactos: FC = () => {

  const [faseExportacionContacto, setFaseExportacionContacto] = useState(1);
  const [configuracion, setConfiguracion] = useState<ConfigExportacion>({
    paises: [],
    idiomas: [],
    suscripciones: [],
    idsCuentas: [],
    idsContactos: [],
    camposExcel: []
  });

  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal="Exportación de contactos" />
  
        {faseExportacionContacto === 1 ? (
          <F1expc
            setFaseExportacionContacto={setFaseExportacionContacto}
            configuracion={configuracion}
            setConfiguracion={setConfiguracion}
          />
        ) : faseExportacionContacto === 2 ? (
          <F2expc
            setFaseExportacionContacto={setFaseExportacionContacto}
            configuracion={configuracion}
          />
        ): <><p>Error: no hay ninguna fase seleccionada</p></>  
      }

     </div>
  );
};

export default ExportarContactos;
