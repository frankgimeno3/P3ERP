'use client';

import React, { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InterfazServicio } from '@/app/interfaces/interfaces';
import { ServicioService } from '@/app/service/ServicioService';

interface TablaServiciosProps {
  medioFiltro: string;
  publicacionFiltro: string;
  servicioFiltro: string;
}

const TablaServicios: FC<TablaServiciosProps> = ({
  medioFiltro,
  publicacionFiltro,
  servicioFiltro,
}) => {
  const router = useRouter();
  const [servicios, setServicios] = useState<InterfazServicio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    ServicioService.getServicios({
      medio: medioFiltro,
      publicacion: publicacionFiltro,
      servicio: servicioFiltro,
    })
      .then((data) => {
        const serviciosMapeados: InterfazServicio[] = (Array.isArray(data) ? data : []).map((t: any) => ({
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
        }));

        setServicios(serviciosMapeados);
      })
      .catch((error) => {
        setError(error?.message || 'No se pudieron cargar los servicios.');
        setServicios([]);
      })
      .finally(() => setLoading(false));
  }, [medioFiltro, publicacionFiltro, servicioFiltro]);

  const formatPrecio = (servicio: InterfazServicio) => {
    if (typeof servicio.precio_tarifa === 'number') {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(servicio.precio_tarifa);
    }
    return servicio.precio_servicio || '-';
  };

  return (
    <div className="overflow-x-auto text-xs px-5">
      <table className="min-w-full">
        <thead className="bg-blue-950 text-white">
          <tr>
            <th className="text-left p-2 font-light w-24">Código</th>
            <th className="text-left p-2 font-light w-36">Grupo</th>
            <th className="text-left p-2 font-light w-36">Medio</th>
            <th className="text-left p-2 font-light w-36">Publicación</th>
            <th className="text-left p-2 font-light w-40">Servicio</th>
            <th className="text-left p-2 font-light w-24">Precio tarifa</th>
            <th className="text-left p-2 font-light w-24">Deadline materiales</th>
            <th className="text-left p-2 font-light w-24">Fecha publicación</th>
          </tr>
        </thead>
        <tbody>
          {servicios.map((servicio) => (
            <tr
              key={servicio.id_servicio}
              onClick={(e) => handleRowClick(e, `/dashboard/produccion/servicios/${servicio.id_servicio}`)}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <td className="p-2 border-b border-gray-200 w-24">{servicio.id_servicio}</td>
              <td className="p-2 border-b border-gray-200 w-36">{servicio.nombre_medio || servicio.id_medio || '-'}</td>
              <td className="p-2 border-b border-gray-200 w-36">{servicio.es.medio}</td>
              <td className="p-2 border-b border-gray-200 w-36">{servicio.es.publicacion}</td>
              <td className="p-2 border-b border-gray-200 w-40">{servicio.es.nombre}</td>
              <td className="p-2 border-b border-gray-200 w-24">{formatPrecio(servicio)}</td>
              <td className="p-2 border-b border-gray-200 w-24">{servicio.fecha_deadline_servicio}</td>
              <td className="p-2 border-b border-gray-200 w-24">{servicio.fecha_publicacion_servicio}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {loading && <p className="mt-4 text-center text-gray-500">Cargando servicios...</p>}
      {!loading && error && <p className="mt-4 text-center text-red-600">{error}</p>}
      {!loading && !error && servicios.length === 0 && (
        <p className="mt-4 text-center text-gray-500">No se encontraron servicios.</p>
      )}
    </div>
  );
};

export default TablaServicios;
