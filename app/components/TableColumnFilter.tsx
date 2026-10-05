'use client';

export default function TableColumnFilter({ label, value, onChange }: {
  label: string; value: string; onChange: (value: string) => void;
}) {
  return <label className="block text-xs font-extralight text-gray-600">
    <span className="mb-1 block">{label}</span>
    <input type="search" aria-label={`Filtrar ${label}`} value={value} onChange={event => onChange(event.target.value)} className="w-full min-w-28 rounded border bg-white p-2 text-sm font-normal text-gray-900" />
  </label>;
}
