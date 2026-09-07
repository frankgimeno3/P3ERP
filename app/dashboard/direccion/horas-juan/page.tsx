'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HorasJuanService } from '@/app/service/HorasJuanService';
import { euros, fechaEs, InformeJuan, InformeTipo, MESES } from './types';

type DateParts = { day: string; month: string; year: string };
const now = new Date();
const emptyDate = (): DateParts => ({ day: String(now.getDate()).padStart(2, '0'), month: String(now.getMonth() + 1).padStart(2, '0'), year: String(now.getFullYear()) });
const inputClass = 'mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition hover:border-blue-900 focus:border-blue-950 focus:ring-1 focus:ring-blue-950';
const buttonClass = 'cursor-pointer rounded px-4 py-2 text-sm font-medium transition hover:shadow-sm';

export default function HorasJuanPage() {
  const router = useRouter();
  const [rows, setRows] = useState<InformeJuan[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [open, setOpen] = useState(false), [step, setStep] = useState(1), [saving, setSaving] = useState(false);
  const [mes, setMes] = useState(now.getMonth() + 1), [anio, setAnio] = useState(now.getFullYear()), [tipo, setTipo] = useState<InformeTipo>('normal');
  const [horas, setHoras] = useState(''), [minutos, setMinutos] = useState(''), [anticipo, setAnticipo] = useState(''), [fecha, setFecha] = useState<DateParts>(emptyDate());
  const [ajuste, setAjuste] = useState('0'), [motivoAjuste, setMotivoAjuste] = useState('');
  const [suggestion, setSuggestion] = useState<{ importe_ajuste: number; importe_anticipado: number; origenes: InformeJuan[] }>({ importe_ajuste: 0, importe_anticipado: 0, origenes: [] });
  const [tab, setTab] = useState<'informes' | 'adeudos'>('informes'), [debts, setDebts] = useState<InformeJuan[]>([]), [debtsLoading, setDebtsLoading] = useState(false);

  const load = useCallback(async () => { try { setLoading(true); setError(''); setRows(await HorasJuanService.getAll()); } catch (e: any) { setError(e.message || 'No se pudieron cargar los informes'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const close = useCallback(() => { if (!saving) { setOpen(false); setStep(1); setHoras(''); setMinutos(''); setAnticipo(''); setAjuste('0'); setMotivoAjuste(''); setSuggestion({ importe_ajuste: 0, importe_anticipado: 0, origenes: [] }); } }, [saving]);
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [close, open]);

  const decimalHours = useMemo(() => Math.round(((Number(horas) || 0) + (Number(minutos) || 0) / 60) * 100) / 100, [horas, minutos]);
  const generated = Math.round(decimalHours * 15 * 100) / 100;
  const finalAmount = tipo === 'normal' ? Math.max(0, Math.round((generated + (Number(ajuste) || 0)) * 100) / 100) : tipo === 'anticipo' ? Number(anticipo) || 0 : null;
  const validDate = /^\d{2}$/.test(fecha.day) && /^\d{2}$/.test(fecha.month) && /^\d{4}$/.test(fecha.year);

  const advance = async () => {
    if (step === 1) { setError(''); setStep(tipo === 'anticipo' ? 3 : 2); return; }
    if (step === 2) {
      if (!Number.isInteger(Number(horas)) || Number(horas) < 0 || !Number.isInteger(Number(minutos)) || Number(minutos) < 0 || Number(minutos) > 59 || decimalHours <= 0) { setError('Introduce horas enteras y minutos entre 0 y 59.'); return; }
      try { setError(''); const nextSuggestion = await HorasJuanService.suggestion({ nombre: 'Juan', mes, anio, tipo }); setSuggestion(nextSuggestion); setAjuste(String(nextSuggestion.importe_ajuste || 0)); setStep(3); } catch (e: any) { setError(e.message || 'No se pudo calcular el ajuste'); }
    }
  };
  const save = async () => {
    if (!validDate) { setError('Completa la fecha con dd, mm y yyyy.'); return; }
    if (tipo === 'anticipo' && (!(Number(anticipo) > 0))) { setError('Introduce el importe del anticipo.'); return; }
    try {
      setSaving(true); setError('');
      const created = await HorasJuanService.create({ nombre: 'Juan', mes, anio, tipo, horas_enteras: Number(horas), minutos: Number(minutos), importe_anticipo: Number(anticipo), importe_ajuste: Number(ajuste) || 0, motivo_ajuste: motivoAjuste, fecha: `${fecha.year}-${fecha.month}-${fecha.day}` });
      close(); await load(); router.push(`/dashboard/direccion/horas-juan/${created.id_horas_juan}`);
    } catch (e: any) { setError(e.message || 'No se pudo crear el informe'); } finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-gray-100 px-12 py-8 text-gray-800">
    <div className="mb-6 flex items-start justify-between">
      <div><h1 className="text-2xl font-semibold text-gray-700">Horas Juan</h1><p className="mt-1 text-sm text-gray-500">Informes, anticipos y compensaciones a 15 € por hora</p></div>
      <button type="button" onClick={() => { setError(''); setFecha(emptyDate()); setOpen(true); }} className={`${buttonClass} bg-blue-950 text-white hover:bg-blue-900`}>Crear informe</button>
    </div>
    {error && !open && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mb-4 flex border-b border-slate-300"><button type="button" onClick={() => setTab('informes')} className={`cursor-pointer px-6 py-3 text-sm font-semibold transition hover:bg-blue-100 ${tab === 'informes' ? 'border-b-2 border-blue-950 bg-white text-blue-950' : 'bg-slate-200 text-slate-700'}`}>Informes</button><button type="button" onClick={async () => { setTab('adeudos'); setDebtsLoading(true); setError(''); try { setDebts(await HorasJuanService.getDebts()); } catch (e: any) { setError(e.message || 'No se pudieron cargar los adeudos'); } finally { setDebtsLoading(false); } }} className={`cursor-pointer px-6 py-3 text-sm font-semibold transition hover:bg-blue-100 ${tab === 'adeudos' ? 'border-b-2 border-blue-950 bg-white text-blue-950' : 'bg-slate-200 text-slate-700'}`}>Adeudos</button></div>
    {tab === 'informes' ? <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm"><thead className="bg-blue-950 text-left text-white"><tr><th className="px-4 py-3">Periodo</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Horas</th><th className="px-4 py-3 text-right">Generado</th><th className="px-4 py-3 text-right">Ajuste</th><th className="px-4 py-3 text-right">Importe</th><th className="px-4 py-3">Fecha</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Cargando…</td></tr> : rows.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Todavía no hay informes.</td></tr> : rows.map(row => <tr key={row.id_horas_juan} onClick={() => router.push(`/dashboard/direccion/horas-juan/${row.id_horas_juan}`)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') router.push(`/dashboard/direccion/horas-juan/${row.id_horas_juan}`); }} className="cursor-pointer border-t border-gray-100 transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"><td className="px-4 py-3 font-medium">{MESES[row.mes - 1]} {row.anio}</td><td className="px-4 py-3">{row.nombre}</td><td className="px-4 py-3 capitalize">{row.tipo}</td><td className="px-4 py-3 text-right">{row.horas === null ? '—' : row.horas.toFixed(2)}</td><td className="px-4 py-3 text-right">{euros(row.importe_generado)}</td><td className={`px-4 py-3 text-right ${row.importe_ajuste < 0 ? 'text-red-700' : row.importe_ajuste > 0 ? 'text-green-700' : ''}`}>{euros(row.importe_ajuste)}</td><td className="px-4 py-3 text-right font-semibold">{row.tipo === 'informativa' ? 'Informativo' : euros(row.importe_pagar)}</td><td className="px-4 py-3">{fechaEs(row.fecha)}</td></tr>)}</tbody>
      </table>
    </div> : <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"><table className="w-full border-collapse text-sm"><thead className="bg-blue-950 text-left text-white"><tr><th className="px-4 py-3">Año</th><th className="px-4 py-3">Mes</th><th className="px-4 py-3">Deudor</th><th className="px-4 py-3 text-right">Importe</th><th className="px-4 py-3">Informe</th></tr></thead><tbody>{debtsLoading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-600">Cargando…</td></tr> : debts.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-600">No hay adeudos pendientes.</td></tr> : debts.map(debt => <tr key={debt.id_horas_juan} onClick={() => router.push(`/dashboard/direccion/horas-juan/${debt.id_horas_juan}`)} className="cursor-pointer border-t border-slate-200 transition hover:bg-blue-50"><td className="px-4 py-3">{debt.anio}</td><td className="px-4 py-3">{MESES[debt.mes - 1]}</td><td className="px-4 py-3">{debt.deudor}</td><td className="px-4 py-3 text-right font-semibold">{euros(debt.importe_deuda || 0)}</td><td className="px-4 py-3 text-blue-800 underline">Informe #{debt.id_horas_juan}</td></tr>)}</tbody></table></div>}

    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Crear informe</h2><p className="text-xs text-gray-500">Paso {step} de 3</p></div><button type="button" onClick={close} disabled={saving} aria-label="Cerrar" className="cursor-pointer text-2xl text-gray-500 transition hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40">×</button></div>
      {error && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {step === 1 && <div className="space-y-4"><label className="block text-sm font-medium">Mes<select value={mes} onChange={e => setMes(Number(e.target.value))} className={`${inputClass} cursor-pointer`}>{MESES.map((m,i) => <option key={m} value={i+1}>{m}</option>)}</select></label><label className="block text-sm font-medium">Año<input inputMode="numeric" value={anio} onChange={e => setAnio(Number(e.target.value.replace(/\D/g,'').slice(0,4)))} className={inputClass}/></label><label className="block text-sm font-medium">Tipo<select value={tipo} onChange={e => setTipo(e.target.value as InformeTipo)} className={`${inputClass} cursor-pointer`}><option value="normal">Normal</option><option value="anticipo">Anticipo</option><option value="informativa">Informativa</option></select></label><p className="rounded bg-gray-50 p-3 text-sm text-gray-600">{tipo === 'normal' ? 'Cierre con horas reales; aplicará anticipos del mes y ajustes informativos pendientes.' : tipo === 'anticipo' ? 'Pago anticipado sin horas; se cuadrará en un cierre o informe posterior.' : 'Cuadra las horas reales contra los anticipos del mes sin generar un recibí.'}</p></div>}
      {step === 2 && <div><p className="mb-4 text-sm text-gray-600">Introduce el tiempo real. Los minutos se convertirán a decimal antes de valorarlo.</p><div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Horas<input inputMode="numeric" value={horas} onChange={e => setHoras(e.target.value.replace(/\D/g,''))} className={inputClass}/></label><label className="text-sm font-medium">Minutos<input inputMode="numeric" value={minutos} onChange={e => setMinutos(e.target.value.replace(/\D/g,'').slice(0,2))} className={inputClass}/></label></div><div className="mt-5 rounded border border-blue-100 bg-blue-50 p-4 text-sm"><p>{horas || 0} h {minutos || 0} min = <strong>{decimalHours.toFixed(2)} horas</strong></p><p className="mt-1">{decimalHours.toFixed(2)} × 15 € = <strong>{euros(generated)}</strong></p></div></div>}
      {step === 3 && <div className="space-y-4">{tipo === 'anticipo' ? <label className="block text-sm font-medium">Importe anticipado (€)<input inputMode="decimal" value={anticipo} onChange={e => setAnticipo(e.target.value.replace(',','.').replace(/[^\d.]/g,''))} className={inputClass}/></label> : <div className="rounded border border-blue-100 bg-blue-50 p-4 text-sm"><p>Importe generado: <strong>{euros(generated)}</strong></p>{tipo === 'informativa' ? <><p className="mt-1">Anticipado este mes: <strong>{euros(suggestion.importe_anticipado)}</strong></p><p className="mt-1">Diferencia pendiente: <strong>{euros(generated - suggestion.importe_anticipado)}</strong></p></> : <><label className="mt-3 block font-medium">Importes anteriores a compensar (€)<input inputMode="decimal" value={ajuste} onChange={e => setAjuste(e.target.value.replace(',','.').replace(/[^\d.-]/g,''))} className={inputClass}/></label><p className="mt-1 text-xs text-slate-600">Positivo: adeudado a Juan. Negativo: adeudado por Juan.</p>{Number(ajuste) !== 0 && <label className="mt-3 block font-medium">Motivo<input value={motivoAjuste} onChange={e => setMotivoAjuste(e.target.value)} maxLength={500} className={inputClass}/></label>}<p className="mt-3">Total a entregar: <strong>{euros(finalAmount)}</strong></p></>}{suggestion.origenes.length === 0 && <p className="mt-2 text-gray-500">No se detectan anticipos ni ajustes pendientes aplicables. Puedes modificar manualmente el importe.</p>}</div>}
        <div><span className="text-sm font-medium">{tipo === 'informativa' ? 'Fecha del documento' : 'Fecha del recibí'}</span><div className="mt-1 flex gap-2"><input aria-label="Día" placeholder="dd" value={fecha.day} onChange={e => setFecha(v => ({...v,day:e.target.value.replace(/\D/g,'').slice(0,2)}))} className="w-16 rounded border p-2"/><input aria-label="Mes" placeholder="mm" value={fecha.month} onChange={e => setFecha(v => ({...v,month:e.target.value.replace(/\D/g,'').slice(0,2)}))} className="w-16 rounded border p-2"/><input aria-label="Año" placeholder="yyyy" value={fecha.year} onChange={e => setFecha(v => ({...v,year:e.target.value.replace(/\D/g,'').slice(0,4)}))} className="w-24 rounded border p-2"/></div></div>
      </div>}
      <div className="mt-6 flex justify-between"><button type="button" onClick={() => step === 1 ? close() : setStep(step === 3 && tipo === 'anticipo' ? 1 : step - 1)} className={`${buttonClass} border border-gray-300 hover:bg-gray-50`}>{step === 1 ? 'Cancelar' : 'Volver'}</button>{step < 3 ? <button type="button" onClick={advance} className={`${buttonClass} bg-blue-950 text-white hover:bg-blue-900`}>Continuar</button> : <button type="button" onClick={save} disabled={saving} className={`${buttonClass} bg-blue-950 text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-gray-400`}>{saving ? 'Creando…' : 'Crear informe'}</button>}</div>
    </div></div>}
  </div>;
}
