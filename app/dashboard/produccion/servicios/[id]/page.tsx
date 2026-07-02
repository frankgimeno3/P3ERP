'use client';

import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import { useParams } from 'next/navigation';
import React, { FC, useEffect, useState } from 'react';
import { InterfazServicio } from '@/app/interfaces/interfaces';
import { ServicioService } from '@/app/service/ServicioService';

interface DetalleProps {}

const Detalle: FC<DetalleProps> = () => {
  const params = useParams();
  const productId = params?.id as string;
  const [servicio, setServicio] = useState<InterfazServicio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;

    setLoading(true);
    setError(null);

    ServicioService.getServicioById(productId)
      .then((t) => {
        setServicio({
          id_servicio: t.id_servicio,
          id_medio: t.id_medio || '',
          nombre_medio: t.nombre_medio || '',
          ano_servicio: t.ano_servicio || '',
          soporte_servicio: t.soporte_servicio || '',
          precio_servicio: t.precio_servicio || '',
          precio_tarifa: t.precio_tarifa,
          fecha_deadline_servicio: t.fecha_deadline_servicio || '',
          fecha_publicacion_servicio: t.fecha_publicacion_servicio || '',
          es: {
            medio: t.medio_servicio_es || '',
            edicion: t.edicion_servicio_es || '',
            publicacion: t.publicacion_servicio_es || '',
            nombre: t.nombre_servicio_es || '',
          },
          en: {
            medio: t.medio_servicio_en || '',
            edicion: t.edicion_servicio_en || '',
            publicacion: t.publicacion_servicio_en || '',
            nombre: t.nombre_servicio_en || '',
          },
        });
      })
      .catch((error) => {
        setError(error?.message || 'No se pudo cargar el servicio.');
        setServicio(null);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const formatPrecio = () => {
    if (typeof servicio?.precio_tarifa === 'number') {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(servicio.precio_tarifa);
    }
    return servicio?.precio_servicio || '-';
  };

  if (loading) {
    return (
      <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">
        <MiddleNav tituloprincipal="Resumen del servicio" />
        <div className="bg-white min-h-screen p-12 text-gray-600">Cargando servicio...</div>
      </div>
    );
  }

  if (error || !servicio) {
    return (
      <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">
        <MiddleNav tituloprincipal="Servicio no encontrado" />
        <div className="bg-white min-h-screen p-12 text-gray-600">
          <p>{error || `No se encontró un servicio con el código: ${productId}`}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-200 h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal="Resumen del servicio" />

      <div className="bg-white min-h-screen p-12 text-gray-600">
        <div className="rounded-lg shadow-xl bg-white">
          <table className="w-full text-left rounded-lg overflow-hidden">
            <thead className="bg-blue-950 text-white">
              <tr>
                <th className="p-3">Nombre del servicio</th>
                <th className="p-3">Código</th>
                <th className="p-3">Grupo</th>
                <th className="p-3">Medio</th>
                <th className="p-3">Publicación</th>
                <th className="p-3">Precio tarifa</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3">{servicio.es.nombre}</td>
                <td className="p-3">{servicio.id_servicio}</td>
                <td className="p-3">{servicio.nombre_medio || servicio.id_medio || '-'}</td>
                <td className="p-3">{servicio.es.medio}</td>
                <td className="p-3">{servicio.es.publicacion}</td>
                <td className="p-3">{formatPrecio()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded-lg shadow-xl bg-white">
          <h3 className="p-3 text-md font-semibold bg-blue-950 w-full text-white rounded-t-lg">
            Detalle del servicio
          </h3>
          <div className="p-3 text-sm">
            <p className="p-1"><strong>Edición:</strong> {servicio.es.edicion}</p>
            <p className="p-1"><strong>Año:</strong> {servicio.ano_servicio}</p>
            <p className="p-1"><strong>Deadline materiales:</strong> {servicio.fecha_deadline_servicio}</p>
            <p className="p-1"><strong>Fecha de publicación:</strong> {servicio.fecha_publicacion_servicio}</p>
            <p className="p-1"><strong>Soporte:</strong> {servicio.soporte_servicio}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Detalle;
