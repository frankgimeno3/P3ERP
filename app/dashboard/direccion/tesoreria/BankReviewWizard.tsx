'use client';
import { useReviewResources } from './bank-review/useReviewResources';
import {request} from '@/app/lib/request';
import {forecastRuleVat} from '@/app/lib/forecastVat';
import InternalTransferModal from './InternalTransferModal';
import BankReviewInsights, { type ReviewMemoryPlan } from './BankReviewInsights';
import { useEffect, useState } from 'react';
import { newCharge, reviewButton as button } from './RecurringChargeForm';

import ReviewRecipients from './bank-review/ReviewRecipients';
import ReviewChargeFields from './bank-review/ReviewChargeFields';
import ReviewPayrollFields from './bank-review/ReviewPayrollFields';
import ReviewConfirmation from './bank-review/ReviewConfirmation';
import ReviewSupplierAmounts from './bank-review/ReviewSupplierAmounts';
import { calculateReviewLine } from './bank-review/ReviewCalculations';
import { validateReviewPhase } from './bank-review/ReviewValidation';
import type { ReviewPhaseContext } from './bank-review/ReviewPhaseContext';

const money = (v: any) => Number(v || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const input = 'w-full rounded border bg-white p-2';
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
  const [transferOpen,setTransferOpen]=useState(false);
  const [phase, setPhase] = useState(mode === 'review' ? 0 : mode === 'charge' ? 3 : 2), [error, setError] = useState(''), [saving, setSaving] = useState(false), [loading, setLoading] = useState(true), [ready, setReady] = useState(false);
  const [data, setData] = useState<any>({ providers: [], clients: [], employees: [], charges: [], payrolls: [], advances: [], orders: [], forecasts: [], remesas: [] });
  const [drafts, setDrafts] = useState<any>(() => Object.fromEntries(lines.map(l => [l.id_linea_banco, {
    id: l.id_linea_banco, version: l.updated_at, entityType: mode === 'assign' && compactAssignment ? 'proveedor' : initialEmployeeId || l.id_agente ? 'nomina' : l.id_cuenta || Number(l.importe) > 0 ? 'cliente' : 'proveedor', entityId: mode === 'assign' && lines.length > 1 ? '' : initialEmployeeId || l.id_agente || l.id_cuenta || l.id_proveedor || '',
    entityChosen: mode === 'charge', formerEmployee: l.nomina_revision?.ex_empleado === true, formerNet: '', payrollKind: l.nomina_revision?.decision && ['completa','anticipo','adicional','otros'].includes(l.nomina_revision.decision) ? l.nomina_revision.decision : '', chargeId: l.id_cargo_recurrente ? String(l.id_cargo_recurrente) : '', paymentId: l.id_pago || '', payrollId: '', month: String(l.nomina_revision?.mes || String(l.fecha_valor || '').split('/')[1] || ''), year: String(l.nomina_revision?.anio || String(l.fecha_valor || '').split('/')[2] || ''), adjustment: '', increase: false, vat: true, chargeVat: true, ruleIndex: 0, create: false, chargeDraft: newMovementCharge(l), resolution: '', comments: l.comentarios || '', commentsEdited:false, orderId: l.id_orden || '', orderIds:l.ordenes_cobro || (l.id_orden?[l.id_orden]:[]), incomeType:l.tipo_ingreso || '', remesaIds:l.remesa_ids || []
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
  useReviewResources(setData, setDrafts, setReady, setError, setLoading);
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
  const calculation = (line: any, draft: any) => calculateReviewLine(context, line, draft);
  const preparedCharge = (d: any) => ({ ...d.chargeDraft, requires_vat_confirmation: d.entityType !== 'nomina', programacion: d.chargeDraft.programacion.map((r: any) => forecastRuleVat(r, d.entityType === 'nomina')) });
  const validatePhase = () => validateReviewPhase({ ...context, mixed, invalidCharge });
  const next = () => { const message = validatePhase(); setError(message); if (!message) setPhase(steps[stepIndex + 1].id); };
  const save = async () => {
    const message = forced ? (mixed ? 'Selecciona solamente movimientos sin revisar.' : !forcedComment.trim() ? 'El comentario de revisión forzada es obligatorio.' : '') : validatePhase(); if (message) { setError(message); return; }
    setSaving(true); setError('');
    try {
      const items = lines.map(l => { const d = drafts[l.id_linea_banco], c = calculation(l, d); return { ...d, newCharge: d.create ? preparedCharge(d) : undefined, expectedSchedule: c.charge?.programacion, expectedPayroll: c.expected, expectedAdvances: c.paid, payrollId: c.payroll?.id }; });
      const r = await request('/api/v1/direccion/bancos/revision', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:forced?'force-review':'workflow', forcedComment:forced?forcedComment:undefined, mode, memory: !forced && (memory.allocations.length || memory.decisions.length) ? memory : undefined, ids:lines.map(l => l.id_linea_banco), items }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.message); onSaved();
    } catch (e: any) { setError(e.message || 'No se pudo guardar.'); } finally { setSaving(false); }
  };
  const context: ReviewPhaseContext = { phase, mode, forced, common, simpleAssignment, saving, lines, active, expenseLines, drafts, data, patch, entities, entityName, conflict, previousOwners, charges, calculation };
  if(transferOpen)return <InternalTransferModal line={lines[0]} onClose={()=>setTransferOpen(false)} onSaved={onSaved}/>;
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
      {lines.length===1&&<button type="button" disabled={saving} onClick={()=>setTransferOpen(true)} className={`${button} mb-4`}>Traspaso propio · revisar ambos bancos</button>}
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
<ReviewRecipients context={context}/>
            {phase >= 3 && (phase === 3 ? (common ? expenseLines.slice(0,1) : expenseLines) : phase === 4 ? expenseLines.filter(l => drafts[l.id_linea_banco].entityType === 'nomina') : active).map(l => { const d = drafts[l.id_linea_banco], c = calculation(l,d); return <section key={d.id} className="mb-4 space-y-3 rounded border p-4"><h3 className="font-semibold">{common && phase === 3 ? `Cargo previsto para los ${active.length} registros` : d.id} · {entityName(d)}{!(common && phase === 3) && ` · ${money(l.importe)}`}</h3>
        {['proveedor','otro'].includes(d.entityType) && mode === 'review' && (phase === 3 || phase === 5) && <label className="block font-medium">Comentarios del movimiento<textarea className={input} rows={4} maxLength={30000} value={d.comments} onChange={e=>patch(d.id,{comments:e.target.value,commentsEdited:true})}/>{common && phase === 3 && <span className="text-sm font-normal text-gray-500">Si editas este campo, se aplicará a todos los seleccionados. En la revisión final puedes ajustar cada comentario.</span>}</label>}
<ReviewChargeFields context={context} line={l} draft={d} calculation={c}/>
      <ReviewPayrollFields context={context} line={l} draft={d} calculation={c}/>
      <ReviewConfirmation context={context} line={l} draft={d} calculation={c}/>
            </section>; })}
<ReviewSupplierAmounts context={context}/>
            {phase === 5 && lines.length !== active.length && <p>{lines.length - active.length} línea(s) omitidas.</p>}
    </>}
    {error && <p role="alert" className="my-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <footer className="mt-5 flex justify-end gap-3">{stepIndex > 0 && !simpleAssignment && <button type="button" disabled={saving} className={button} onClick={() => {setPhase(steps[stepIndex - 1].id);setError('');}}>Volver atrás</button>}{phase < 5 && !forced && !simpleAssignment ? <button type="button" className={button} disabled={loading || !ready || saving || mixed || invalidCharge} onClick={next}>Continuar</button> : <button type="button" disabled={saving || loading || !ready || (forced && !forcedComment.trim())} className={`${button} bg-green-700 text-white`} onClick={save}>{saving ? 'Guardando…' : 'Confirmar'}</button>}</footer>
  </section>;
  return modal ? <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 p-4"><div className="mx-auto my-6 max-w-5xl">{content}</div></div> : content;
}
