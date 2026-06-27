'use client';

import React, { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ServiciosContents from '../../../../contents/ServiciosContents.json';
import { InterfazServicio } from '@/app/interfaces/interfaces';

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
  const [Servicios, setServicios] = useState<InterfazServicio[]>([]);

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  useEffect(() => {
    const ServiciosMapeadas: InterfazServicio[] = ServiciosContents.map((t) => ({
      id_servicio: t.id_servicio,
      ano_servicio: t.ano_servicio,
      soporte_servicio: t.soporte_servicio,
      precio_servicio: t.precio_servicio,
      fecha_deadline_servicio: t.fecha_deadline_servicio,
      fecha_publicacion_servicio: t.fecha_publicacion_servicio,
      es: {
        medio: t.medio_servicio_es,
        edicion: t.edicion_servicio_es,
        publicacion: t.publicacion_servicio_es,
        nombre: t.nombre_servicio_es,
      },
      en: {
        medio: t.medio_servicio_en,
        edicion: t.edicion_servicio_en,
        publicacion: t.publicacion_servicio_en,
        nombre: t.nombre_servicio_en,
      },
    }));

    setServicios(ServiciosMapeadas);
  }, []);

  const ServiciosFiltrados = Servicios.filter((s) => {
    const coincideServicio =
      servicioFiltro === '' ||
      s.es.nombre.toLowerCase().includes(servicioFiltro.toLowerCase()) ||
      s.id_servicio.toLowerCase().includes(servicioFiltro.toLowerCase());

    const coincideMedio =
      medioFiltro === '' ||
      s.es.medio.toLowerCase().includes(medioFiltro.toLowerCase());

    const coincidePublicacion =
      publicacionFiltro === '' ||
      s.es.publicacion.toLowerCase().includes(publicacionFiltro.toLowerCase());

    return coincideServicio && coincideMedio && coincidePublicacion;
  });

  return (
    <div className='overflow-x-auto text-xs px-5'>
      <table className='min-w-full'>
        <thead className='bg-blue-950 text-white'>
          <tr>
            <th className='text-left p-2 font-light w-24'>Código</th>
            <th className='text-left p-2 font-light w-36'>Medio</th>
            <th className='text-left p-2 font-light w-12'>Publicación</th>
            <th className='text-left p-2 font-light w-24'>Servicio</th>
            <th className='text-left p-2 font-light w-24'>Precio tarifa</th>
            <th className='text-left p-2 font-light w-24'>Deadline Materiales</th>
            <th className='text-left p-2 font-light w-24'>Fecha Publicación</th>
          </tr>
        </thead>
        <tbody>
          {ServiciosFiltrados.map((servicio) => (
            <tr
              key={servicio.id_servicio}
              onClick={(e) => handleRowClick(e, `/dashboard/produccion/servicios/${servicio.id_servicio}`)}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <td className='p-2 border-b border-gray-200 w-24'>
                {servicio.id_servicio}
              </td>
              <td className='p-2 border-b border-gray-200 w-36'>
                {servicio.es.medio}
              </td>
              <td className='p-2 border-b border-gray-200 w-12'>
                {servicio.es.publicacion}
              </td>
              <td className='p-2 border-b border-gray-200 w-24'>
                {servicio.es.nombre}
              </td>
              <td className='p-2 border-b border-gray-200 w-24'>
                {servicio.precio_servicio}
              </td>
              <td className='p-2 border-b border-gray-200 w-24'>
                {servicio.fecha_deadline_servicio}
              </td>
              <td className='p-2 border-b border-gray-200 w-24'>
                {servicio.fecha_publicacion_servicio}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {ServiciosFiltrados.length === 0 && (
        <p className='mt-4 text-center text-gray-500'>
          No se encontraron Servicios.
        </p>
      )}
    </div>
  );
};

export default TablaServicios;
