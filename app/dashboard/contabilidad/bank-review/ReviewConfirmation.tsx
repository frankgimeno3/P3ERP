'use client';

import { money, type ReviewLineContext } from './ReviewPhaseContext';

export default function ReviewConfirmation({ context, line: l, draft: d, calculation: c }: ReviewLineContext) {
  const { phase, mode, entityName, previousOwners } = context;
  return <>{phase === 5 && <>
          <p>Destinatario: {entityName(d)} · {d.entityType}{d.entityType === 'nomina' && d.formerEmployee && ' · Ex-Empleado (sin cargo recurrente)'}</p>
          <p>Movimiento: {money(l.importe)} · {l.fecha_valor}</p>
          {d.entityType !== 'cliente' && <><p>Cargo previsto: {d.create ? 'Se creará al confirmar' : d.chargeId || 'Sin asociar'}</p>{c.charge?.programacion?.map((r:any,i:number)=><p key={i}>{r.descripcion || 'Cargo previsto'} · {money(r.total_iva)} · {c.charge.tipo_programacion==='fechas'?`${r.dia}/${r.mes}/${r.anio||'Todos los años'}`:`Cada ${r.cada} ${r.unidad}`}</p>)}</>}
          {d.entityType === 'proveedor' && <><p>{d.vat?'Con IVA':'Sin IVA'} · Base imponible: {money(c.amount/(d.vat?1.21:1))} · Total: {money(c.amount)}</p>{d.paymentId && <p>Pago previsto: {d.paymentId}</p>}</>}
          {d.entityType === 'cliente' && <p>{d.incomeType==='remesa'?'Remesas: '+d.remesaIds.join(', '):d.incomeType==='otro'?'Otro ingreso sin orden ni remesa asociada':'?rdenes de cobro: '+(d.orderIds?.length?d.orderIds.join(', '):d.orderId || 'Sin asociar')}. {d.incomeType==='remesa'?'Al confirmar se actualizarán los recibos de las remesas y el cobro de sus órdenes y facturas.':d.orderId?'Al confirmar se actualizará el cobro de la orden y su factura.':'El movimiento se guardará sin conciliar una orden de cobro.'}</p>}
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
        </>}</>;
}
