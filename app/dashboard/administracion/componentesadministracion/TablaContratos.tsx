"use client";
import React, { FC } from "react";
import { useRouter } from 'next/navigation';
import { ContratoResumen } from "@/app/interfaces/interfaces";

interface TablaContratosProps {
  contratos: ContratoResumen[];
}

const TablaContratos: FC<TablaContratosProps> = ({ contratos }) => {
  const router = useRouter();

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-2xl overflow-hidden mt-6">
      <table className="w-full border-collapse">
        <thead className="bg-blue-950 text-white text-left text-sm">
          <tr>
            <th className="p-3">Contrato</th>
            <th className="p-3">Cliente</th>
            <th className="p-3">Agente</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Fecha Firma</th>
            <th className="p-3">Importe</th>
            <th className="p-3">Campaña</th>
          </tr>
        </thead>
        <tbody className="text-gray-700 text-sm divide-y divide-gray-200">
          {contratos.map((contrato) => (
            <tr
              key={contrato.codigo}
              onClick={(e) => handleRowClick(e, `/dashboard/administracion/contratos/${contrato.codigo}`)}
              className="hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <td className="p-3 font-semibold">{contrato.codigo}</td>
              <td className="p-3">{contrato.cliente}</td>
              <td className="p-3">{contrato.agente}</td>
              <td className="p-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    contrato.estado === "Pendiente"
                      ? "bg-yellow-100 text-yellow-700"
                      : contrato.estado === "Pagado"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {contrato.estado}
                </span>
              </td>
              <td className="p-3">{contrato.fechaFirma}</td>
              <td className="p-3">{contrato.importe}</td>
              <td className="p-3">{contrato.campania}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {contratos.length === 0 && (
        <p className="text-center text-gray-500 p-6">
          No hay contratos registrados.
        </p>
      )}
    </div>
  );
};

export default TablaContratos;
