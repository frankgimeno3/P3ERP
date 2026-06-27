import React, { FC } from 'react';
import { InterfazContrato, InterfazCuenta } from "@/app/interfaces/interfaces";

interface OtrosDatosEnFacturaProps {
  contrato: InterfazContrato;
  cuentaSeleccionada?: InterfazCuenta;
}

const OtrosDatosEnFactura: FC<OtrosDatosEnFacturaProps> = ({ contrato, cuentaSeleccionada }) => {
  // Obtener la primera dirección de la cuenta si existe
  const direccionPrincipal = cuentaSeleccionada?.array_direcciones_cuenta?.[0];

  return (
    <table className="table-auto border-collapse text-center w-full">
      <thead>
        <tr className="bg-blue-950 text-white">
          <th className="px-4 py-2">Nombre en factura</th>
          <th className="px-4 py-2">Dirección en factura</th>
          <th className="px-4 py-2">Código Postal</th>
          <th className="px-4 py-2">Estado/Zona</th>
          <th className="px-4 py-2">País</th>
          <th className="px-4 py-2">VAT</th>
        </tr>
      </thead>
      <tbody>
        <tr className="bg-white text-gray-700">
          <td className="px-4 py-2">{cuentaSeleccionada?.nombre_empresa || contrato.cuenta_contrato.id_cuenta_contrato}</td>
          <td className="px-4 py-2">{direccionPrincipal?.direccion_completa || "—"}</td>
          <td className="px-4 py-2">{direccionPrincipal?.codigo_postal || "—"}</td>
          <td className="px-4 py-2">{direccionPrincipal?.region_direccion || direccionPrincipal?.ciudad_direccion || "—"}</td>
          <td className="px-4 py-2">{direccionPrincipal?.pais_direccion || cuentaSeleccionada?.pais_cuenta || "—"}</td>
          <td className="px-4 py-2">—</td>
        </tr>
      </tbody>
    </table>
  );
};

export default OtrosDatosEnFactura;
