export function serviceLineBase(line) {
  const number=value=>Number(value || 0);
  if(['gratis','tachado'].includes(line.modo_precio))return 0;
  if(line.modo_precio==='personalizado')return number(line.precio_total_personalizado);
  const gross=number(line.precio_unitario)*number(line.unidades);
  return line.tipo_descuento_producto==='importe'?Math.max(0,gross-number(line.descuento_producto)):gross*(1-number(line.descuento_producto)/100);
}
