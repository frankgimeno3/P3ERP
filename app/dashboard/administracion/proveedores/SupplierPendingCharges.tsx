'use client';
import TableFilters from '@/app/components/TableFilters';
import { useState } from 'react';
import TableColumnFilter from '@/app/components/TableColumnFilter';

export function recurringSchedule(charge: any, rule: any) {
  return charge.tipo_programacion === 'fechas'
    ? `${rule.dia}/${rule.mes}${rule.anio ? `/${rule.anio}` : ''}`
    : `Cada ${rule.cada} ${rule.unidad}`;
}
const labels = ['Concepto', 'Importe', 'Estado', 'Fecha / periodicidad'];
export default function SupplierPendingCharges({ pending, recurring, onEdit }: {
  pending: any[]; recurring: any[]; onEdit: (id: string) => void;
}) {
  const [filters, setFilters] = useState<Record<number, string>>({});
  const money = (value: unknown) => `${Number(value || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;
  const rows = [
    ...pending.map(row => ({ key: `payment:${row.id_cargo_pendiente}`, chargeId: '', values: [row.concepto, money(row.importe_cargo), row.estado, row.fecha_cargo || 'Sin fecha'] })),
    ...recurring.flatMap(charge => (charge.planificado_hasta ? (charge.vencimientos || []).map((v:any)=>({...v.programacion.regla,...v,total_iva:v.importe})) : (charge.programacion || [])).map((rule: any, index: number) => ({
      key: `recurring:${charge.id_cargo_recurrente}:${index}`, chargeId: String(charge.id_cargo_recurrente),
      values: [rule.descripcion, money(rule.total_iva), 'Previsto recurrente', rule.fecha ? rule.fecha.split('-').reverse().join('/') : recurringSchedule(charge, rule)],
    }))),
  ].filter(row => labels.every((_, index) => String(row.values[index] || '').toLowerCase().includes((filters[index] || '').trim().toLowerCase())));
  return <div className="overflow-x-auto rounded bg-white shadow">
    <TableFilters>{labels.map((label, index) => <div key={label}><TableColumnFilter label={label} value={filters[index] || ''} onChange={value => setFilters(current => ({ ...current, [index]: value }))} /></div>)}</TableFilters><table className="min-w-full text-left"><thead className="bg-blue-950 text-white"><tr>{labels.map((label) => <th key={label} className="p-3 align-top">{label}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.key} className="border-b">{row.values.map((value: string, index: number) => <td key={index} className="p-3">{index === 0 && row.chargeId ? <button type="button" onClick={() => onEdit(row.chargeId)} className="cursor-pointer rounded p-1 text-left text-blue-950 underline hover:bg-blue-100" aria-label={`Editar ${value}`}>{value}</button> : value}</td>)}</tr>)}{!rows.length && <tr><td colSpan={4} className="p-8 text-center">No hay cargos que coincidan con los filtros.</td></tr>}</tbody>
    </table>
  </div>;
}
