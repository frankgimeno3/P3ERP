export const JUAN_MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export function juanDate(value) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return '';
    return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return '';
  const date=value.slice(0,10), [y,m,d]=date.split('-').map(Number), check=new Date(Date.UTC(y,m-1,d));
  return check.getUTCFullYear()===y && check.getUTCMonth()===m-1 && check.getUTCDate()===d ? date : '';
}
export function juanDateEs(value) { const date=juanDate(value); return date ? date.split('-').reverse().join('.') : '—'; }
export function validateJuanReport(report) {
  const errors=[];
  const numeric=(key,label,min=-Infinity)=>{const value=report?.[key]; if(value==null || typeof value==='boolean' || String(value).trim()==='' || !Number.isFinite(Number(value)) || Number(value)<min) errors.push(label);};
  if(!['normal','anticipo','informativa'].includes(report?.tipo)) errors.push('tipo de informe');
  if(!Number.isInteger(Number(report?.mes)) || Number(report?.mes)<1 || Number(report?.mes)>12) errors.push('mes');
  if(!Number.isInteger(Number(report?.anio)) || Number(report?.anio)<2000 || Number(report?.anio)>2100) errors.push('año');
  if(!juanDate(report?.fecha)) errors.push('fecha válida');
  numeric('importe_ajuste','importe anterior a compensar');
  if(report?.tipo!=='anticipo') {
    numeric('horas','horas',0); numeric('horas_enteras','horas enteras',0); numeric('minutos','minutos',0);
    if(!Number.isInteger(Number(report?.horas_enteras)) || !Number.isInteger(Number(report?.minutos)) || Number(report?.minutos)>59) errors.push('horas y minutos válidos');
    numeric('precio_hora','precio por hora',0); numeric('importe_generado','remuneración total',0);
  }
  if(report?.tipo!=='normal') numeric('importe_anticipo','importe anticipado',0);
  if(report?.tipo!=='informativa') numeric('importe_pagar','total entregado',0);
  if(report?.tipo==='normal' && Number(report?.importe_ajuste)!==0 && !report?.motivo_ajuste?.trim()) errors.push('motivo del ajuste');
  return [...new Set(errors)];
}
export function juanReportBlocks(report) {
  const money=value=>value==null?'—':new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(value));
  const adjustment=Number(report.importe_ajuste), blocks=[];
  const add=(text,bold=false,gap=false)=>blocks.push({text,bold,gap});
  add(`Remuneración J correspondiente mes de ${JUAN_MONTHS[report.mes-1] || '—'}${report.tipo==='anticipo'?' (anticipada)':report.tipo==='informativa'?' (informativa)':''}`,true);
  if(report.tipo!=='anticipo') {
    add(`Horas totales realizadas: ${report.horas_enteras ?? '—'} horas, ${report.minutos ?? '—'} min (${report.horas==null?'—':Number(report.horas).toFixed(2).replace('.',',')} horas)`,false,true);
    add(`Precio / hora: ${money(report.precio_hora)} / 1 hora`);
    add(`Remuneración total: ${money(report.importe_generado)}`);
  }
  if(report.tipo==='normal') {
    add('Importes anteriores a compensar',true,true);
    add(adjustment===0?'No hay importes anteriores a compensar.':`${adjustment>0?'Adeudado a Juan':'Adeudado por Juan'}: ${report.motivo_ajuste || '—'} — ${money(Math.abs(adjustment))}`);
    add(`Total entregado a ${juanDateEs(report.fecha)}: ${money(report.importe_pagar)}`,true,true);
  }
  if(report.tipo==='anticipo') {
    add(`Remuneración total: ${money(report.importe_anticipo)}`,false,true);
    add(`Total entregado a ${juanDateEs(report.fecha)}: ${money(report.importe_pagar)}`);
    add('La diferencia entre las horas reales y las anticipadas será ajustada en el próximo cierre.',false,true);
  }
  if(report.tipo==='informativa') {
    add(`Importe anticipado: ${money(report.importe_anticipo)}`,false,true);
    add(`${adjustment>=0?'Adeudado a Juan':'Adeudado por Juan'}: ${money(Math.abs(adjustment))}`);
    add('Este es un documento informativo, no hay “Recibí”.',false,true);
  } else {add('RECIBÍ:',true,true);add(`(A fecha ${juanDateEs(report.fecha)})`);}
  return blocks;
}
