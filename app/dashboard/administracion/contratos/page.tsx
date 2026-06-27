"use client";
import React, { FC, useMemo } from "react";
import MiddleNav from "../../../general_components/componentes_recurrentes/MiddleNav";
import TablaContratos from "../componentesadministracion/TablaContratos";
import contratosContents from "@/app/contents/contratosContents.json";
import cuentas from "@/app/contents/cuentasContents.json";
import agentes from "@/app/contents/agentesContents.json";
import { InterfazContrato, ContratoResumen } from "@/app/interfaces/interfaces";

const Contratos: FC = () => {
  const contratos: ContratoResumen[] = useMemo(() => {
    return contratosContents.map((c: InterfazContrato) => {
      const cuenta = cuentas.find((cu) => cu.id_cuenta === c.cuenta_contrato.id_cuenta_contrato);
      const agente = agentes.find((a) => a.id_agente === c.id_agente_contrato);
      
      return {
        codigo: c.id_contrato,
        cliente: cuenta?.nombre_empresa || c.cuenta_contrato.id_cuenta_contrato,
        agente: agente?.nombre_completo_agente || c.id_agente_contrato,
        estado: "Pendiente", // Valor por defecto razonable
        fechaFirma: c.fecha_firma_contrato,
        importe: c.importe_contrato_con_iva.toFixed(2),
        campania: c.id_campana_asociada,
      };
    });
  }, []);

  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600 w-full">
      <MiddleNav tituloprincipal="Contratos" />
      <div className="bg-white min-h-screen p-12 text-gray-600 w-full">
        <h2 className="text-lg font-semibold mb-6">Todos los contratos</h2>
        <TablaContratos contratos={contratos} />
      </div>
    </div>
  );
};

export default Contratos;
