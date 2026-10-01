'use client';
import IncomeReviewFields from './IncomeReviewFields';
import ReviewRecipientTable from './ReviewRecipientTable';
import BankReviewInsights, { type ReviewMemoryPlan } from './BankReviewInsights';
import { useEffect, useState } from 'react';
import RecurringChargeForm, { newCharge, reviewButton as button, VatToggle } from './RecurringChargeForm';

const money = (v: any) => Number(v || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const input = 'w-full rounded border bg-white p-2';
const select = `${input} enabled:cursor-pointer enabled:hover:border-blue-950 disabled:cursor-not-allowed disabled:bg-gray-100`;
const newMovementCharge = (line: any) => {
  const charge = newCharge();
  return {
    ...charge,
    banco_pago: line.banco || '',
    programacion: charge.programacion.map(rule => ({
      ...rule,
      total_iva: Math.abs(Number(line.importe)).toFixed(2),
      descripcion: line.comentarios || '',
    })),
  };
};
type Props = { compactAssignment?: boolean; lines: any[]; all: any[]; mode?: 'review' | 'assign' | 'charge'; onSaved: () => void; onClose: () => void; modal?: boolean; initialEmployeeId?: string };
export default function BankReviewWizard({ lines, mode = 'review', onSaved, onClose, modal = false, initialEmployeeId, compactAssignment = false }: Props) {
  const [memory,setMemory] = useState<ReviewMemoryPlan>({allocations:[],decisions:[]});
  const [forced,setForced]=useState(false),[forcedComment,setForcedComment]=useState('');
  const [phase, setPhase] = useState(mode === 'review' ? 0 : mode === 'charge' ? 3 : 2), [error, setError] = useState(''), [saving, setSaving] = useState(false), [loading, setLoading] = useState(true), [ready, setReady] = useState(false);
  const [data, setData] = useState<any>({ providers: [], clients: [], employees: [], charges: [], payrolls: [], advances: [], orders: [], forecasts: [], remesas: [] });
  const [drafts, setDrafts] = useState<any>(() => Object.fromEntries(lines.map(l => [l.id_linea_banco, {
    id: l.id_linea_banco, version: l.updated_at, entityType: mode === 'assign' && compactAssignment ? 'proveedor' : initialEmployeeId || l.id_agente ? 'nomina' : l.id_cuenta || Number(l.importe) > 0 ? 'cliente' : 'proveedor', entityId: mode === 'assign' && lines.length > 1 ? '' : initialEmployeeId || l.id_agente || l.id_cuenta || l.id_proveedor || '',
    entityChosen: mode === 'charge', formerEmployee: l.nomina_revision?.ex_empleado === true, formerNet: '', payrollKind: l.nomina_revision?.decision && ['completa','anticipo','adicional','otros'].includes(l.nomina_revision.decision) ? l.nomina_revision.decision : '', chargeId: l.id_cargo_recurrente ? String(l.id_cargo_recurrente) : '', paymentId: l.id_pago || '', payrollId: '', month: String(l.nomina_revision?.mes || String(l.fecha_valor || '').split('/')[1] || ''), year: String(l.nomina_revision?.anio || String(l.fecha_valor || '').split('/')[2] || ''), adjustment: '', increase: false, vat: true, chargeVat: true, ruleIndex: 0, create: false, chargeDraft: newMovementCharge(l), resolution: '', comments: l.comentarios || '', commentsEdited:false, orderId: l.id_orden || '', incomeType:l.tipo_ingreso || '', remesaIds:l.remesa_ids || []
  }]).map(([id,d]:any,_,entries:any[]) => {
    if(lines.length<2 || lines.some(l=>Number(l.importe)>0))return [id,d];
    const shared=(key:string)=>entries.every(([,other]:any)=>other[key]===entries[0][1][key])?entries[0][1][key]:'';
    return [id,{...d,entityType:entries[0][1].entityType,entityId:shared('entityType')?shared('entityId'):'',chargeId:shared('chargeId'),paymentId:shared('paymentId'),orderId:shared('orderId'),payrollKind:shared('payrollKind'),formerEmployee:shared('formerEmployee')===true}];
  })));
  const simpleAssignment = mode === 'assign' && compactAssignment;
  const common = lines.length > 1 && lines.every(l=>Number(l.importe)<0);
  const patch = (id: string, value: any, individual = false) => setDrafts((current: any) => Object.fromEntries(Object.entries(current).map(([key,d]:any) => {
    if (key !== id && !('formerNet' in value && Object.keys(value).length === 1 && current[id].entityType === 'nomina' && d.entityId === current[id].entityId && Number(d.month) === Number(current[id].month) && Number(d.year) === Number(current[id].year)) && !(common && !individual && (phase === 2 || phase === 3) && !('resolution' in value && Object.keys(value).length === 1))) return [key,d];
    const original=lines.find(l=>l.id_linea_banco===key);
    const retained=simpleAssignment && value.entityId && original?.id_proveedor===value.entityId && !conflict(original,{entityType:'proveedor',entityId:value.entityId}) ? {chargeId:original.id_cargo_recurrente?String(original.id_cargo_recurrente):'',paymentId:original.id_pago||'',orderId:original.id_orden||''} : {};
    return [key,{...d,...(phase === 3 && !individual && 'vat' in value ? {chargeVat:value.vat} : {}),...('entityId' in value || 'entityType' in value ? {paymentId:'',orderId:'',payrollId:'',ruleIndex:0,formerEmployee:false,formerNet:''} : {}),...(value.chargeId || value.create ? {paymentId:''} : {}),...value,...retained}];
  })));
  useEffect(() => {
    const controller = new AbortController();
    const urls = ['/api/v1/admin/proveedores','/api/v1/comercial/cuentas','/api/v1/direccion/laboral/empleados','/api/v1/direccion/cargos-recurrentes','/api/v1/direccion/laboral/nominas','/api/v1/direccion/laboral/anticipos','/api/v1/admin/control-administrativo/ordenes','/api/v1/direccion/prevision-gastos','/api/v1/direccion/prevision-ingresos?tipo=remesas'];
    Promise.all(urls.map(url => fetch(url, { signal: controller.signal, cache: 'no-store' }).then(async r => { const d = await r.json(); if (!r.ok || !Array.isArray(d)) throw new Error(d.message || 'No se pudieron cargar los datos de revisión.'); return d; })))
      .then(([providers, clients, employees, charges, payrolls, advances, orders, forecasts, remesas]) => {setData({ providers, clients, employees, charges, payrolls, advances, orders, forecasts, remesas });setDrafts((current:any)=>Object.fromEntries(Object.entries(current).map(([id,d]:any)=>[id,!d.entityId && charges.some((c:any)=>String(c.id_cargo_recurrente)===d.chargeId&&c.tipo_cargo==='otro')?{...d,entityType:'otro'}:d])));setReady(true);})
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  const entities = (type: string) => (type === 'proveedor' ? data.providers : type === 'nomina' ? data.employees : data.clients).map((r: any) => ({ id: type==='proveedor'?r.id_proveedor:type==='nomina'?r.id_agente:r.id_cuenta, name: type==='proveedor'?r.nombre_proveedor||r.nombre_fiscal_proveedor||r.id_proveedor:type==='nomina'?r.nombre||r.nombre_completo_agente||r.id_agente:r.nombre_empresa||r.nombre_fiscal||r.id_cuenta, fiscal:r.nombre_fiscal_proveedor||'',taxId:r.vat_code||'' }));
  const entityName = (d: any) => d.entityType==='otro' ? 'Otro (sin destinatario)' : entities(d.entityType).find((e: any) => e.id === d.entityId)?.name || d.entityId;
  const owners = (l:any) => [l,data.charges.find((c:any)=>String(c.id_cargo_recurrente)===String(l.id_cargo_recurrente)),data.forecasts.find((p:any)=>p.id_pago===l.id_pago),...data.payrolls.concat(data.advances).filter((p:any)=>p.id_transferencia===l.id_linea_banco).map((p:any)=>({id_agente:p.id_empleado}))].filter(Boolean);
  const conflict = (l: any, d: any) => owners(l).some(owner=>['id_proveedor','id_cuenta','id_agente'].some(k => owner[k] && (k !== ({ proveedor:'id_proveedor', cliente:'id_cuenta', nomina:'id_agente' } as any)[d.entityType] || owner[k] !== d.entityId)));
  const previousOwners = (l:any) => [...new Set(owners(l).flatMap(o=>['id_proveedor','id_cuenta','id_agente'].map(k=>o[k]).filter(Boolean)))].join(', ');
  const mixed = mode === 'review' && lines.some(l => l.estado_revision);
  const invalidCharge = mode === 'charge' && lines.some(l => Number(l.importe) >= 0 || (!l.id_proveedor && !l.id_agente && !data.charges.some((c:any)=>String(c.id_cargo_recurrente)===String(l.id_cargo_recurrente)&&c.tipo_cargo==='otro'))) || mode === 'charge' && lines.some(l => (l.id_proveedor || l.id_agente) !== (lines[0].id_proveedor || lines[0].id_agente));
  const active = lines.filter(l => drafts[l.id_linea_banco].resolution !== 'skip');
  const hasIncome = mode === 'review' && active.some(l => Number(l.importe) > 0);
  const expenseLines = active.filter(l => !(mode === 'review' && Number(l.importe) > 0));
  const hasPayroll = mode === 'review' && expenseLines.some(l => drafts[l.id_linea_banco].entityType === 'nomina');
  const onlyPayroll = expenseLines.length > 0 && expenseLines.every(l => drafts[l.id_linea_banco].entityType === 'nomina');
  const onlyClients = expenseLines.length > 0 && expenseLines.every(l => drafts[l.id_linea_banco].entityType === 'cliente');
  // IDs identify operations; their visible numbering follows the applicable route.
  const steps = [
    ...(mode === 'review' ? [{ id: 1, title: 'Avisos y comparación', description: 'Comprueba los posibles duplicados y las diferencias con el histórico.' }] : []),
    ...(mode !== 'charge' ? [{ id: 2, title: hasIncome ? (expenseLines.length ? 'Destinatarios y cobros' : 'Identificar cobros') : 'Asignado a', description: hasIncome ? 'Identifica transferencias, remesas u otros ingresos y resuelve las asignaciones anteriores. Si hay cargos, elige también su destinatario.' : 'Selecciona el proveedor, cliente o empleado, o elige Otro para un movimiento sin destinatario.' }] : []),
    ...(mode !== 'assign' && expenseLines.length ? [{ id: 3, title: onlyPayroll ? 'Previsión de nómina' : onlyClients ? 'Orden de cobro' : hasPayroll ? 'Previsiones e importes' : 'Cargo previsto e importes', description: onlyPayroll ? 'Indica si es un empleado actual o un ex-empleado y configura la previsión cuando corresponda.' : onlyClients ? 'Asocia una orden de cobro si corresponde a este movimiento.' : 'Selecciona o crea la previsión, revisa los importes y añade los comentarios. En proveedores, comprueba el IVA y cualquier subida de la previsión.' }] : []),
    ...(hasPayroll ? [{ id: 4, title: 'Liquidación de nóminas', description: 'Comprueba por empleado el periodo, el tipo de pago, los anticipos y los ajustes de la nómina.' }] : []),
    { id: 5, title: mode === 'review' ? 'Revisión final' : 'Confirmar asociación', description: 'Comprueba los datos y las decisiones preparadas antes de confirmar y guardar.' },
  ];
  const stepIndex = steps.findIndex(step => step.id === phase);
  const currentStep = steps[stepIndex];
  const charges = (d: any) => data.charges.filter((c:any)=>!c.id_tarjeta).filter((c: any) => d.entityType === 'otro' ? c.tipo_cargo === 'otro' : d.entityType === 'nomina' ? c.tipo_cargo === 'nomina' && c.id_agente === d.entityId : (c.tipo_cargo || 'proveedor') === 'proveedor' && c.id_proveedor === d.entityId);
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
    const periodLines = active.filter(other=>{const p=drafts[other.id_linea_banco];return p.entityType==='nomina'&&p.payrollKind!=='otros'&&p.entityId===d.entityId&&Number(p.year)===Number(d.year)&&Number(p.month)===Number(d.month);});
    const recordedPaid = data.advances.filter((a:any)=>a.id_empleado===d.entityId&&Number(a.anio)===Number(d.year)&&Number(a.mes)===Number(d.month)&&a.estado==='pagado'&&!periodLines.some(other=>other.id_linea_banco===a.id_transferencia)).reduce((sum:number,a:any)=>sum+Math.round(Number(a.importe_neto)*100),0)/100;
    const periodNet = periodLines.reduce((sum:number,other:any)=>sum+Math.round(Math.abs(Number(other.importe))*100),0)/100 + recordedPaid;
    const priorAdditional = payroll?.id_transferencia === l.id_linea_banco && d.payrollKind === 'adicional' && l.nomina_revision?.decision === 'adicional';
    const expected = priorAdditional ? Number(l.nomina_revision.importe_previsto) : d.entityType === 'nomina' && payroll ? Number(payroll.importe_neto) : d.formerEmployee && d.entityType === 'nomina' ? Number(d.formerNet || (periodNet)) : Number(charge?.programacion?.[d.ruleIndex]?.total_iva || 0);
    const amount = Math.abs(Number(l.importe)), difference = Math.round((amount - expected + paid) * 100) / 100;
    return { charge, payroll, advances, pendingAdvances, paid, expected, amount, difference };
  };
  const preparedCharge = (d: any) => ({ ...d.chargeDraft, programacion: d.chargeDraft.programacion.map((r: any) => ({ ...r, base_imponible: d.entityType === 'nomina' ? 0 : Math.round(Number(r.total_iva) / ((common ? d.chargeVat : d.vat) ? 1.21 : 1) * 100) / 100 })) });
  const validatePhase = () => {
    if (mixed) return 'No puedes revisar una selección con registros ya revisados. Desmárcalos y vuelve a abrir el proceso.';
    if (invalidCharge) return 'Asigna primero todos los cargos a un proveedor o una nómina. Los ingresos no admiten cargos previstos.';
    if (phase === 0) return '';
    if (mode === 'review' && phase >= 2) for (const l of active.filter(l=>Number(l.importe)>0)) {
      const d=drafts[l.id_linea_banco];
      if(!d.incomeType)return 'Indica el tipo de cada ingreso en Identificar cobros.';
      if(d.incomeType==='remesa' && !d.remesaIds?.length)return 'Selecciona al menos una remesa para cada ingreso de remesa.';
      if(d.incomeType==='transferencia' && !d.orderId)return 'Selecciona la orden de transferencia.';
      const expected=d.incomeType==='remesa'?d.remesaIds.reduce((n:number,id:string)=>n+Number(data.remesas.find((r:any)=>r.id_remesa===id)?.importe_total || 0),0):Number(data.orders.find((o:any)=>o.id_orden===d.orderId)?.cobro_total || 0);
      if(d.incomeType!=='otro' && Math.round(expected*100)!==Math.round(Number(l.importe)*100))return 'El importe seleccionado debe coincidir con el movimiento bancario.';
    }
    if (phase >= 2) {
      if (!active.length) return 'No quedan líneas seleccionadas.';
      for (const l of active) {
        const d = drafts[l.id_linea_banco], c = calculation(l, d);
        if (mode==='review' && Number(l.importe)>0 && ['remesa','otro'].includes(d.incomeType)) continue;
        if (d.entityType!=='otro' && !(mode==='review'&&Number(l.importe)>0) && (!d.entityChosen || !entities(d.entityType).some((e:any)=>e.id===d.entityId))) return `Selecciona una fila de destinatario para ${l.id_linea_banco}.`;
        if (d.entityType!=='otro' && !d.entityId) return `Selecciona el destinatario de ${l.id_linea_banco}.`;
        if (conflict(l, d) && d.resolution !== 'overwrite') return `Elige omitir o sobrescribir ${l.id_linea_banco}.`;
        if (d.entityType === 'nomina' && Number(l.importe) >= 0) return 'Solo los cargos pueden ser nóminas.';
        if (phase >= 4 && mode === 'review' && d.entityType === 'nomina' && !d.payrollKind) return 'Elige el tipo de nómina antes de continuar.';
        if (phase >= 3 && (mode === 'charge' || mode === 'review' && d.entityType === 'nomina') && !(d.entityType === 'nomina' && d.formerEmployee) && !c.charge) return 'Selecciona o crea el cargo previsto.';
        if (phase >= 3 && d.create && d.chargeDraft.programacion.some((r: any) => !(Number(r.total_iva) > 0))) return 'Completa los importes del cargo previsto.';
        if (phase >= 4 && mode === 'review' && d.entityType === 'nomina' && d.payrollKind !== 'otros' && (!d.month || !d.year || (d.payrollKind !== 'otros' && !c.expected))) return 'Selecciona la nómina y el periodo.';
        if (phase >= 4 && mode === 'review' && d.entityType === 'nomina' && d.payrollKind !== 'otros') {
          const existingAdvance = data.advances.some((a:any)=>a.id_transferencia===l.id_linea_banco);
          if (d.payrollKind !== 'otros' && c.payroll?.estado === 'pagado' && c.payroll.id_transferencia !== l.id_linea_banco && !existingAdvance) return 'Esta nómina ya está pagada. Selecciona una nómina pendiente antes de continuar.';
          if (!Number.isInteger(Number(d.month)) || Number(d.month)<1 || Number(d.month)>12 || !Number.isInteger(Number(d.year)) || Number(d.year)<2000 || Number(d.year)>2100) return 'Selecciona un mes y año válidos para la nómina.';
        }
        if (phase >= 4 && mode === 'review' && d.entityType === 'nomina') {
          const sameMonth=active.filter(other=>{const p=drafts[other.id_linea_banco];return p.entityType==='nomina'&&p.payrollKind!=='otros'&&p.entityId===d.entityId&&Number(p.year)===Number(d.year)&&Number(p.month)===Number(d.month)&&p.payrollKind!=='anticipo'&&p.payrollKind!=='otros';});
          if(sameMonth.length>1)return `Hay varias nóminas completas para ${d.month}/${d.year}: ${sameMonth.map(r=>r.id_linea_banco).join(', ')}. Identifica los anticipos en esta fase o corrige el mes de cada movimiento.`;
          if (d.payrollKind === 'anticipo' && (Math.round(Number(d.adjustment) * 100) !== Math.round(c.amount * 100) || c.paid + c.amount > c.expected)) return 'El anticipo debe coincidir con el cargo y no superar el neto pendiente.';
          if (d.payrollKind === 'adicional' && (c.difference <= 0 || Math.round(Number(d.adjustment) * 100) !== Math.round(c.difference * 100))) return 'El importe adicional debe cuadrar con el movimiento.';
          if (d.payrollKind === 'completa' && Math.abs(c.difference) > 0.005 && !(d.increase && c.paid === 0 && !c.pendingAdvances.length && c.difference > 0)) return 'La nómina menos anticipos no coincide. Revisa el tipo o confirma la subida de la previsión.';
        }
      }
    }
    return '';
  };
  const next = () => { const message = validatePhase(); setError(message); if (!message) setPhase(steps[stepIndex + 1].id); };
  const save = async () => {
    const message = forced ? (mixed ? 'Selecciona solamente movimientos sin revisar.' : !forcedComment.trim() ? 'El comentario de revisión forzada es obligatorio.' : '') : validatePhase(); if (message) { setError(message); return; }
    setSaving(true); setError('');
    try {
      const items = lines.map(l => { const d = drafts[l.id_linea_banco], c = calculation(l, d); return { ...d, newCharge: d.create ? preparedCharge(d) : undefined, expectedSchedule: c.charge?.programacion, expectedPayroll: c.expected, expectedAdvances: c.paid, payrollId: c.payroll?.id }; });
      const r = await fetch('/api/v1/direccion/bancos/revision', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:forced?'force-review':'workflow', forcedComment:forced?forcedComment:undefined, mode, memory: !forced && (memory.allocations.length || memory.decisions.length) ? memory : undefined, ids:lines.map(l => l.id_linea_banco), items }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.message); onSaved();
    } catch (e: any) { setError(e.message || 'No se pudo guardar.'); } finally { setSaving(false); }
  };
  const content = <section role={modal ? 'dialog' : undefined} aria-modal={modal || undefined} aria-label="Revisión de movimientos" className="w-full rounded-xl bg-white p-6 text-slate-900 shadow-xl">
    <header className="mb-4 flex justify-between gap-4"><h1 className="text-xl font-semibold">{mode === 'review' ? 'Revisar movimientos' : mode === 'charge' ? 'Asignar a un cargo previsto' : 'Asignación común'}</h1><button type="button" aria-label="Cerrar" className="cursor-pointer rounded px-3 text-2xl hover:bg-gray-100" onClick={onClose}>×</button></header>
    <section aria-label="Movimientos seleccionados" className="mb-5 rounded-xl bg-slate-50 p-4">
      <p className="mb-3 font-medium">{mode === 'review' ? 'Estás revisando' : 'Estás trabajando con'} {lines.length === 1 ? 'un movimiento bancario.' : `${lines.length} movimientos bancarios.`}</p>
      <div className="grid max-h-64 gap-3 overflow-y-auto sm:grid-cols-2">{lines.map(l=><article key={l.id_linea_banco} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-sm text-slate-600">{Number(l.importe)<0?'Cargo':'Ingreso'} · {l.fecha_valor}</span><strong className="text-lg">{money(l.importe)}</strong></div>
        <p className="break-words font-medium">{l.concepto || 'Sin concepto'}</p>
        <p className="mt-2 break-all text-xs text-slate-500">{l.banco ? `${l.banco} · ` : ''}Referencia: {l.id_linea_banco}</p>
      </article>)}</div>
      {phase>0&&<p className="mt-4 text-sm text-slate-700"><strong>{simpleAssignment?'Asignación a proveedor':`En esta fase: ${currentStep?.title}`}.</strong>{' '}{simpleAssignment?'Elige el proveedor al que quieres asignar los movimientos.':currentStep?.description}</p>}
    </section>
    {!simpleAssignment && phase>0 && <nav className="mb-5 flex flex-wrap gap-2" aria-label="Fases">{steps.map((step, i) => <button key={step.id} type="button" disabled={i > stepIndex || saving} onClick={() => { setPhase(step.id); setError(''); }} className={`${button} ${phase === step.id ? 'bg-blue-950 text-white' : ''}`}>Fase {i + 1}: {step.title}</button>)}</nav>}
    {phase===0&&<p className="mb-3 text-sm text-slate-700"><strong>Antes de empezar.</strong> Elige una revisión completa o marca directamente los movimientos como revisados con un comentario.</p>}
    <h2 className="mb-4 text-lg font-semibold">{simpleAssignment?'Asignar a proveedor':phase===0?'¿Cómo quieres revisar?':currentStep?.title}</h2>
    {mode === 'review' && phase===0 && <section className="mb-4 rounded-lg border p-4" aria-label="Tipo de revisión">
      <p id="review-mode-question" className="mb-3 font-medium">{lines.length===1?'¿Quieres marcar directamente este movimiento como revisado porque no necesitas asociarlo a ninguna previsión, o prefieres hacer una revisión completa?':'¿Quieres marcar directamente estos movimientos como revisados porque no necesitas asociarlos a ninguna previsión, o prefieres hacer una revisión completa?'}</p>
      <button type="button" role="switch" aria-label="Revisión directa" aria-describedby="review-mode-question review-mode-description" aria-checked={forced} disabled={saving} className="flex flex-wrap items-center gap-3 rounded-lg border border-transparent p-2 text-left enabled:cursor-pointer enabled:hover:border-blue-200 enabled:hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={()=>setForced(v=>!v)}>
        <span className={!forced?'font-semibold text-blue-950':'text-slate-500'}>Revisión completa{!forced&&<span className="ml-2 text-xs">(seleccionada)</span>}</span>
        <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full ${forced?'bg-blue-950':'bg-slate-400'}`}><span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${forced?'translate-x-5':''}`}/></span>
        <span className={forced?'font-semibold text-blue-950':'text-slate-500'}>Revisión directa{forced&&<span className="ml-2 text-xs">(seleccionada)</span>}</span>
      </button>
      <p id="review-mode-description" className="mt-2 text-sm text-slate-600">{forced?'Marcarás los movimientos como revisados con un comentario. Se conservan sus asociaciones actuales y se omiten las comprobaciones de la revisión completa.':'Recorrerás las fases para comprobar los movimientos, sus destinatarios, las previsiones y los importes antes de confirmar.'}</p>
      {forced&&<label className="mt-3 block font-medium">Comentario de revisión directa (obligatorio)<textarea aria-label="Comentario de revisión directa" required maxLength={30000} rows={4} className={input} value={forcedComment} onChange={e=>setForcedComment(e.target.value)}/><span className="text-sm font-normal">Se añadirá a los comentarios de cada movimiento seleccionado.</span></label>}
    </section>}
    {loading ? <p>Cargando previsiones y asignaciones…</p> : <>
      {mode === 'review' && !forced && phase>0 && <BankReviewInsights lines={lines} drafts={drafts} preview={phase>1} phase={phase} plan={memory} onPlan={setMemory} disabled={saving||mode!=='review'}/>}
      {phase === 1 && <>

        {mixed && <p role="alert" className="rounded bg-red-50 p-3">No puedes continuar con movimientos ya revisados. Selecciona únicamente los pendientes.</p>}
        {invalidCharge && <p role="alert" className="rounded bg-red-50 p-3">Cada movimiento debe ser un cargo y todos deben tener el mismo proveedor o empleado asignado previamente.</p>}
      </>}
      {phase === 2 && <>
        {mode==='review' && !forced && lines.filter(l=>Number(l.importe)>0).map(l=><IncomeReviewFields key={l.id_linea_banco} line={l} draft={drafts[l.id_linea_banco]} orders={data.orders} remesas={data.remesas} onChange={value=>patch(l.id_linea_banco,value)} />)}
        {(common ? lines.slice(0,1) : lines).map(l => { const d = drafts[l.id_linea_banco]; if(mode==='review' && Number(l.importe)>0)return <div key={d.id} className="mb-4 rounded border p-4">Ingreso: {d.incomeType} · {d.incomeType==='remesa'?d.remesaIds.join(', '):d.orderId || 'Sin orden'} · {entityName(d) || 'Las cuentas se obtienen de las órdenes asociadas'}{(l.id_proveedor || l.id_agente || l.id_cuenta && d.incomeType!=='remesa' && l.id_cuenta!==d.entityId) && <label className="mt-3 block">Asignación anterior: {previousOwners(l)}<select className={select} value={d.resolution} onChange={e=>patch(d.id,{resolution:e.target.value})}><option value="">Selecciona cómo continuar</option><option value="skip">Omitir</option><option value="overwrite">Sobrescribir asignación</option></select></label>}</div>; return <div key={l.id_linea_banco} className="mb-4 space-y-3 rounded border p-4"><h3>{common ? `Asignación para los ${lines.length} registros` : `${l.id_linea_banco} · ${money(l.importe)} · ${l.concepto}`}</h3>
          {!simpleAssignment && <select aria-label={`Tipo ${l.id_linea_banco}`} disabled={mode === 'charge'} className={select} value={d.entityType} onChange={e => patch(d.id, { entityType:e.target.value, entityId:'', entityChosen:false, chargeId:'', resolution:'', create:false, increase:false })}><option value="proveedor">Proveedor</option><option value="cliente">Cliente / ingreso</option><option value="nomina">Nómina</option>{mode!=='assign'&&<option value="otro">Otro</option>}</select>}
          {d.entityType==='otro'?<p>Movimiento sin proveedor, cliente ni empleado asociado. Puedes añadir un comentario antes de confirmar.</p>:<ReviewRecipientTable key={d.entityType} type={d.entityType} rows={entities(d.entityType)} disabled={mode === 'charge'||saving} value={d.entityChosen?d.entityId:''} onSelect={value=>patch(d.id,{entityType:d.entityType,entityId:value,entityChosen:true,chargeId:value===d.entityId?d.chargeId:'',resolution:'',create:false,increase:false})}/>}
          {!common && (d.entityId || d.entityType==='otro') && (conflict(l,d) ? <div className="rounded bg-amber-50 p-3"><p>Este registro está asignado a {previousOwners(l)}. Se sustituirán también sus vínculos de pago incompatibles.</p><select aria-label={`Resolver ${d.id}`} className={select} value={d.resolution} onChange={e => patch(d.id, { resolution:e.target.value })}><option value="">Debes elegir</option><option value="skip">Desseleccionar esta reasignación</option><option value="overwrite">Sobrescribir con {entityName(d)}</option></select></div> : previousOwners(l) && <p className="rounded bg-blue-50 p-3">Aviso: {d.id} ya está asignado a {entityName(d)}. Puedes continuar.</p>)}
        </div>; })}
      </>}
      {phase === 2 && common && lines.some(l=>drafts[l.id_linea_banco].entityId && previousOwners(l) && !conflict(l,drafts[l.id_linea_banco])) && <p className="mb-3 rounded bg-blue-50 p-3">{lines.filter(l=>drafts[l.id_linea_banco].entityId && previousOwners(l) && !conflict(l,drafts[l.id_linea_banco])).length} registros ya tienen este destinatario. Puedes continuar.</p>}
      {phase === 2 && common && lines.map(l => { const d=drafts[l.id_linea_banco]; return (d.entityId || d.entityType==='otro') && conflict(l,d) ? <div key={d.id} className="mb-3 rounded bg-amber-50 p-3"><p>{d.id}: {previousOwners(l)}{!conflict(l,d) && ' (ya asignado al mismo destinatario)'}</p>{conflict(l,d) && <select aria-label={`Resolver ${d.id}`} className={select} value={d.resolution} onChange={e=>patch(d.id,{resolution:e.target.value})}><option value="">Debes elegir</option><option value="skip">Omitir esta reasignación</option><option value="overwrite">Sobrescribir con {entityName(d)}</option></select>}</div> : null; })}
      {phase >= 3 && (phase === 3 ? (common ? expenseLines.slice(0,1) : expenseLines) : phase === 4 ? expenseLines.filter(l => drafts[l.id_linea_banco].entityType === 'nomina') : active).map(l => { const d = drafts[l.id_linea_banco], c = calculation(l,d); return <section key={d.id} className="mb-4 space-y-3 rounded border p-4"><h3 className="font-semibold">{common && phase === 3 ? `Cargo previsto para los ${active.length} registros` : d.id} · {entityName(d)}{!(common && phase === 3) && ` · ${money(l.importe)}`}</h3>
        {['proveedor','otro'].includes(d.entityType) && mode === 'review' && (phase === 3 || phase === 5) && <label className="block font-medium">Comentarios del movimiento<textarea className={input} rows={4} maxLength={30000} value={d.comments} onChange={e=>patch(d.id,{comments:e.target.value,commentsEdited:true})}/>{common && phase === 3 && <span className="text-sm font-normal text-gray-500">Si editas este campo, se aplicará a todos los seleccionados. En la revisión final puedes ajustar cada comentario.</span>}</label>}
        {phase === 3 && <>
          {d.entityType === 'cliente' ? <label>Orden de cobro (opcional)<select className={select} value={d.orderId} onChange={e => patch(d.id, {orderId:e.target.value})}><option value="">Sin orden</option>{data.orders.filter((o: any) => o.id_cuenta === d.entityId && !o.cancelada).map((o: any) => <option key={o.id_orden} value={o.id_orden}>{o.id_orden} · {money(o.cobro_total)} · {o.fecha_teorica_cobro}</option>)}</select></label> : <>
            {d.entityType === 'nomina' && <div className="space-y-2"><button type="button" role="switch" aria-label="Ex-Empleado" aria-checked={!!d.formerEmployee} className="flex cursor-pointer items-center gap-3 rounded p-3 hover:bg-blue-50" onClick={()=>patch(d.id,{formerEmployee:!d.formerEmployee,chargeId:'',create:false,paymentId:'',increase:false,formerNet:''})}><span className={`relative h-6 w-11 rounded-full ${d.formerEmployee?'bg-blue-950':'bg-slate-400'}`}><span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${d.formerEmployee?'translate-x-5':''}`}/></span>{d.formerEmployee?'Ex-Empleado':'Empleado actual'}</button>{d.formerEmployee&&<p>Ex-Empleado: no se permite crear ni asociar un cargo recurrente. Puedes continuar sin introducirlo.</p>}</div>}
            {!(d.entityType === 'nomina' && d.formerEmployee) && <><label>Cargo recurrente<select className={select} value={d.create ? 'new' : d.chargeId} onChange={e => patch(d.id, { create:e.target.value === 'new', chargeId:e.target.value === 'new' ? '' : e.target.value, ruleIndex:0, increase:false })}><option value="">{charges(d).length ? 'Selecciona o continúa sin asociar' : 'No hay cargos previstos registrados'}</option>{charges(d).map((r: any) => <option key={r.id_cargo_recurrente} value={r.id_cargo_recurrente}>{r.id_cargo_recurrente} · {r.programacion.map((p: any) => `${p.descripcion || ''} ${money(p.total_iva)}`).join(' / ')}</option>)}<option value="new">Crear cargo previsto asociado a {entityName(d)}</option></select></label>
            {d.create && <RecurringChargeForm value={d.chargeDraft} onChange={v => patch(d.id,{chargeDraft:v})} payroll={d.entityType === 'nomina'} vat={d.vat} onVatChange={v => patch(d.id,{vat:v})} />}
            {c.charge?.programacion?.length > 1 && <label>Regla correspondiente<select className={select} value={d.ruleIndex} onChange={e => patch(d.id,{ruleIndex:Number(e.target.value)})}>{c.charge.programacion.map((r: any, i: number) => <option key={i} value={i}>{r.descripcion} · {money(r.total_iva)} · {r.dia ? `${r.dia}/${r.mes}/${r.anio || ''}` : `Cada ${r.cada} ${r.unidad}`}</option>)}</select></label>}
            </>}
            {d.entityType === 'nomina' && mode === 'review' && <p>Cada movimiento conserva su mes y año según su fecha bancaria. En Liquidación de nóminas puedes ajustar el periodo y distinguir nóminas de anticipos individualmente.</p>}         </>}
        </>}
        {phase === 4 && <>
          {d.entityType === 'nomina' && mode === 'review' ? <>
            <p>{l.fecha_valor} · {l.concepto}</p>
            <label>Tipo de este movimiento<select className={select} value={d.payrollKind} onChange={e=>patch(d.id,{payrollKind:e.target.value,adjustment:e.target.value==='anticipo'?String(c.amount):'',increase:false})}><option value="">Selecciona el tipo de pago</option><option value="completa">Nómina completa</option><option value="anticipo">Anticipo</option><option value="adicional">Nómina con importe adicional</option><option value="otros">Otros</option></select></label>
            <div className="flex gap-3"><label>Mes<input className={input} aria-label={`Mes nómina ${d.id}`} value={d.month} maxLength={2} onChange={e=>patch(d.id,{month:e.target.value.replace(/\D/g,''),formerNet:'',payrollId:''})}/></label><label>Año<input className={input} aria-label={`Año nómina ${d.id}`} value={d.year} maxLength={4} onChange={e=>patch(d.id,{year:e.target.value.replace(/\D/g,''),formerNet:'',payrollId:''})}/></label></div>
            {d.payrollKind === 'otros' ? <p>Otros: {money(c.amount)}. Se registrará en el histórico del empleado sin descontarlo como anticipo ni modificar el neto de la nómina mensual.</p> : <>
            <p>{d.formerEmployee?'Ex-Empleado · Sin cargo recurrente. ':''}Nómina prevista: {money(c.expected)}. Periodo: {d.month}/{d.year}.</p>
            {d.formerEmployee && !c.payroll && <label>Neto total de este mes (antes de anticipos)<input className={input} type="number" min="0.01" step="0.01" value={d.formerNet || c.expected} onChange={e=>patch(d.id,{formerNet:e.target.value})}/></label>}
            {c.advances.length ? <><h4>Anticipos pagados</h4>{c.advances.map((a: any) => <p key={a.id}>{a.id} · {money(a.importe_neto)}</p>)}<p>{money(c.expected)} − {money(c.paid)} = {money(c.expected - c.paid)} a pagar.</p></> : !c.pendingAdvances.length && <p>No hay anticipos ni compensaciones.</p>}
            {!!c.pendingAdvances.length && <div className="rounded bg-amber-50 p-3"><h4>Anticipos registrados pendientes de pago</h4>{c.pendingAdvances.map((a:any)=><p key={a.id}>{a.id} · {money(a.importe_neto)}</p>)}<p>Se muestran para comprobarlos; no se deducen hasta que estén pagados.</p></div>}
            {d.payrollKind === 'otros' ? <p>Se registrará como otro pago al empleado, separado de la liquidación mensual y de los anticipos.</p> : d.payrollKind === 'anticipo' ? <label>Importe del anticipo<input className={input} type="number" min="0.01" step="0.01" value={d.adjustment} onChange={e => patch(d.id,{adjustment:e.target.value})} /><span>Movimiento: {money(c.amount)}. Se asociará a esta nómina mensual.</span></label> : d.payrollKind === 'adicional' ? <label>Importe adicional puntual<input className={input} type="number" min="0.01" step="0.01" value={d.adjustment} onChange={e => patch(d.id,{adjustment:e.target.value})} /><span>El movimiento sobresale {money(c.difference)} del importe pendiente. La previsión recurrente se conserva.</span></label> : <><p>{Math.abs(c.difference) < 0.005 ? 'El importe a pagar coincide con el movimiento.' : `Diferencia con el movimiento: ${money(c.difference)}.`}</p>{!d.formerEmployee && c.paid === 0 && !c.pendingAdvances.length && c.difference > 0 && <label className="flex cursor-pointer gap-2 rounded p-3 hover:bg-blue-50"><input className="cursor-pointer" type="checkbox" checked={d.increase} onChange={e => patch(d.id,{increase:e.target.checked})} />Subir la nómina prevista de cada mes a {money(c.amount)}</label>}</>}
            </>}
          </> : null}
        </>}
        {phase === 5 && <>
          <p>Destinatario: {entityName(d)} · {d.entityType}{d.entityType === 'nomina' && d.formerEmployee && ' · Ex-Empleado (sin cargo recurrente)'}</p>
          <p>Movimiento: {money(l.importe)} · {l.fecha_valor}</p>
          {d.entityType !== 'cliente' && <><p>Cargo previsto: {d.create ? 'Se creará al confirmar' : d.chargeId || 'Sin asociar'}</p>{c.charge?.programacion?.map((r:any,i:number)=><p key={i}>{r.descripcion || 'Cargo previsto'} · {money(r.total_iva)} · {c.charge.tipo_programacion==='fechas'?`${r.dia}/${r.mes}/${r.anio||'Todos los años'}`:`Cada ${r.cada} ${r.unidad}`}</p>)}</>}
          {d.entityType === 'proveedor' && <><p>{d.vat?'Con IVA':'Sin IVA'} · Base imponible: {money(c.amount/(d.vat?1.21:1))} · Total: {money(c.amount)}</p>{d.paymentId && <p>Pago previsto: {d.paymentId}</p>}</>}
          {d.entityType === 'cliente' && <p>{d.incomeType==='remesa'?'Remesas: '+d.remesaIds.join(', '):d.incomeType==='otro'?'Otro ingreso sin orden ni remesa asociada':'Orden de cobro: '+(d.orderId || 'Sin asociar')}. {d.incomeType==='remesa'?'Al confirmar se actualizarán los recibos de las remesas y el cobro de sus órdenes y facturas.':d.orderId?'Al confirmar se actualizará el cobro de la orden y su factura.':'El movimiento se guardará sin conciliar una orden de cobro.'}</p>}
          {d.entityType === 'nomina' && mode === 'review' && <>
            <p>{({completa:'Nómina completa',anticipo:'Anticipo',adicional:'Nómina con importe adicional',otros:'Otros'} as Record<string,string>)[d.payrollKind]} · {d.month}/{d.year}</p>
            {d.payrollKind === 'otros' ? <p>Otros: {money(c.amount)}. Se conserva como movimiento independiente del empleado.</p> : <>
            <p>Nómina prevista: {money(c.expected)} − anticipos: {money(c.paid)} = pendiente: {money(c.expected-c.paid)}.</p>
            {d.payrollKind==='otros'?<p>Otro pago de {money(c.amount)}. No modifica el neto mensual ni los anticipos.</p>:d.payrollKind==='anticipo'?<p>Se registrará un anticipo de {money(d.adjustment)} asociado a esta nómina mensual. Restarán {money(c.expected-c.paid-Number(d.adjustment))}.</p>:d.payrollKind==='adicional'?<p>Confirmas un adicional puntual de {money(d.adjustment)}: {money(c.expected-c.paid)} + {money(d.adjustment)} = {money(c.amount)}. La previsión recurrente no se incrementará.</p>:<p>Importe a pagar confirmado: {money(c.amount)}.</p>}
            </>}
          </>}
          {d.increase && <p className="font-semibold text-amber-800">Confirmas subir la previsión de {money(c.expected)} a {money(c.amount)} por mes.</p>}
          {d.resolution === 'overwrite' && <p>Se sobrescribirá la asignación anterior: {previousOwners(l)}.</p>}
          <p>{mode === 'review' ? 'El movimiento quedará revisado.' : 'Se guardará la asociación.'}</p>
        </>}
      </section>; })}
      {phase === 3 && expenseLines.filter(l => drafts[l.id_linea_banco].entityType === 'proveedor').map(l => { const d = drafts[l.id_linea_banco], c = calculation(l,d); return <section key={d.id} aria-label={`Importes del movimiento ${d.id}`} className="mb-4 space-y-3 rounded border p-4"><h3 className="font-semibold">Importes del movimiento {d.id}</h3><><VatToggle value={d.vat} onChange={v=>patch(d.id,{vat:v},true)} /><p>Total: {money(c.amount)} · Base imponible: {money(c.amount / (d.vat ? 1.21 : 1))}</p>{c.charge ? <><p>Previsto: {money(c.expected)} · Diferencia: {money(c.amount - c.expected)}</p>{c.amount > c.expected && <label className="flex cursor-pointer gap-2 rounded p-3 hover:bg-blue-50"><input className="cursor-pointer" type="checkbox" checked={d.increase} onChange={e => patch(d.id,{increase:e.target.checked},true)} />Actualizar el importe previsto de cada mes a {money(c.amount)} por subida de precios.</label>}</> : <p>Sin cargo previsto asociado.</p>}</></section>; })}
      {phase === 5 && lines.length !== active.length && <p>{lines.length - active.length} línea(s) omitidas.</p>}
    </>}
    {error && <p role="alert" className="my-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <footer className="mt-5 flex justify-end gap-3">{stepIndex > 0 && !simpleAssignment && <button type="button" disabled={saving} className={button} onClick={() => {setPhase(steps[stepIndex - 1].id);setError('');}}>Volver atrás</button>}{phase < 5 && !forced && !simpleAssignment ? <button type="button" className={button} disabled={loading || !ready || saving || mixed || invalidCharge} onClick={next}>Continuar</button> : <button type="button" disabled={saving || loading || !ready || (forced && !forcedComment.trim())} className={`${button} bg-green-700 text-white`} onClick={save}>{saving ? 'Guardando…' : 'Confirmar'}</button>}</footer>
  </section>;
  return modal ? <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 p-4"><div className="mx-auto my-6 max-w-5xl">{content}</div></div> : content;
}
