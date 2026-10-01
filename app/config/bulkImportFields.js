const field=(key,type='text',required=false)=>({key,type,required});
export const bulkImportTypes={
  contratos:{label:'Contratos',table:'comercial_contratos',id:'id_contrato',account:'id_cuenta_contrato',fields:[
    field('id_contrato','text',true),field('id_cuenta_contrato','text',true),field('nombre_contrato','text',true),field('id_agente_contrato'),field('id_contacto_contrato'),
    field('fecha_firma_contrato','date'),field('fecha_fin_contrato','date'),field('importe_total_bi_contrato','amount',true),field('importe_contrato_con_iva','amount',true),field('iva_aplicable','boolean'),field('comentarios_adicionales'),
  ]},
  facturas:{label:'Facturas',table:'administracion_facturas_clientes',id:'id_factura_cliente',account:'id_cuenta',fields:[
    field('id_factura_cliente','text',true),field('id_cuenta','text',true),field('id_contrato'),field('numero_factura'),field('fecha_emision','date'),field('fecha_vencimiento','date'),field('base_imponible','amount',true),field('importe_total','amount',true),field('forma_cobro','payment'),field('comentarios'),
  ]},
  ordenes:{label:'Órdenes',table:'tesoreria_ordenes',id:'id_orden',account:'id_cuenta',fields:[
    field('id_orden','text',true),field('id_cuenta','text',true),field('id_contrato'),field('id_factura'),field('numero_cobro','integer',true),field('etiqueta_cobro'),
    field('fecha_teorica_cobro','date',true),field('forma_cobro','payment',true),field('banco_cobro','bank',true),field('base_imponible','amount',true),field('cobro_total','amount',true),
  ]},
};
export const bulkPolicies={update:'Actualizar únicamente campos con valor',skip:'Omitir registros existentes',block:'Resolver cada registro existente'};
