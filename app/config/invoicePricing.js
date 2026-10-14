const rounded=value=>Math.sign(value||1)*Math.round(Math.abs(value));
const cents = value => rounded(Number(value || 0) * 100);
export function calculateInvoicePricing(lines, adjustments = {}, credit = false) {
 const before=lines.map(line=>{
  const qty=Number(line.cantidad||0),unit=Number(line.precio_unitario||0),discount=Number(line.descuento||0),vat=Number(line.iva_porcentaje||0);
  if(![qty,unit,discount,vat].every(Number.isFinite)||qty<0||discount<0||vat<0||line.tipo_descuento!=='importe'&&discount>100)throw Error('Indica importes y descuentos válidos.');
  const gross=cents(qty*unit),mode=line.modo_precio||'calculado';
  if(!['calculado','tachado','gratis','personalizado'].includes(mode)||line.tipo_descuento&&!['porcentaje','importe'].includes(line.tipo_descuento))throw Error('Selecciona un modo de precio y descuento válido.');
  const base=['gratis','tachado'].includes(mode)?0:mode==='personalizado'?cents(line.precio_total_personalizado):Math.sign(gross||1)*Math.round(line.tipo_descuento==='importe'?Math.abs(gross)-cents(discount):Math.abs(gross)*(1-discount/100));
  if(base<0&&!credit||line.tipo_descuento==='importe'&&cents(discount)>Math.abs(gross))throw Error('El descuento no puede superar el precio del servicio.');
  return {...line,base_imponible:base/100};
 });
 const original=before.reduce((sum,line)=>sum+cents(line.base_imponible),0);
 const discount=Number(adjustments.descuento||0),type=adjustments.tipo_descuento||'porcentaje',mode=adjustments.modo_precio||'calculado';
 if(!['calculado','tachado','gratis','personalizado'].includes(mode)||!['porcentaje','importe'].includes(type))throw Error('Selecciona un modo de precio total y descuento válido.');
 if(!Number.isFinite(discount)||discount<0||type==='porcentaje'&&discount>100)throw Error('Indica un descuento general válido.');
 const target=['gratis','tachado'].includes(mode)?0:mode==='personalizado'?cents(adjustments.base_personalizada):Math.sign(original||1)*Math.round(type==='importe'?Math.abs(original)-cents(discount):Math.abs(original)*(1-discount/100));
 if(!Number.isSafeInteger(target)||(credit?target>0:target<0))throw Error('Indica una base imponible válida.');
 if(!before.length&&target)throw Error('Añade servicios a la factura.');
 let allocated=0;
 const eligible=before.map((line,index)=>!['gratis','tachado'].includes(line.modo_precio)&&Number(line.cantidad)>0?index:-1).filter(index=>index>=0);
 if(target&&!eligible.length)throw Error('El total requiere al menos un servicio facturable.');
 const result=before.map((line,index)=>{
  const base=!eligible.includes(index)?0:index===eligible.at(-1)?target-allocated:rounded(original?target*cents(line.base_imponible)/original:target/eligible.length);allocated+=base;
  return {...line,base_antes_ajustes:line.base_imponible,base_imponible:base/100,importe_total:base/100};
 });
 // Round VAT once per tax rate and distribute its residual cent across that
 // group's lines. Discounts must not create an accidental cent per line.
 const rates=[...new Set(result.map(line=>Number(line.iva_porcentaje||0)))];
 for(const rate of rates){
  const group=result.filter(line=>Number(line.iva_porcentaje||0)===rate&&cents(line.base_imponible)!==0),base=group.reduce((sum,line)=>sum+cents(line.base_imponible),0),tax=rounded(base*rate/100);let distributed=0;
  group.forEach((line,index)=>{const share=index===group.length-1?tax-distributed:rounded(base?tax*cents(line.base_imponible)/base:0);distributed+=share;line.importe_total=(cents(line.base_imponible)+share)/100;});
 }
 const rounding=cents(adjustments.redondeo||0);
 if(!Number.isSafeInteger(rounding)||Math.abs(rounding)>2)throw Error('El ajuste de redondeo no puede superar dos céntimos.');
 if(rounding&&!eligible.length)throw Error('Añade un servicio facturable antes de ajustar el redondeo.');
 if(rounding)result[eligible.at(-1)].importe_total=(cents(result[eligible.at(-1)].importe_total)+rounding)/100;
 const total=result.reduce((sum,line)=>sum+cents(line.importe_total),0);
 if(credit?total>0:total<0)throw Error('El signo del total no corresponde al tipo de factura.');
 return {lineas:result,base_imponible:target/100,importe_total:total/100,subtotal:original/100};
}
