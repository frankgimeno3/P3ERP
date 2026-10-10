'use client';

import { money, input, select, type ReviewLineContext } from './ReviewPhaseContext';

export default function ReviewPayrollFields({ context, line: l, draft: d, calculation: c }: ReviewLineContext) {
  const { phase, mode, patch } = context;
  return <>{phase === 4 && <>
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
        </>}</>;
}
