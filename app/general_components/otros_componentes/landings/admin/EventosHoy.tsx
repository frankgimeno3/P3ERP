import React, { FC } from 'react';

interface Evento {
  createdBy: string;
  type: 'in' | 'break' | 'out';
  createdAt: string;
  comment: string;
}

interface EventosHoyProps {
  eventos: Evento[];
}

const EventosHoy: FC<EventosHoyProps> = ({ eventos }) => {
  return (
    <div>
      <div className="text-xl text-gray-600 mb-4">Eventos de hoy</div>
      <div className="bg-white p-4 rounded shadow-md overflow-x-auto">
        <table className="min-w-full text-left text-gray-600">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">Autor</th>
              <th className="p-2">Tipo de evento</th>
              <th className="p-2">Fecha y hora</th>
              <th className="p-2">Comentarios</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((evento, index) => (
              <tr key={index} className="border-t">
                <td className="p-2">{evento.createdBy}</td>
                <td className="p-2">{evento.type}</td>
                <td className="p-2">{new Date(evento.createdAt).toTimeString()}</td>
                <td className="p-2">{evento.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventosHoy;