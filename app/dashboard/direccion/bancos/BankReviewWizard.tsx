'use client';
import SearchableSelect from "@/app/components/SearchableSelect";
import { useEffect, useState } from 'react';
import RecurringChargeForm, { newCharge, reviewButton as button, VatToggle } from './RecurringChargeForm';

const money = (v: any) => Number(v || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const monthIndex = (date: string) => {
  const parts = String(date || '').split('/');
  return parts.length === 3 ? Number(parts[2]) * 12 + Number(parts[1]) - 1 : NaN;
};
const normalize = (v: any) => String(v || '').trim().toLocaleLowerCase('es');
const input = 'w-full rounded border bg-white p-2';
const select = `${input} enabled:cursor-pointer enabled:hover:border-blue-950 disabled:cursor-not-allowed disabled:bg-gray-100`;
type Props = { lines: any[]; all: any[]; mode?: 'review' | 'assign' | 'charge'; onSaved: () => void; onClose: () => void; modal?: boolean; initialEmployeeId?: string };
export default function BankReviewWizard({ lines, all, mode = 'review', onSaved, onClose, modal = false, initialEmployeeId }: Props) {
  const [phase, setPhase] = useState(1), [error, setError] = useState(''), [saving, setSaving] = useState(false), [loading, setLoading] = useState(true), [ready, setReady] = useState(false);
  const [data, setData] = useState<any>({ providers: [], clients: [], employees: [], charges: [], payrolls: [], advances: [], orders: [], forecasts: [] });
  const [drafts, setDrafts] = useState<any>(() => Object.fromEntries(lines.map(l => [l.id_linea_banco, {
    id: l.id_linea_banco, version: l.updated_at, entityType: initialEmployeeId || l.id_agente ? 'nomina' : l.id_cuenta || Number(l.importe) > 0 ? 'cliente' : 'proveedor', entityId: mode === 'assign' && lines.length > 1 ? '' : initialEmployeeId || l.id_agente || l.id_cuenta || l.id_proveedor || '',
    payrollKind: l.nomina_revision?.decision && ['completa','anticipo','adicional'].includes(l.nomina_revision.decision) ? l.nomina_revision.decision : '', chargeId: l.id_cargo_recurrente ? String(l.id_cargo_recurrente) : '', paymentId: l.id_pago || '', payrollId: '', month: String(l.nomina_revision?.mes || String(l.fecha_valor || '').split('/')[1] || ''), year: String(l.nomina_revision?.anio || String(l.fecha_valor || '').split('/')[2] || ''), adjustment: '', increase: false, vat: true, ruleIndex: 0, create: false, chargeDraft: newCharge(), resolution: '', orderId: l.id_orden || ''
  }])));
  const common = mode === 'assign' && lines.length > 1;
  const patch = (id: string, value: any) => setDrafts((current: any) => Object.fromEntries(Object.entries(current).map(([key,d]:any) => {
    if (key !== id && !(common && (phase === 2 || phase === 3) && !('resolution' in value && Object.keys(value).length === 1))) return [key,d];
    return [key,{...d,...('entityId' in value || 'entityType' in value ? {paymentId:'',orderId:'',payrollId:'',ruleIndex:0} : {}),...(value.chargeId || value.create ? {paymentId:''} : {}),...value}];
  })));
  useEffect(() => {
    const controller = new AbortController();
    const urls = ['/api/v1/admin/proveedores','/api/v1/comercial/cuentas','/api/v1/direccion/laboral/empleados','/api/v1/direccion/cargos-recurrentes','/api/v1/direccion/laboral/nominas','/api/v1/direccion/laboral/anticipos','/api/v1/admin/control-administrativo/ordenes','/api/v1/direccion/prevision-gastos'];
    Promise.all(urls.map(url => fetch(url, { signal: controller.signal, cache: 'no-store' }).then(async r => { const d = await r.json(); if (!r.ok || !Array.isArray(d)) throw new Error(d.message || 'No se pudieron cargar los datos de revisión.'); return d; })))
      .then(([providers, clients, employees, charges, payrolls, advances, orders, forecasts]) => {setData({ providers, clients, employees, charges, payrolls, advances, orders, forecasts });setReady(true);})
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  const entities = (type: string) => (type === 'proveedor' ? data.providers : type === 'nomina' ? data.employees : data.clients).map((r: any) => ({ id: r.id_proveedor || r.id_agente || r.id_cuenta, name: r.nombre_proveedor || r.nombre || r.nombre_empresa || r.nombre_fiscal || r.nombre_completo_agente || r.id_agente }));
  const entityName = (d: any) => entities(d.entityType).find((e: any) => e.id === d.entityId)?.name || d.entityId;
  const owners = (l:any) => [l,data.charges.find((c:any)=>String(c.id_cargo_recurrente)===String(l.id_cargo_recurrente)),data.forecasts.find((p:any)=>p.id_pago===l.id_pago),...data.payrolls.concat(data.advances).filter((p:any)=>p.id_transferencia===l.id_linea_banco).map((p:any)=>({id_agente:p.id_empleado}))].filter(Boolean);
  const conflict = (l: any, d: any) => owners(l).some(owner=>['id_proveedor','id_cuenta','id_agente'].some(k => owner[k] && (k !== ({ proveedor:'id_proveedor', cliente:'id_cuenta', nomina:'id_agente' } as any)[d.entityType] || owner[k] !== d.entityId)));
  const previousOwners = (l:any) => [...new Set(owners(l).flatMap(o=>['id_proveedor','id_cuenta','id_agente'].map(k=>o[k]).filter(Boolean)))].join(', ');
  const mixed = mode === 'review' && lines.some(l => l.estado_revision);
  const invalidCharge = mode === 'charge' && lines.some(l => Number(l.importe) >= 0 || (!l.id_proveedor && !l.id_agente));
  const active = lines.filter(l => drafts[l.id_linea_banco].resolution !== 'skip');
  const charges = (d: any) => data.charges.filter((c: any) => d.entityType === 'nomina' ? c.tipo_cargo === 'nomina' && c.id_agente === d.entityId : c.tipo_cargo !== 'nomina' && c.id_proveedor === d.entityId);
  const calculation = (l: any, d: any) => {
    const charge = d.create ? d.chargeDraft : charges(d).find((c: any) => String(c.id_cargo_recurrente) === d.chargeId);
    const payroll = data.payrolls.find((p: any) => p.id_empleado === d.entityId && Number(p.anio) === Number(d.year) && Number(p.mes) === Number(d.month));
    const pendingAdvances = data.advances.filter((a:any)=>a.id_empleado===d.entityId && Number(a.anio)===Number(d.year) && Number(a.mes)===Number(d.month) && a.estado!=='pagado');
    const advances = data.advances.filter((a: any) => a.id_empleado === d.entityId && Number(a.anio) === Number(d.year) && Number(a.mes) === Number(d.month) && a.estado === 'pagado' && a.id_transferencia !== l.id_linea_banco);
    // Include advances being confirmed in this same transaction, before the full payroll.
    if (mode === 'review') for (const other of active) {
      const pending = drafts[other.id_linea_banco];
      if (other.id_linea_banco !== l.id_linea_banco && pending.entityType === 'nomina' && pending.payrollKind === 'anticipo' && pending.entityId === d.entityId && Number(pending.month) === Number(d.month) && Number(pending.year) === Number(d.year) && (d.payrollKind !== 'anticipo' || other.id_linea_banco < l.id_linea_banco) && !data.advances.some((a:any)=>a.id_transferencia===other.id_linea_banco)) advances.push({id:`Selección: ${other.id_linea_banco}`,importe_neto:Math.abs(Number(other.importe))});
    }
    const paid = advances.reduce((n: number, a: any) => n + Math.round(Number(a.importe_neto) * 100), 0) / 100;
    const priorAdditional = payroll?.id_transferencia === l.id_linea_banco && d.payrollKind === 'adicional' && l.nomina_revision?.decision === 'adicional';
    const expected = priorAdditional ? Number(l.nomina_revision.importe_previsto) : d.entityType === 'nomina' && payroll ? Number(payroll.importe_neto) : Number(charge?.programacion?.[d.ruleIndex]?.total_iva || 0);
    const amount = Math.abs(Number(l.importe)), difference = Math.round((amount - expected + paid) * 100) / 100;
    return { charge, payroll, advances, pendingAdvances, paid, expected, amount, difference };
  };
  const preparedCharge = (d: any) => ({ ...d.chargeDraft, programacion: d.chargeDraft.programacion.map((r: any) => ({ ...r, base_imponible: d.entityType === 'nomina' ? 0 : Math.round(Number(r.total_iva) / (d.vat ? 1.21 : 1) * 100) / 100 })) });
  const validatePhase = () => {
    if (mixed) return 'No puedes revisar una selección con registros ya revisados. Desmárcalos y vuelve a abrir el proceso.';
    if (invalidCharge) return 'Asigna primero todos los cargos a un proveedor o una nómina. Los ingresos no admiten cargos previstos.';
    if (phase >= 2) {
      if (!active.length) return 'No quedan líneas seleccionadas.';
      for (const l of active) {
        const d = drafts[l.id_linea_banco], c = calculation(l, d);
        if (!d.entityId) return `Selecciona el destinatario de ${l.id_linea_banco}.`;
        if (conflict(l, d) && d.resolution !== 'overwrite') return `Elige omitir o sobrescribir ${l.id_linea_banco}.`;
        if (d.entityType === 'nomina' && Number(l.importe) >= 0) return 'Solo los cargos pueden ser nóminas.';
        if (mode === 'review' && d.entityType === 'nomina' && !d.payrollKind) return 'Elige el tipo de nómina antes de continuar.';
        if (phase >= 3 && (mode === 'charge' || mode === 'review' && d.entityType === 'nomina') && !c.charge) return 'Selecciona o crea el cargo previsto.';
        if (phase >= 3 && d.create && d.chargeDraft.programacion.some((r: any) => !(Number(r.total_iva) > 0))) return 'Completa los importes del cargo previsto.';
        if (phase >= 3 && mode === 'review' && d.entityType === 'nomina' && (!d.month || !d.year || !c.expected)) return 'Selecciona la nómina y el periodo.';
        if (phase >= 3 && mode === 'review' && d.entityType === 'nomina') {
          const existingAdvance = data.advances.some((a:any)=>a.id_transferencia===l.id_linea_banco);
          if (c.payroll?.estado === 'pagado' && c.payroll.id_transferencia !== l.id_linea_banco && !existingAdvance) return 'Esta nómina ya está pagada. Selecciona una nómina pendiente antes de continuar.';
          if (!Number.isInteger(Number(d.month)) || Number(d.month)<1 || Number(d.month)>12 || !Number.isInteger(Number(d.year)) || Number(d.year)<2000 || Number(d.year)>2100) return 'Selecciona un mes y año válidos para la nómina.';
        }
        if (phase >= 4 && mode === 'review' && d.entityType === 'nomina') {
          if (d.payrollKind === 'anticipo' && (Math.round(Number(d.adjustment) * 100) !== Math.round(c.amount * 100) || c.paid + c.amount > c.expected)) return 'El anticipo debe coincidir con el cargo y no superar el neto pendiente.';
          if (d.payrollKind === 'adicional' && (c.difference <= 0 || Math.round(Number(d.adjustment) * 100) !== Math.round(c.difference * 100))) return 'El importe adicional debe cuadrar con el movimiento.';
          if (d.payrollKind === 'completa' && Math.abs(c.difference) > 0.005 && !(d.increase && c.paid === 0 && !c.pendingAdvances.length && c.difference > 0)) return 'La nómina menos anticipos no coincide. Revisa el tipo o confirma la subida de la previsión.';
        }
      }
    }
    return '';
  };
  const next = () => { const message = validatePhase(); setError(message); if (!message) setPhase(p => p + 1); };
  const save = async () => {
    const message = validatePhase(); if (message) { setError(message); return; }
    setSaving(true); setError('');
    try {
      const items = lines.map(l => { const d = drafts[l.id_linea_banco], c = calculation(l, d); return { ...d, newCharge: d.create ? preparedCharge(d) : undefined, expectedSchedule: c.charge?.programacion, expectedPayroll: c.expected, expectedAdvances: c.paid, payrollId: c.payroll?.id }; });
      const r = await fetch('/api/v1/direccion/bancos/revision', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'workflow', mode, ids:lines.map(l => l.id_linea_banco), items }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.message); onSaved();
    } catch (e: any) { setError(e.message || 'No se pudo guardar.'); } finally { setSaving(false); }
  };
  const titles = ['Duplicados y avisos','Asignado a','Cargo previsto / nómina prevista','Importes, anticipos y compensaciones','Revisión final'];
  const content = <section role={modal ? 'dialog' : undefined} aria-modal={modal || undefined} aria-label="Revisión de movimientos" className="w-full rounded-xl bg-white p-6 text-slate-900 shadow-xl">
    <header className="mb-4 flex justify-between gap-4"><h1 className="text-xl font-semibold">{mode === 'review' ? 'Revisar movimientos' : mode === 'charge' ? 'Asignar a un cargo previsto' : 'Asignación común'} · {lines.length} registro(s)</h1><button type="button" aria-label="Cerrar" className="cursor-pointer rounded px-3 text-2xl hover:bg-gray-100" onClick={onClose}>×</button></header>
    {!(common && (phase === 2 || phase === 3)) && <div className="mb-4 max-h-40 overflow-auto rounded bg-gray-50 p-3 text-sm">{lines.map(l=><p key={l.id_linea_banco}>{l.id_linea_banco} · {l.fecha_valor} · {money(l.importe)} · {l.concepto}</p>)}</div>}
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="Fases">{titles.map((t, i) => <button key={t} type="button" disabled={i + 1 > phase || saving} onClick={() => { setPhase(i + 1); setError(''); }} className={`${button} ${phase === i + 1 ? 'bg-blue-950 text-white' : ''}`}>Fase {i + 1}</button>)}</nav>
    <h2 className="mb-4 text-lg font-semibold">{titles[phase - 1]}</h2>
    {loading ? <p>Cargando previsiones y asignaciones…</p> : <>
      {phase === 1 && <>
        {['importe','concepto'].map(field => <section key={field} className="mb-4 rounded border p-4"><h3 className="font-semibold">Otros registros con el mismo {field} este mes o el anterior</h3>{lines.map(l => {
          const candidates = all.filter(r => r.id_linea_banco !== l.id_linea_banco && [0,1].includes(monthIndex(l.fecha_operativa || l.fecha_valor) - monthIndex(r.fecha_operativa || r.fecha_valor)) && (field === 'importe' ? Number(r.importe) === Number(l.importe) : normalize(l.concepto) !== '' && normalize(r.concepto) === normalize(l.concepto)));
          return <div key={l.id_linea_banco} className="mt-2">{lines.length > 1 && <p className="text-sm text-gray-500">{l.id_linea_banco}</p>}{candidates.length ? candidates.map(r => <a key={r.id_linea_banco} href={`/dashboard/direccion/bancos/extractos/${encodeURIComponent(r.id_linea_banco)}`} target="_blank" rel="noopener noreferrer" className="mt-1 block cursor-pointer rounded border p-3 text-blue-950 hover:bg-blue-50">{r.id_linea_banco} · {r.fecha_valor} · {money(r.importe)} · {r.concepto} ↗</a>) : <p className="text-sm text-gray-500">Sin coincidencias.</p>}</div>;
        })}</section>)}
        {(modal || mixed || invalidCharge) && <section className="rounded border p-4"><h3 className="font-semibold">Estado de la selección</h3>{lines.map(l => <p key={l.id_linea_banco}>{l.id_linea_banco}: {l.estado_revision ? 'Revisado' : 'Sin revisar'}</p>)}{mixed && <p role="alert" className="text-red-700">No se puede continuar: la selección incluye registros ya revisados. Selecciona únicamente los que están sin revisar.</p>}{invalidCharge && <p role="alert" className="text-red-700">Cada movimiento debe ser un cargo y tener un proveedor o nómina asignado previamente.</p>}</section>}
      </>}
      {phase === 2 && <>
        {(common ? lines.slice(0,1) : lines).map(l => { const d = drafts[l.id_linea_banco]; return <div key={l.id_linea_banco} className="mb-4 space-y-3 rounded border p-4"><h3>{common ? `Asignación para los ${lines.length} registros` : `${l.id_linea_banco} · ${money(l.importe)} · ${l.concepto}`}</h3>
          <select aria-label={`Tipo ${l.id_linea_banco}`} disabled={mode === 'charge'} className={select} value={d.entityType} onChange={e => patch(d.id, { entityType:e.target.value, entityId:'', chargeId:'', resolution:'', create:false, increase:false })}><option value="proveedor">Proveedor</option><option value="cliente">Cliente / ingreso</option><option value="nomina">Nómina</option></select>
          <SearchableSelect label="Destinatario" disabled={mode === 'charge'} value={d.entityId} required onChange={value=>patch(d.id,{entityType:d.entityType,entityId:value,chargeId:'',resolution:'',create:false,increase:false})} options={entities(d.entityType).map((e:any)=>({value:e.id,label:e.name+' · '+e.id}))} />
          {d.entityType === 'nomina' && mode === 'review' && <label className="block font-medium">Tipo de nómina<select className={select} value={d.payrollKind} onChange={e => patch(d.id, { payrollKind:e.target.value, adjustment:'', increase:false })}><option value="">Elige antes de continuar</option><option value="completa">Nómina completa</option><option value="anticipo">Anticipo</option><option value="adicional">Nómina con importe adicional</option></select></label>}
          {!common && d.entityId && (conflict(l,d) ? <div className="rounded bg-amber-50 p-3"><p>Este registro está asignado a {previousOwners(l)}. Se sustituirán también sus vínculos de pago incompatibles.</p><select aria-label={`Resolver ${d.id}`} className={select} value={d.resolution} onChange={e => patch(d.id, { resolution:e.target.value })}><option value="">Debes elegir</option><option value="skip">Desseleccionar esta reasignación</option><option value="overwrite">Sobrescribir con {entityName(d)}</option></select></div> : previousOwners(l) && <p className="rounded bg-blue-50 p-3">Aviso: {d.id} ya está asignado a {entityName(d)}. Puedes continuar.</p>)}
        </div>; })}
      </>}
      {phase === 2 && common && lines.map(l => { const d=drafts[l.id_linea_banco]; return d.entityId && previousOwners(l) ? <div key={d.id} className="mb-3 rounded bg-amber-50 p-3"><p>{d.id}: {previousOwners(l)}{!conflict(l,d) && ' (ya asignado al mismo destinatario)'}</p>{conflict(l,d) && <select aria-label={`Resolver ${d.id}`} className={select} value={d.resolution} onChange={e=>patch(d.id,{resolution:e.target.value})}><option value="">Debes elegir</option><option value="skip">Omitir esta reasignación</option><option value="overwrite">Sobrescribir con {entityName(d)}</option></select>}</div> : null; })}
      {phase >= 3 && (common && phase === 3 ? active.slice(0,1) : active).map(l => { const d = drafts[l.id_linea_banco], c = calculation(l,d); return <section key={d.id} className="mb-4 space-y-3 rounded border p-4"><h3 className="font-semibold">{common && phase === 3 ? `Cargo previsto para los ${active.length} registros` : d.id} · {entityName(d)}{!(common && phase === 3) && ` · ${money(l.importe)}`}</h3>
        {phase === 3 && <>
          {d.entityType === 'cliente' ? <label>Orden de cobro (opcional)<select className={select} value={d.orderId} onChange={e => patch(d.id, {orderId:e.target.value})}><option value="">Sin orden</option>{data.orders.filter((o: any) => o.id_cuenta === d.entityId).map((o: any) => <option key={o.id_orden} value={o.id_orden}>{o.id_orden} · {money(o.cobro_total)} · {o.fecha_teorica_cobro}</option>)}</select></label> : <>
            {d.entityType === 'proveedor' && mode !== 'charge' && <label>Pago previsto (opcional)<select className={select} value={d.paymentId} onChange={e=>patch(d.id,{paymentId:e.target.value,chargeId:'',create:false})}><option value="">Sin pago previsto</option>{data.forecasts.filter((p:any)=>p.id_proveedor===d.entityId).map((p:any)=><option key={p.id_pago} value={p.id_pago}>{p.nombre_planificacion||p.id_pago} · {p.fecha_pago} · {money(p.total_pago)}</option>)}</select></label>}
            <label>Cargo recurrente<select className={select} value={d.create ? 'new' : d.chargeId} onChange={e => patch(d.id, { create:e.target.value === 'new', chargeId:e.target.value === 'new' ? '' : e.target.value, ruleIndex:0, increase:false })}><option value="">{charges(d).length ? 'Selecciona o continúa sin asociar' : 'No hay cargos previstos registrados'}</option>{charges(d).map((r: any) => <option key={r.id_cargo_recurrente} value={r.id_cargo_recurrente}>{r.id_cargo_recurrente} · {r.programacion.map((p: any) => `${p.descripcion || ''} ${money(p.total_iva)}`).join(' / ')}</option>)}<option value="new">Crear cargo previsto asociado a {entityName(d)}</option></select></label>
            {d.create && <RecurringChargeForm value={d.chargeDraft} onChange={v => patch(d.id,{chargeDraft:v})} payroll={d.entityType === 'nomina'} vat={d.vat} onVatChange={v => patch(d.id,{vat:v})} />}
            {c.charge?.programacion?.length > 1 && <label>Regla correspondiente<select className={select} value={d.ruleIndex} onChange={e => patch(d.id,{ruleIndex:Number(e.target.value)})}>{c.charge.programacion.map((r: any, i: number) => <option key={i} value={i}>{r.descripcion} · {money(r.total_iva)} · {r.dia ? `${r.dia}/${r.mes}/${r.anio || ''}` : `Cada ${r.cada} ${r.unidad}`}</option>)}</select></label>}
            {d.entityType === 'nomina' && mode === 'review' && <>
              <label>Nómina registrada<select className={select} value={c.payroll?.id || ''} onChange={e => { const p = data.payrolls.find((p: any) => p.id === e.target.value); if (p) patch(d.id,{payrollId:p.id,month:String(p.mes),year:String(p.anio),increase:false}); }}><option value="">Registrar mes a partir de la previsión</option>{data.payrolls.filter((p: any) => p.id_empleado === d.entityId && (p.estado !== 'pagado' || p.id_transferencia === l.id_linea_banco)).map((p: any) => <option key={p.id} value={p.id}>{p.mes}/{p.anio} · {money(p.importe_neto)}</option>)}</select></label>
              <div className="flex gap-3"><label>Mes<input aria-label="Mes nómina" placeholder="mm" maxLength={2} value={d.month} onChange={e => patch(d.id,{month:e.target.value.replace(/\D/g,''),payrollId:'',increase:false})} className={input} /></label><label>Año<input aria-label="Año nómina" placeholder="yyyy" maxLength={4} value={d.year} onChange={e => patch(d.id,{year:e.target.value.replace(/\D/g,''),payrollId:'',increase:false})} className={input} /></label></div><p>{c.payroll ? 'Nómina registrada' : 'Se registrará la nómina de este mes al confirmar'}: {money(c.expected)}.</p>
            </>}
          </>}
        </>}
        {phase === 4 && <>
          {d.entityType === 'nomina' && mode === 'review' ? <>
            <p>Nómina prevista: {money(c.expected)}. Periodo: {d.month}/{d.year}.</p>
            {c.advances.length ? <><h4>Anticipos pagados</h4>{c.advances.map((a: any) => <p key={a.id}>{a.id} · {money(a.importe_neto)}</p>)}<p>{money(c.expected)} − {money(c.paid)} = {money(c.expected - c.paid)} a pagar.</p></> : !c.pendingAdvances.length && <p>No hay anticipos ni compensaciones.</p>}
            {!!c.pendingAdvances.length && <div className="rounded bg-amber-50 p-3"><h4>Anticipos registrados pendientes de pago</h4>{c.pendingAdvances.map((a:any)=><p key={a.id}>{a.id} · {money(a.importe_neto)}</p>)}<p>Se muestran para comprobarlos; no se deducen hasta que estén pagados.</p></div>}
            {d.payrollKind === 'anticipo' ? <label>Importe del anticipo<input className={input} type="number" min="0.01" step="0.01" value={d.adjustment} onChange={e => patch(d.id,{adjustment:e.target.value})} /><span>Movimiento: {money(c.amount)}. Se asociará a esta nómina mensual.</span></label> : d.payrollKind === 'adicional' ? <label>Importe adicional puntual<input className={input} type="number" min="0.01" step="0.01" value={d.adjustment} onChange={e => patch(d.id,{adjustment:e.target.value})} /><span>El movimiento sobresale {money(c.difference)} del importe pendiente. La previsión recurrente se conserva.</span></label> : <><p>{Math.abs(c.difference) < 0.005 ? 'El importe a pagar coincide con el movimiento.' : `Diferencia con el movimiento: ${money(c.difference)}.`}</p>{c.paid === 0 && !c.pendingAdvances.length && c.difference > 0 && <label className="flex cursor-pointer gap-2 rounded p-3 hover:bg-blue-50"><input className="cursor-pointer" type="checkbox" checked={d.increase} onChange={e => patch(d.id,{increase:e.target.checked})} />Subir la nómina prevista de cada mes a {money(c.amount)}</label>}</>}
          </> : d.entityType === 'proveedor' ? <><VatToggle value={d.vat} onChange={v=>patch(d.id,{vat:v})} /><p>Total: {money(c.amount)} · Base imponible: {money(c.amount / (d.vat ? 1.21 : 1))}</p>{c.charge ? <><p>Previsto: {money(c.expected)} · Diferencia: {money(c.amount - c.expected)}</p>{c.amount > c.expected && <label className="flex cursor-pointer gap-2 rounded p-3 hover:bg-blue-50"><input className="cursor-pointer" type="checkbox" checked={d.increase} onChange={e => patch(d.id,{increase:e.target.checked})} />Actualizar el importe previsto de cada mes a {money(c.amount)} por subida de precios.</label>}</> : <p>Sin cargo previsto asociado.</p>}</> : <p>{d.entityType === 'cliente' ? 'Ingreso' : 'Asignación de nómina'}: {money(c.amount)}. No hay anticipos ni compensaciones que validar en esta asignación.</p>}
        </>}
        {phase === 5 && <>
          <p>Destinatario: {entityName(d)} · {d.entityType}</p>
          <p>Movimiento: {money(l.importe)} · {l.fecha_valor}</p>
          {d.entityType !== 'cliente' && <><p>Cargo previsto: {d.create ? 'Se creará al confirmar' : d.chargeId || 'Sin asociar'}</p>{c.charge?.programacion?.map((r:any,i:number)=><p key={i}>{r.descripcion || 'Cargo previsto'} · {money(r.total_iva)} · {c.charge.tipo_programacion==='fechas'?`${r.dia}/${r.mes}/${r.anio||'Todos los años'}`:`Cada ${r.cada} ${r.unidad}`}</p>)}</>}
          {d.entityType === 'proveedor' && <><p>{d.vat?'Con IVA':'Sin IVA'} · Base imponible: {money(c.amount/(d.vat?1.21:1))} · Total: {money(c.amount)}</p>{d.paymentId && <p>Pago previsto: {d.paymentId}</p>}</>}
          {d.entityType === 'cliente' && <p>Orden de cobro: {d.orderId || 'Sin asociar'}</p>}
          {d.entityType === 'nomina' && mode === 'review' && <>
            <p>{({completa:'Nómina completa',anticipo:'Anticipo',adicional:'Nómina con importe adicional'} as Record<string,string>)[d.payrollKind]} · {d.month}/{d.year}</p>
            <p>Nómina prevista: {money(c.expected)} − anticipos: {money(c.paid)} = pendiente: {money(c.expected-c.paid)}.</p>
            {d.payrollKind==='anticipo'?<p>Se registrará un anticipo de {money(d.adjustment)} asociado a esta nómina mensual. Restarán {money(c.expected-c.paid-Number(d.adjustment))}.</p>:d.payrollKind==='adicional'?<p>Confirmas un adicional puntual de {money(d.adjustment)}: {money(c.expected-c.paid)} + {money(d.adjustment)} = {money(c.amount)}. La previsión recurrente no se incrementará.</p>:<p>Importe a pagar confirmado: {money(c.amount)}.</p>}
          </>}
          {d.increase && <p className="font-semibold text-amber-800">Confirmas subir la previsión de {money(c.expected)} a {money(c.amount)} por mes.</p>}
          {d.resolution === 'overwrite' && <p>Se sobrescribirá la asignación anterior: {previousOwners(l)}.</p>}
          <p>{mode === 'review' ? 'El movimiento quedará revisado.' : 'Se guardará la asociación.'}</p>
        </>}
      </section>; })}
      {phase === 5 && lines.length !== active.length && <p>{lines.length - active.length} línea(s) omitidas.</p>}
    </>}
    {error && <p role="alert" className="my-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <footer className="mt-5 flex justify-end gap-3">{phase > 1 && <button type="button" disabled={saving} className={button} onClick={() => {setPhase(p => p - 1);setError('');}}>Volver atrás</button>}{phase < 5 ? <button type="button" className={button} disabled={loading || !ready || saving || mixed || invalidCharge} onClick={next}>Continuar</button> : <button type="button" disabled={saving} className={`${button} bg-green-700 text-white`} onClick={save}>{saving ? 'Guardando…' : 'Confirmar'}</button>}</footer>
  </section>;
  return modal ? <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 p-4"><div className="mx-auto my-6 max-w-5xl">{content}</div></div> : content;
}
