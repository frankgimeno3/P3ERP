'use client';

import React, { FC, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InterfazServicio } from '@/app/interfaces/interfaces';
import { ServicioService } from '@/app/service/ServicioService';

interface TablaServiciosProps {
  grupoFiltro: string;
  medioFiltro: string;
  publicacionFiltro: string;
  servicioFiltro: string;
}

const ITEMS_PER_PAGE = 25;

const TablaServicios: FC<TablaServiciosProps> = ({
  grupoFiltro,
  medioFiltro,
  publicacionFiltro,
  servicioFiltro,
}) => {
  const router = useRouter();
  const [servicios, setServicios] = useState<InterfazServicio[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(servicios.length / ITEMS_PER_PAGE));
  const currentServicios = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return servicios.slice(start, start + ITEMS_PER_PAGE);
  }, [page, servicios]);

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
      return;
    }
    router.push(href);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPage(1);

    ServicioService.getServicios({
      id_medio: grupoFiltro,
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
          concepto_factura: t.concepto_factura || '',
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
  }, [grupoFiltro, medioFiltro, publicacionFiltro, servicioFiltro]);

  const formatPrecio = (servicio: InterfazServicio) => {
    if (typeof servicio.precio_tarifa === 'number') {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(servicio.precio_tarifa);
    }
    return servicio.precio_servicio || '-';
  };

  return (
    <div className="px-5 text-xs">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-gray-600">
        <p>
          Mostrando {currentServicios.length} de {servicios.length} servicios
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Anterior
          </button>
          <span className="text-xs text-gray-500">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Siguiente
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-blue-950 text-white">
            <tr>
              <th className="w-24 p-2 text-left font-light">Código</th>
              <th className="w-36 p-2 text-left font-light">Grupo</th>
              <th className="w-36 p-2 text-left font-light">Medio</th>
              <th className="w-36 p-2 text-left font-light">Publicación</th>
              <th className="w-40 p-2 text-left font-light">Servicio</th>
              <th className="w-24 p-2 text-left font-light">Precio tarifa</th>
              <th className="w-24 p-2 text-left font-light">Deadline materiales</th>
              <th className="w-24 p-2 text-left font-light">Fecha publicación</th>
            </tr>
          </thead>
          <tbody>
            {currentServicios.map((servicio) => (
              <tr
                key={servicio.id_servicio}
                onClick={(e) => handleRowClick(e, `/dashboard/produccion/servicios/${servicio.id_servicio}`)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="w-24 border-b border-gray-200 p-2">{servicio.id_servicio}</td>
                <td className="w-36 border-b border-gray-200 p-2">{servicio.nombre_medio || servicio.id_medio || '-'}</td>
                <td className="w-36 border-b border-gray-200 p-2">{servicio.es.medio}</td>
                <td className="w-36 border-b border-gray-200 p-2">{servicio.es.publicacion}</td>
                <td className="w-40 border-b border-gray-200 p-2">{servicio.es.nombre}</td>
                <td className="w-24 border-b border-gray-200 p-2">{formatPrecio(servicio)}</td>
                <td className="w-24 border-b border-gray-200 p-2">{servicio.fecha_deadline_servicio}</td>
                <td className="w-24 border-b border-gray-200 p-2">{servicio.fecha_publicacion_servicio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p className="mt-4 text-center text-gray-500">Cargando servicios...</p>}
      {!loading && error && <p className="mt-4 text-center text-red-600">{error}</p>}
      {!loading && !error && servicios.length === 0 && (
        <p className="mt-4 text-center text-gray-500">No se encontraron servicios.</p>
      )}
    </div>
  );
};

export default TablaServicios;
