'use client';

export default function TableColumnFilter({ label, value, onChange }: {
  label: string; value: string; onChange: (value: string) => void;
}) {
  return <details>
    <summary className="cursor-pointer rounded p-1 hover:bg-blue-100 hover:text-blue-950">{label}{value ? ' · Filtro activo' : ''}</summary>
    <input type="search" aria-label={`Filtrar ${label}`} value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full min-w-28 rounded border bg-white p-2 text-sm font-normal text-gray-900" />
  </details>;
}
