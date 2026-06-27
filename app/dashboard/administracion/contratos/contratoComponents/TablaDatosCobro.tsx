import React, { FC } from 'react';
import { InterfazContrato } from "@/app/interfaces/interfaces";

interface TablaDatosCobroProps {
  contrato: InterfazContrato;
}

const TablaDatosCobro: FC<TablaDatosCobroProps> = ({ contrato }) => {
  const pagos = contrato.array_ordenes_cobro.map((orden) => ({
    codigoOrden: orden.id_orden,
    facturaAsociada: orden.id_factura,
    fecha: contrato.fecha_cobro_prevista_contrato,
    importe: (
      (contrato.importe_contrato_con_iva ?? 0) /
      contrato.array_ordenes_cobro.length
    ).toFixed(2) + "€",
    estado: "Pendiente", // Valor por defecto razonable
  }));

  return (
    <div className="space-y-6">
      <table className="table-auto border-collapse w-full text-left">
        <thead>
          <tr className="bg-blue-950 text-white">
            <th className="px-4 py-2">Código de orden</th>
            <th className="px-4 py-2">Fecha cobro prevista</th>
            <th className="px-4 py-2">Factura asociada</th>
            <th className="px-4 py-2">Importe</th>
            <th className="px-4 py-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {pagos.map((pago, index) => (
            <tr key={index} className="bg-white text-gray-700">
              <td className="px-4 py-2">{pago.codigoOrden}</td>
              <td className="px-4 py-2">{pago.fecha}</td>
              <td className="px-4 py-2">{pago.facturaAsociada}</td>
              <td className="px-4 py-2">{pago.importe}</td>
              <td className="px-4 py-2">{pago.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaDatosCobro;
