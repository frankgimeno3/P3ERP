export const administrativeIssueTabs = [
  ['todas','Todas'],['contrato','Sin contrato'],['importe','Sin importe'],
  ['forma','Sin forma de cobro'],['fecha','Sin fecha de cobro'],['factura','Pendientes de facturar'],
];
const missing=value=>!String(value??'').trim()||['-','no procede','sin determinar'].includes(String(value).trim().toLowerCase());
export function administrativeOrderIssues(order){
  if(order.cancelada || order.datos_importacion?.cierre_cobro?.activo)return [];
  const issues=[];
  const monetary=!order.datos_importacion?.sin_cobro_monetario&&!['intercambio','gratuito'].includes(String(order.forma_cobro||'').toLowerCase());
  if(missing(order.id_contrato))issues.push('contrato');
  if(monetary){
    if(order.cobro_total==null||order.cobro_total===''||!Number.isFinite(Number(order.cobro_total))||Number(order.cobro_total)<=0)issues.push('importe');
    if(missing(order.forma_cobro))issues.push('forma');
    if(missing(order.fecha_teorica_cobro)&&missing(order.fecha_real_cobro))issues.push('fecha');
    if(missing(order.id_factura))issues.push('factura');
  }
  return issues;
}
