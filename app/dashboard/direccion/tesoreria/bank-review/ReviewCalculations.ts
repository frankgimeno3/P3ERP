import type { ReviewPhaseContext } from './ReviewPhaseContext';

export function calculateReviewLine(context: ReviewPhaseContext, l: any, d: any) {
  const { data, charges, mode, active, drafts } = context;
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
  }
