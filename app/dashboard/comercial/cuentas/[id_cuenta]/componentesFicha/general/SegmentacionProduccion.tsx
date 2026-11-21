'use client';

import { useState, type ReactNode } from 'react';
import ModuleTabs from '@/app/components/ModuleTabs';

const fields = {
  envio: [
    ['publicaciones', 'Publicaciones que recibe'], ['robinson', 'Robinson'],
    ['origen_precontacto', 'Origen de precontacto'], ['zona', 'Zona'],
    ['que_se_envia', 'Qué se envía'], ['origen_base_anexa', 'Origen base anexa'],
  ],
  actividad: [
    ['vidrio', 'Vidrio'], ['carpinteria', 'Carpintería'],
    ['proteccion_solar', 'Protección solar'], ['puertas_automatismos', 'Puertas y automatismos'],
    ['construccion_arquitectura', 'Construcción y arquitectura'], ['actividad_empresa', 'Actividad empresa'],
  ],
};

const tabs = [
  { value: 'general', label: 'General' },
  { value: 'envio', label: 'Segmentación por envío' },
  { value: 'actividad', label: 'Segmentación por actividad' },
];

export default function SegmentacionProduccion({ data, onChange, children }: {
  data: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
  children: ReactNode;
}) {
  const [tab, setTab] = useState('general');
  return <div className="rounded-lg border border-gray-200 bg-white">
    <ModuleTabs plain label="Información producción" value={tab} items={tabs} onChange={setTab} />
    <div className="p-4" hidden={tab !== 'general'}>{children}</div>
    {tab !== 'general' && <div className="grid gap-4 p-4 sm:grid-cols-2">
      {fields[tab as 'envio' | 'actividad'].map(([key, label]) => (
        <label key={key} className="block text-sm font-medium">
          {label}
          <input value={data[key] ?? ''} onChange={event => onChange({ ...data, [key]: event.target.value })}
            className="mt-1 block w-full rounded border border-gray-300 p-2 font-normal focus:border-blue-700" />
        </label>
      ))}
    </div>}
  </div>;
}
