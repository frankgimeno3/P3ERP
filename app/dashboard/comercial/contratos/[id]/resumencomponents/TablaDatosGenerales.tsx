import { InterfazAgente, InterfazContrato } from "@/app/interfaces/interfaces";
import React, { FC } from "react";

interface TablaDatosGeneralesProps {
  contrato: InterfazContrato;
  agenteSeleccionado?: InterfazAgente;
}

const TablaDatosGenerales: FC<TablaDatosGeneralesProps> = ({ contrato, agenteSeleccionado }) => {

  return (
    <table className="table-auto border-collapse text-center w-full">
      <thead>
        <tr className="bg-blue-950 text-white">
          <th className="px-4 py-2">Código contrato</th>
          <th className="px-4 py-2">Fecha de firma</th>
          <th className="px-4 py-2">Fecha estimada finalización</th>
          <th className="px-4 py-2">Agente</th>
          <th className="px-4 py-2">Código campaña administrativa</th>
        </tr>
      </thead>
      <tbody>
        <tr className="bg-white text-gray-700">
          <td className="px-4 py-2">{contrato.id_contrato || "—"}</td>
          <td className="px-4 py-2">{contrato.fecha_firma_contrato || "—"}</td>
          <td className="px-4 py-2">{contrato.fecha_fin_contrato || "—"}</td>
          <td className="px-4 py-2">
            {agenteSeleccionado ? agenteSeleccionado.nombre_completo_agente : "—"}
          </td>
          <td className="px-4 py-2">{contrato.id_campana_asociada || "—"}</td>
        </tr>
      </tbody>
    </table>
  );
};

export default TablaDatosGenerales;
