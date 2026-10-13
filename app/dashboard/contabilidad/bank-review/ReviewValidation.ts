import type { ReviewPhaseContext } from './ReviewPhaseContext';
import {forecastRuleVat} from '@/app/lib/forecastVat';

export function validateReviewPhase(context: ReviewPhaseContext & { mixed: boolean; invalidCharge: boolean }) {
  const { mixed, invalidCharge, phase, mode, active, drafts, data, entities, conflict, calculation } = context;
    if (mixed) return 'No puedes revisar una selección con registros ya revisados. Desmárcalos y vuelve a abrir el proceso.';
    if (invalidCharge) return 'Asigna primero todos los cargos a un proveedor o una nómina. Los ingresos no admiten cargos previstos.';
    if (phase === 0) return '';
    if (mode === 'review' && phase >= 2) for (const l of active.filter(l=>Number(l.importe)>0)) {
      const d=drafts[l.id_linea_banco];
      if(!d.incomeType)return 'Indica el tipo de cada ingreso en Identificar cobros.';
      if(d.incomeType==='remesa' && !d.remesaIds?.length)return 'Selecciona al menos una remesa para cada ingreso de remesa.';
      if(d.incomeType==='transferencia' && !d.orderId && !d.orderIds?.length)return 'Selecciona la orden de transferencia.';
      const expected=d.incomeType==='remesa'?d.remesaIds.reduce((n:number,id:string)=>n+Number(data.remesas.find((r:any)=>r.id_remesa===id)?.importe_total || 0),0):(d.orderIds?.length?d.orderIds:[d.orderId]).reduce((n:number,id:string)=>n+Number(data.orders.find((o:any)=>o.id_orden===id)?.cobro_total || 0),0);
      if(d.incomeType!=='otro' && Math.round(expected*100)!==Math.round(Number(l.importe)*100))return 'El importe seleccionado debe coincidir con el movimiento bancario.';
    }
    if (phase >= 2) {
      if (!active.length) return 'No quedan líneas seleccionadas.';
      for (const l of active) {
        const d = drafts[l.id_linea_banco], c = calculation(l, d);
        if (phase >= 3 && d.create) {
          try { d.chargeDraft.programacion.forEach((r: any) => forecastRuleVat(r, d.entityType === 'nomina')); }
          catch (error: any) { return error.message; }
        }
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
  }
