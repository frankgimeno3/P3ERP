"use client";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import React, { FC, useState } from "react";
import F1expc from "./fasesExpCuentas/f1expc";
import F2expc from "./fasesExpCuentas/f2expc";

interface ConfigExportacion {
  paises: string[];
  actividades: string[];
  presenteEnQQ: string[];
  idsCuentas: string[];
  campos: string[];
}

const ExportarCuentas: FC = () => {
  const [faseExportacionCuenta, setFaseExportacionCuenta] = useState(1);
  const [configuracion, setConfiguracion] = useState<ConfigExportacion>({
    paises: [],
    actividades: [],
    presenteEnQQ: [],
    idsCuentas: [],
    campos: []
  });

  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal="Exportación de Cuentas" />

      {faseExportacionCuenta === 1 ? (
        <F1expc
          setFaseExportacionCuenta={setFaseExportacionCuenta}
          configuracion={configuracion}
          setConfiguracion={setConfiguracion}
        />
      ) : faseExportacionCuenta === 2 ? (
        <F2expc
          setFaseExportacionCuenta={setFaseExportacionCuenta}
          configuracion={configuracion}
        />
      ) : (
        <p>Error: no hay ninguna fase seleccionada</p>
      )}
    </div>
  );
};

export default ExportarCuentas;
