"use client";
import React, { FC, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import TablaContenidoCampaña from "./resumencomponents/TablaContenidoCampaña";
import TablaDatosCobro from "./resumencomponents/TablaDatosCobro";
import TablaDatosGenerales from "./resumencomponents/TablaDatosGenerales";
import TablaDatosEmpresa from "./resumencomponents/TablaDatosEmpresa";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import contratosContents from "@/app/contents/contratosContents.json";
import agentes from "@/app/contents/agentesContents.json";
import cuentas from "@/app/contents/cuentasContents.json";
import contactos from "@/app/contents/contactsContents.json";
import { InterfazContrato, InterfazAgente, InterfazCuenta, InterfazContacto } from "@/app/interfaces/interfaces";

const ResumenContrato: FC = () => {
  const params = useParams();
  const id_contrato = params?.id_contrato as string;

  // Estado del contrato
  const [contratoEditable, setContratoEditable] = useState<InterfazContrato | undefined>(
    () => contratosContents.find((item) => item.id_contrato === id_contrato)
  );

  // Estados de datos relacionados
  const [agenteSeleccionado, setAgenteSeleccionado] = useState<InterfazAgente | undefined>();
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<InterfazCuenta | undefined>();
  const [contactoSeleccionado, setContactoSeleccionado] = useState<InterfazContacto | undefined>();

  useEffect(() => {
    const contrato = contratosContents.find((item) => item.id_contrato === id_contrato);
    setContratoEditable(contrato);

    if (contrato) {
      // Cargar agente
      const agente = agentes.find((a) => a.id_agente === contrato.id_agente_contrato);
      setAgenteSeleccionado(agente);

      // Cargar cuenta
      const cuenta = cuentas.find((cu) => cu.id_cuenta === contrato.cuenta_contrato.id_cuenta_contrato);
      setCuentaSeleccionada(cuenta);

      // Cargar contacto
      const contacto = contactos.find((co) => co.id_contacto === contrato.cuenta_contrato.id_contacto);
      setContactoSeleccionado(contacto);
    }
  }, [id_contrato]);

  if (!contratoEditable) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200 text-gray-600 p-12">
        <h2 className="text-xl font-semibold text-red-600">
          No se encontró el contrato con ID: {id_contrato}
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal={`Resumen del contrato nº ${contratoEditable.id_contrato}`} />
      <div className="p-12">
        <p className="font-bold text-gray-500">Datos generales:</p>
        <TablaDatosGenerales 
          contrato={contratoEditable} 
          agenteSeleccionado={agenteSeleccionado}
        />

        <p className="font-bold text-gray-500 mt-6">Datos de la empresa:</p>
        <TablaDatosEmpresa 
          contrato={contratoEditable}
          cuentaSeleccionada={cuentaSeleccionada}
          contactoSeleccionado={contactoSeleccionado}
        />

        <p className="font-bold text-gray-500 mt-6">Contenido en campaña:</p>
        <TablaContenidoCampaña contrato={contratoEditable} />

        <p className="font-bold text-gray-500 mt-6">Pagos programados:</p>
        <TablaDatosCobro contrato={contratoEditable} />
      </div>
    </div>
  );
};

export default ResumenContrato;
