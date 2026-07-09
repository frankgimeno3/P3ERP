'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { FC, useEffect, useState } from 'react';
import { PropuestaService } from '@/app/service/PropuestaService';

type EstadoPropuesta = 'Pendiente' | 'Aprobada' | 'Rechazada';

interface Propuesta {
  id_propuesta: string;
  id_agente_propuesta: string;
  estado_propuesta: string;
  fecha_envio_propuesta: string;
  nombre_propuesta?: string;
  forma_cobro_propuesta?: string;
  importe_propuesta_con_iva: number;
  id_contacto_propuesta?: string;
  cargo_contacto_propuesta?: string;
}

interface ContenidoPropuestasCuentaProps {
  id_cuenta: string;
}

const tabs: { key: EstadoPropuesta; label: string }[] = [
  { key: 'Pendiente', label: 'Pendientes' },
  { key: 'Aprobada', label: 'Aprobadas' },
  { key: 'Rechazada', label: 'Rechazadas' },
];

const ContenidoPropuestasCuenta: FC<ContenidoPropuestasCuentaProps> = ({ id_cuenta }) => {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoPropuesta>('Pendiente');
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    PropuestaService.getPropuestas({ id_cuenta, estado })
      .then((data) => setPropuestas(Array.isArray(data) ? data : []))
      .catch((error) => {
        setError(error?.message || 'No se pudieron cargar las propuestas.');
        setPropuestas([]);
      })
      .finally(() => setLoading(false));
  }, [id_cuenta, estado]);

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  const formatImporte = (importe: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(importe || 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold">Propuestas</h2>
        <Link
          href="/dashboard/comercial/propuestas/crear"
          className="bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900 text-sm"
        >
          Crear nueva propuesta
        </Link>
      </div>

      <div className="flex flex-row relative">
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            type="button"
            className={`p-3 rounded-tr-lg cursor-pointer w-52 text-center transition-all duration-300 ${
              estado === tab.key
                ? 'bg-blue-950 text-white z-30 rounded-tl-lg'
                : 'z-10 bg-white text-gray-700 hover:bg-gray-200'
            }`}
            style={{ marginLeft: index === 0 ? '0px' : '-5px' }}
            onClick={() => setEstado(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-950/80 text-white">
            <tr>
              <th className="text-left p-2 font-light">ID Propuesta</th>
              <th className="text-left p-2 font-light">Nombre</th>
              <th className="text-left p-2 font-light">Agente</th>
              <th className="text-left p-2 font-light">Fecha de envío</th>
              <th className="text-left p-2 font-light">Forma de cobro</th>
              <th className="text-left p-2 font-light">Importe total</th>
            </tr>
          </thead>
          <tbody>
            {propuestas.map((propuesta) => (
              <tr
                key={propuesta.id_propuesta}
                onClick={(e) => handleRowClick(e, `/dashboard/comercial/propuestas/${propuesta.id_propuesta}`)}
                className="border-t border-gray-200 hover:bg-gray-100/30 cursor-pointer"
              >
                <td className="p-2 border-b border-gray-200">{propuesta.id_propuesta}</td>
                <td className="p-2 border-b border-gray-200">{propuesta.nombre_propuesta || '-'}</td>
                <td className="p-2 border-b border-gray-200">{propuesta.id_agente_propuesta || '-'}</td>
                <td className="p-2 border-b border-gray-200">{propuesta.fecha_envio_propuesta || '-'}</td>
                <td className="p-2 border-b border-gray-200">{propuesta.forma_cobro_propuesta || '-'}</td>
                <td className="p-2 border-b border-gray-200">{formatImporte(propuesta.importe_propuesta_con_iva)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <p className="mt-4 text-center text-gray-500">Cargando propuestas...</p>}
        {!loading && error && <p className="mt-4 text-center text-red-600">{error}</p>}
        {!loading && !error && propuestas.length === 0 && (
          <p className="mt-4 text-center text-gray-500">
            No hay propuestas {tabs.find((tab) => tab.key === estado)?.label.toLowerCase()} para esta cuenta.
          </p>
        )}
      </div>
    </div>
  );
};

export default ContenidoPropuestasCuenta;
