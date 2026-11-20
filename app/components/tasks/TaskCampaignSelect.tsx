'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/app/apiClient';

export default function TaskCampaignSelect({ value, onChange, disabled, exclude = [] }: { value: string; onChange: (id: string) => void; disabled?: boolean; exclude?: string[] }) {
  const [rows, setRows] = useState<{ id: string; nombre: string }[]>();
  const [error, setError] = useState(false);
  useEffect(() => {
    const request = new AbortController();
    apiClient.get('/api/v1/comercial/campanas', { signal: request.signal })
      .then(({data}) => { if (!request.signal.aborted) setRows(data); })
      .catch(() => { if (!request.signal.aborted) setError(true); });
    return () => request.abort();
  }, []);
  return <label className="block text-sm">Campaña comercial
    <select value={value} onChange={event => onChange(event.target.value)} disabled={disabled || !rows}
      className="mt-1 block w-full rounded border bg-white p-2 enabled:cursor-pointer enabled:hover:border-blue-700 disabled:bg-gray-100">
      <option value="">Sin campaña</option>
      {value && !rows?.some(row => row.id === value) && <option value={value}>{value}</option>}
      {rows?.filter(row => !exclude.includes(row.id)).map(row => <option key={row.id} value={row.id}>{row.nombre}</option>)}
    </select>
    {error && <span className="block text-red-700">No se pudieron cargar las campañas.</span>}
  </label>;
}
