'use client';

import React, { FC, useEffect, useState } from 'react';
import { RegistroEventosService } from '@/app/service/RegistroEventosService';

interface RegistroEventosCuentaProps {
  id_cuenta: string;
}

interface EventoCuenta {
  id: string;
  created_at: string;
  event_type: string;
  id_agente: string;
  detalles: string;
}

const RegistroEventosCuenta: FC<RegistroEventosCuentaProps> = ({ id_cuenta }) => {
  const [eventos, setEventos] = useState<EventoCuenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    RegistroEventosService.getCuentaEventos(id_cuenta)
      .then((data) => setEventos(Array.isArray(data) ? data : []))
      .catch((error) => {
        setError(error?.message || 'No se ha podido cargar el registro de eventos.');
        setEventos([]);
      })
      .finally(() => setLoading(false));
  }, [id_cuenta]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Registro de eventos</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-blue-950 text-white">
            <tr>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-left">Agente</th>
              <th className="p-2 text-left">Detalles</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="p-4 text-gray-500">Cargando eventos...</td></tr>}
            {!loading && error && <tr><td colSpan={4} className="p-4 text-red-600">{error}</td></tr>}
            {!loading && !error && eventos.length === 0 && <tr><td colSpan={4} className="p-4 text-gray-500">No hay eventos registrados.</td></tr>}
            {!loading && !error && eventos.map((evento) => (
              <tr key={evento.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-2">{evento.created_at ? new Date(evento.created_at).toLocaleString('es-ES') : '-'}</td>
                <td className="p-2">{evento.event_type || '-'}</td>
                <td className="p-2">{evento.id_agente || '-'}</td>
                <td className="p-2">{evento.detalles || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RegistroEventosCuenta;
