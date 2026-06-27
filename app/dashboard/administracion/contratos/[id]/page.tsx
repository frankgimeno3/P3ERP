"use client";

import React, { FC, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import TablaDatosGenerales from "../contratoComponents/TablaDatosGenerales";
import TablaDatosEmpresa from "../contratoComponents/TablaDatosEmpresa";
import TablaContenidoCampaña from "../contratoComponents/TablaContenidoCampana";
import TablaDatosCobro from "../contratoComponents/TablaDatosCobro";
import TablaDatosPago from "../contratoComponents/TablaDatosPago";
import OtrosDatosEnFactura from "../contratoComponents/OtrosDatosEnFactura";
import contratosContents from "@/app/contents/contratosContents.json";
import cuentas from "@/app/contents/cuentasContents.json";
import contactos from "@/app/contents/contactsContents.json";
import agentes from "@/app/contents/agentesContents.json";
import { InterfazContrato, InterfazCuenta, InterfazContacto, InterfazAgente } from "@/app/interfaces/interfaces";

const Contacto: FC = () => {
  const params = useParams();
  const id_contrato = params?.id as string;

  // Estado del contrato
  const [contratoEditable, setContratoEditable] = useState<InterfazContrato | undefined>(
    () => contratosContents.find((c) => c.id_contrato === id_contrato)
  );

  // Estados de datos relacionados
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<InterfazCuenta | undefined>();
  const [contactoSeleccionado, setContactoSeleccionado] = useState<InterfazContacto | undefined>();
  const [agenteSeleccionado, setAgenteSeleccionado] = useState<InterfazAgente | undefined>();

  useEffect(() => {
    const contrato = contratosContents.find((c) => c.id_contrato === id_contrato);
    setContratoEditable(contrato);

    if (contrato) {
      // Cargar cuenta
      const cuenta = cuentas.find((cu) => cu.id_cuenta === contrato.cuenta_contrato.id_cuenta_contrato);
      setCuentaSeleccionada(cuenta);

      // Cargar contacto
      const contacto = contactos.find((co) => co.id_contacto === contrato.cuenta_contrato.id_contacto);
      setContactoSeleccionado(contacto);

      // Cargar agente
      const agente = agentes.find((a) => a.id_agente === contrato.id_agente_contrato);
      setAgenteSeleccionado(agente);
    }
  }, [id_contrato]);

  if (!contratoEditable) {
    return <p className="p-8">Contrato no encontrado</p>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Detalle del Contrato" />

      <div className="bg-white min-h-screen p-8 text-gray-600 w-full">
        <h2 className="text-lg font-semibold mb-4">
          Resumen del contrato nº {contratoEditable.id_contrato}
        </h2>

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
        <TablaContenidoCampaña contenidos={contratoEditable.contenido_campana} />

        <p className="font-bold text-gray-500 mt-6">Datos de cobro:</p>
        <TablaDatosCobro contrato={contratoEditable} />

        <p className="font-bold text-gray-500 mt-6">Datos de pago:</p>
        <TablaDatosPago contrato={contratoEditable} />

        <p className="font-bold text-gray-500 mt-6">Otros datos en factura:</p>
        <OtrosDatosEnFactura 
          contrato={contratoEditable}
          cuentaSeleccionada={cuentaSeleccionada}
        />
      </div>
    </div>
  );
};

export default Contacto;
