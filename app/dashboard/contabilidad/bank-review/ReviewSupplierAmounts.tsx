'use client';
import { VatToggle } from '../RecurringChargeForm';
import { money, type ReviewPhaseContext } from './ReviewPhaseContext';

export default function ReviewSupplierAmounts({ context }: { context: ReviewPhaseContext }) {
  const { phase, drafts, patch, expenseLines, calculation } = context;
  return <>{phase === 3 && expenseLines.filter(l => drafts[l.id_linea_banco].entityType === 'proveedor').map(l => { const d = drafts[l.id_linea_banco], c = calculation(l,d); return <section key={d.id} aria-label={`Importes del movimiento ${d.id}`} className="mb-4 space-y-3 rounded border p-4"><h3 className="font-semibold">Importes del movimiento {d.id}</h3><><VatToggle value={d.vat} onChange={v=>patch(d.id,{vat:v},true)} /><p>Total: {money(c.amount)} · Base imponible: {money(c.amount / (d.vat ? 1.21 : 1))}</p>{c.charge ? <><p>Previsto: {money(c.expected)} · Diferencia: {money(c.amount - c.expected)}</p>{c.amount > c.expected && <label className="flex cursor-pointer gap-2 rounded p-3 hover:bg-blue-50"><input className="cursor-pointer" type="checkbox" checked={d.increase} onChange={e => patch(d.id,{increase:e.target.checked},true)} />Actualizar el importe previsto de cada mes a {money(c.amount)} por subida de precios.</label>}</> : <p>Sin cargo previsto asociado.</p>}</></section>; })}</>;
}
