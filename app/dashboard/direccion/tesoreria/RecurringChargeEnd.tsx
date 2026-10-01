'use client';
import { useState } from 'react';
export const endQuestion = '¿El cargo termina con el último recurrente dentro de los planificados?';
export default function RecurringChargeEnd({ charge, onSaved }: { charge: any; onSaved: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <div className="space-y-2"><label className="flex items-start gap-2 rounded p-2 hover:bg-blue-50"><input type="checkbox" className="mt-1 enabled:cursor-pointer disabled:cursor-not-allowed" checked={!!charge.termina_planificacion} disabled={busy} onChange={async event => {
    const checked = event.target.checked;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/v1/direccion/cargos-recurrentes/${charge.id_cargo_recurrente}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...charge, expectedSchedule: charge.programacion, expectedType: charge.tipo_programacion, expectedVersion: charge.updated_at, termina_planificacion: checked }) });
      const result = await response.json(); if (!response.ok) throw Error(result.message);
      onSaved();
    } catch (cause: any) { setError(cause.message || 'No se ha podido guardar.'); } finally { setBusy(false); }
  }} /><span>{endQuestion}</span></label><p className="text-sm text-gray-600">{charge.termina_planificacion ? 'No se ampliará al generar nuevos cargos. Los ya planificados se conservan.' : 'Se ampliará hasta dos años desde hoy al generar nuevos cargos.'}</p>{error && <p role="alert" className="text-red-700">{error}</p>}</div>;
}
