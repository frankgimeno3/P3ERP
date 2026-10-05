export function validInvoiceDate(value) {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const [, d, m, y] = match.map(Number), date = new Date(Date.UTC(y, m - 1, d));
  return y >= 1900 && y <= 9999 && date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
export function validateSupplierInvoiceValues(data,{required=false}={}){
  const fail=message=>{throw Object.assign(new Error(message),{status:400});};
  const present=value=>value!==''&&value!==null&&value!==undefined;
  const parse=value=>Number(typeof value==='string'?value.replace(',','.'):value);
  const base=present(data.base_imponible)?parse(data.base_imponible):null,total=present(data.importe_total)?parse(data.importe_total):null;
  if(required&&(base===null||total===null))fail('Completa la base imponible y el total de la factura.');
  for(const amount of [base,total])if(amount!==null&&(!Number.isFinite(amount)||amount<0||amount>9999999999.99))fail('Los importes deben ser finitos y no negativos.');
  if(base!==null&&total!==null&&base>total)fail('La base imponible no puede superar el total.');
  if((required||present(data.fecha_factura))&&!validInvoiceDate(data.fecha_factura))fail('Indica una fecha de factura válida.');
  return data;
}
export function validateSupplierInvoice(data) {
  validateSupplierInvoiceValues(data,{required:true});
  const fail = message => { const error = new Error(message); error.status = 400; throw error; };
  const total = Number(data.importe_total), base = Number(data.base_imponible);
  if (!data.id_proveedor || !String(data.numero_factura_proveedor || '').trim() || !validInvoiceDate(data.fecha_factura) || !data.documento_src) fail('Completa el proveedor, número, fecha válida y PDF de la factura.');
  if (data.importe_total === '' || data.base_imponible === '' || data.base_imponible == null || !Number.isFinite(total) || total <= 0 || total > 9999999999.99 || !Number.isFinite(base) || base < 0 || base > total) fail('Revisa la base imponible y el total de la factura.');
  if (!Array.isArray(data.pagos) || !data.pagos.length) fail('Añade los vencimientos de la factura.');
  for (const pago of data.pagos) {
    pago.forma=String(pago.forma||'').trim().toLowerCase().replace(/^pagare$/,'pagaré');
    if(!['recibo','transferencia','pagaré'].includes(pago.forma))fail('Selecciona recibo, transferencia o pagaré para cada pago.');
    if (!String(pago.forma || '').trim() || !validInvoiceDate(pago.fecha) || pago.importe === '' || !Number.isFinite(Number(pago.importe)) || Number(pago.importe) <= 0) fail('Completa la forma, fecha válida e importe positivo de cada pago.');
    if (!['Sabadell', 'Santander'].includes(pago.banco)) fail('Selecciona el banco de cada pago.');
  }
  if (data.pagos.reduce((sum, pago) => sum + Math.round(Number(pago.importe) * 100), 0) !== Math.round(total * 100)) fail('Los pagos deben cuadrar exactamente con el total.');
  return data;
}
