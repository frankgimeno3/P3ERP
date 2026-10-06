export function contractProposalPayload(contract, agentId, payments=[], now=new Date()) {
  if (!contract?.id_cuenta_contrato) throw Object.assign(new Error('El contrato necesita una cuenta para crear la propuesta.'),{status:400});
  if (!agentId) throw Object.assign(new Error('No se ha identificado al agente actual.'),{status:401});
  const format=date=>new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
  const today=format(now),expiry=format(new Date(now.getTime()+30*86400000));
  const source=contract.propuesta_snapshot||{};
  const paymentDate=value=>{
    const local=String(value||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const iso=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return local?Date.UTC(Number(local[3]),Number(local[2])-1,Number(local[1])):iso?Date.UTC(Number(iso[1]),Number(iso[2])-1,Number(iso[3])):null;
  };
  const anchor=payments.map(payment=>paymentDate(payment.fecha_cobro)).find(value=>value!==null);
  const lines=contract.lineas_contrato?.length?contract.lineas_contrato:source.lineas||[];
  return {
    id_agente_propuesta:agentId,id_cuenta_propuesta:contract.id_cuenta_contrato,id_contacto_propuesta:contract.id_contacto_contrato||'',
    estado_propuesta:'Borrador',fase_propuesta:'1',fecha_envio_propuesta:today,fecha_validez_propuesta:expiry,
    nombre_propuesta:`${contract.nombre_contrato||contract.id_contrato} · ${today}`,
    comentarios_adicionales:contract.comentarios_adicionales||'',comentarios_seguimiento:`Creada a partir del contrato ${contract.id_contrato}.`,
    forma_cobro_propuesta:contract.forma_cobro_contrato||'',descuento_final_propuesta:Number(contract.descuento_final_contrato||0),
    tipo_descuento_final:source.tipo_descuento_final||'porcentaje',importe_total_bi_propuesta:Number(contract.importe_total_bi_contrato||0),
    importe_propuesta_con_iva:Number(contract.importe_contrato_con_iva||0),iva_aplicable:Boolean(contract.iva_aplicable),
    moneda:contract.moneda||source.moneda||'EUR',idioma_propuesta:source.idioma_propuesta||'es',
    datos_facturacion:contract.datos_facturacion||{},contacto_personalizado:source.contacto_personalizado||{},
    base_imponible_personalizada:Boolean(source.base_imponible_personalizada),importe_base_personalizada:Number(source.importe_base_personalizada||0),
    es_intercambio:Boolean(contract.es_intercambio),importe_intercambio:Number(contract.importe_intercambio||0),condiciones_intercambio:contract.condiciones_intercambio||'',
    lineas:lines.map((line,index)=>({
      numero_linea_propuesta:index+1,id_servicio:line.id_servicio||'personalizado',id_publicacion:line.id_publicacion||'',
      medio:line.medio||'',publicacion:line.publicacion||'',producto:line.producto||'',
      precio_tarifa:Number(line.precio_tarifa||0),descuento_producto:Number(line.descuento_producto||0),tipo_descuento_producto:line.tipo_descuento_producto||'porcentaje',
      precio_unitario:Number(line.precio_unitario??line.precio_producto??0),unidades:Number(line.unidades||1),descripcion_linea:line.descripcion_linea||'',
      especificaciones_linea:line.especificaciones_linea||'',modo_precio:line.modo_precio||'calculado',precio_total_personalizado:line.precio_total_personalizado==null?null:Number(line.precio_total_personalizado),
      deadline_publicacion:line.deadline_publicacion||'',fecha_publicacion_publicacion:line.fecha_publicacion_publicacion||'',id_pagina_publicacion:line.id_pagina_publicacion||'',
    })),
    cobros:contract.es_intercambio?[]:payments.map((payment,index)=>({numero_cobro:index+1,fecha_cobro:format(new Date(now.getTime()+(paymentDate(payment.fecha_cobro)!==null&&anchor!=null?paymentDate(payment.fecha_cobro)-anchor:0))),importe_cobro:Number(payment.importe_cobro||0),forma_cobro:payment.forma_cobro||'',banco_cobro:payment.banco_cobro||'',observaciones_cobro:payment.observaciones_cobro||''})),
  };
}
