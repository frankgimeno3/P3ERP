import React, { FC } from 'react';
import { InterfazContrato } from "@/app/interfaces/interfaces";

interface TablaDatosPagoProps {
  contrato: InterfazContrato;
}

const TablaDatosPago: FC<TablaDatosPagoProps> = ({ contrato }) => {
  const ivaPorcentaje = contrato.iva_aplicable ? 21 : 0;
  const importeIVA = contrato.iva_aplicable 
    ? contrato.importe_contrato_con_iva - contrato.importe_total_BI_contrato 
    : 0;

  return (
    <div className="space-y-6">
      <table className="table-auto border-collapse w-full text-left">
        <thead>
          <tr className="bg-blue-950 text-white">
            <th className="px-4 py-2">Términos de pago</th>
            <th className="px-4 py-2">Base imponible</th>
            <th className="px-4 py-2">Impuesto</th>
            <th className="px-4 py-2">Precio total</th>
            <th className="px-4 py-2">Forma de Cobro</th>
            <th className="px-4 py-2">Número de pagos</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white text-gray-700">
            <td className="px-4 py-2">{contrato.fecha_cobro_prevista_contrato}</td>
            <td className="px-4 py-2">{contrato.importe_total_BI_contrato.toFixed(2)}€</td>
            <td className="px-4 py-2">{ivaPorcentaje}%</td>
            <td className="px-4 py-2">{contrato.importe_contrato_con_iva.toFixed(2)}€</td>
            <td className="px-4 py-2">{contrato.forma_cobro_contrato}</td>
            <td className="px-4 py-2">{contrato.array_ordenes_cobro.length}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default TablaDatosPago;