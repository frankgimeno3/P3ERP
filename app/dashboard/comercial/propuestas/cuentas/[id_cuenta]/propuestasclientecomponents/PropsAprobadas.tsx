'use client';
import React, { FC, useState } from 'react';
import PropSvg from '../../../componentesPropuestas/svg/PropSvg';
import { useRouter } from 'next/navigation';
import propuestas from '@/app/contents/propuestasContents.json';

interface PropsAprobadasContentProps {
  id_cuenta: string;
}

const PropsAprobadasContent: FC<PropsAprobadasContentProps> = ({ id_cuenta }) => {
  const router = useRouter();
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [agenteFiltro, setAgenteFiltro] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  const propuestasFiltradas = propuestas.filter(
    (p) =>
      p.estado_propuesta === 'Aprobada' &&
      p.cuenta_propuesta.id_cuenta_propuesta === id_cuenta
  );

  const resultadosFiltrados = propuestasFiltradas.filter((p) => {
    const coincideCliente =
      clienteFiltro === '' ||
      p.id_propuesta.toLowerCase().includes(clienteFiltro.toLowerCase()) ||
      p.cuenta_propuesta.cargoContacto.toLowerCase().includes(clienteFiltro.toLowerCase());

    const coincideAgente =
      agenteFiltro === '' ||
      p.id_agente_propuesta.toLowerCase().includes(agenteFiltro.toLowerCase());

    const fechaPropuesta = new Date(p.fecha_envio_propuesta.split('/').reverse().join('-'));

    const coincideFecha =
      (!fechaInicio || fechaPropuesta >= new Date(fechaInicio)) &&
      (!fechaFin || fechaPropuesta <= new Date(fechaFin));

    return coincideCliente && coincideAgente && coincideFecha;
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-green-800 text-white">
          <tr>
            <th className="text-left p-2 font-light"></th>
            <th className="text-left p-2 font-light">ID Propuesta</th>
            <th className="text-left p-2 font-light">Agente</th>
            <th className="text-left p-2 font-light">Fecha de envío</th>
            <th className="text-left p-2 font-light">Importe total</th>
          </tr>
        </thead>
        <tbody>
          {resultadosFiltrados.map((p) => (
            <tr
              key={p.id_propuesta}
              onClick={(e) => handleRowClick(e, `/dashboard/comercial/propuestas/${p.id_propuesta}`)}
              className="border-t border-gray-200 hover:bg-gray-100/30 cursor-pointer"
            >
              <td className="p-2 border-b border-gray-200"><PropSvg /></td>
              <td className="p-2 border-b border-gray-200">{p.id_propuesta}</td>
              <td className="p-2 border-b border-gray-200">{p.id_agente_propuesta}</td>
              <td className="p-2 border-b border-gray-200">{p.fecha_envio_propuesta}</td>
              <td className="p-2 border-b border-gray-200">${p.importe_propuesta_con_iva.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {resultadosFiltrados.length === 0 && (
        <p className="mt-4 text-center text-gray-500">
          No se encontraron propuestas aprobadas para esta cuenta.
        </p>
      )}
    </div>
  );
};

export default PropsAprobadasContent;
