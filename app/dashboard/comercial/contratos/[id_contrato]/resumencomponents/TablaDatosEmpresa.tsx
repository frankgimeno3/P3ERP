import React, { FC } from "react";
import { useRouter } from "next/navigation";
import { InterfazContacto, InterfazContrato, InterfazCuenta } from "@/app/interfaces/interfaces";

interface TablaDatosEmpresaProps {
  contrato: InterfazContrato;
  cuentaSeleccionada?: InterfazCuenta;
  contactoSeleccionado?: InterfazContacto;
}

const TablaDatosEmpresa: FC<TablaDatosEmpresaProps> = ({ 
  contrato, 
  cuentaSeleccionada, 
  contactoSeleccionado 
}) => {
  const router = useRouter();
  const { cuenta_contrato } = contrato;

  return (
    <div className="overflow-x-auto">
      <table className="table-auto border-collapse w-full text-center">
        <thead>
          <tr className="bg-blue-950 text-white">
            <th className="px-6 py-2">Empresa anunciante</th>
            <th className="px-4 py-2">Código CRM</th>
            <th className="px-4 py-2">País</th>
            <th className="px-4 py-2">Contacto de gestión</th>
            <th className="px-4 py-2">Cargo del contacto</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white text-gray-700">
            <td className="px-4 py-2">
              <button
                className="bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900"
                onClick={() => router.push(`/dashboard/clientes/cuentas/${cuentaSeleccionada?.id_cuenta}`)}
              >
                {cuentaSeleccionada?.nombre_empresa}
              </button>
            </td>
            <td className="px-4 py-2">{cuenta_contrato.id_cuenta_contrato}</td>
            <td className="px-4 py-2">{cuentaSeleccionada?.pais_cuenta}</td>
            <td className="px-4 py-2">
              <button
                className="bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900"
                onClick={() =>
                  router.push(`/dashboard/clientes/contactos/${cuenta_contrato.id_contacto}`)
                }
              >
                {contactoSeleccionado?.nombre_completo_contacto}
              </button>
            </td>
            <td className="px-4 py-2">{cuenta_contrato.cargoContacto}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default TablaDatosEmpresa;
