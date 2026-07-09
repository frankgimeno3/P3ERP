'use client';

import React, { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { ServicioService } from '@/app/service/ServicioService';

interface FiltrosServiciosProps {
  grupoFiltro: string;
  setGrupoFiltro: (value: string) => void;
  medioFiltro: string;
  setMedioFiltro: (value: string) => void;
  publicacionFiltro: string;
  setPublicacionFiltro: (value: string) => void;
  servicioFiltro: string;
  setServicioFiltro: (value: string) => void;
}

const grupos = [
  { value: '', label: 'Todos' },
  { value: 'revista', label: 'Revista' },
  { value: 'newsletter_personalizado', label: 'Newsletter personalizado' },
  { value: 'vidrioperfil_newsletter', label: 'Vidrioperfil newsletter' },
  { value: 'vidrioperfil_portal', label: 'Vidrioperfil portal' },
  { value: 'suscripcion', label: 'Suscripción' },
  { value: 'otros', label: 'Otros' },
];

const FiltrosServicios: FC<FiltrosServiciosProps> = ({
  grupoFiltro,
  setGrupoFiltro,
  medioFiltro,
  setMedioFiltro,
  publicacionFiltro,
  setPublicacionFiltro,
  servicioFiltro,
  setServicioFiltro,
}) => {
  const [medioOptions, setMedioOptions] = useState<string[]>([]);

  useEffect(() => {
    ServicioService.getServicios()
      .then((data) => {
        const values = Array.from(new Set((Array.isArray(data) ? data : [])
          .map((servicio: any) => servicio.medio_servicio_es || servicio.nombre_medio || "")
          .filter(Boolean)))
          .sort((a: any, b: any) => String(a).localeCompare(String(b), "es"));
        setMedioOptions(values as string[]);
      })
      .catch(() => setMedioOptions([]));
  }, []);

  return (
    <div className="mb-3 flex flex-col justify-between">
      <div className="flex flex-col justify-between gap-3 px-4 sm:flex-row">
        <h2 className="mb-4 text-lg font-semibold">Buscador de Servicios</h2>
        <div className="my-auto flex shrink-0 gap-2">
          <Link
            href="/dashboard/produccion/servicios/crear"
            className="inline-flex cursor-pointer whitespace-nowrap rounded-lg bg-blue-950 p-2 px-4 text-xs text-gray-100 shadow-xl hover:bg-blue-900"
          >
            Crear nuevo servicio
          </Link>
          <Link
            href="/dashboard/produccion/servicios/editor_tarifas"
            className="inline-flex cursor-pointer whitespace-nowrap rounded-lg bg-blue-950 p-2 px-4 text-xs text-gray-100 shadow-xl hover:bg-blue-900"
          >
            Editar Tarifas
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 p-5 text-xs">
        <div className="flex flex-col">
          <label className="text-xs font-medium">Grupo</label>
          <select
            value={grupoFiltro}
            onChange={(e) => setGrupoFiltro(e.target.value)}
            className="rounded border px-2 py-1"
          >
            {grupos.map((grupo) => (
              <option key={grupo.value || 'todos'} value={grupo.value}>
                {grupo.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-medium">Nombre del servicio</label>
          <input
            type="text"
            value={servicioFiltro}
            onChange={(e) => setServicioFiltro(e.target.value)}
            placeholder="Ej: Servicio A"
            className="rounded border px-2 py-1"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-medium">Código del servicio</label>
          <input
            type="text"
            value={servicioFiltro}
            onChange={(e) => setServicioFiltro(e.target.value)}
            placeholder="Ej: SRV001"
            className="rounded border px-2 py-1"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-medium">Medio</label>
          <select
            value={medioFiltro}
            onChange={(e) => setMedioFiltro(e.target.value)}
            className="rounded border px-2 py-1"
          >
            <option value="">Todos</option>
            {medioOptions.map((medio) => (
              <option key={medio} value={medio}>
                {medio}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-medium">Publicación</label>
          <input
            type="text"
            value={publicacionFiltro}
            onChange={(e) => setPublicacionFiltro(e.target.value)}
            placeholder="Ej: Campaña Julio"
            className="rounded border px-2 py-1"
          />
        </div>
      </div>
    </div>
  );
};

export default FiltrosServicios;
