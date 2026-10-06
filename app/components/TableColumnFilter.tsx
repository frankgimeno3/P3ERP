'use client';
import TableFilterInput from './TableFilterInput';

export default function TableColumnFilter({ label, value, onChange }: {
  label: string; value: string; onChange: (value: string) => void;
}) {
  return <label className="block text-xs font-extralight text-gray-600">
    <span className="mb-1 block">{label}</span>
    <TableFilterInput label={label} value={value} onChange={onChange} className="w-full rounded border bg-white p-2 text-sm font-normal text-gray-900" />
  </label>;
}
