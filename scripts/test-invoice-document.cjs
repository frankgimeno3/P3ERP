/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const base='app/dashboard/administracion/facturas-clientes/[id_factura]/InvoiceDocument';
const compiled=ts.transpileModule(fs.readFileSync(base+'.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
const mod={exports:{}};
// Sorting is covered separately; render the document's table without browser hooks.
new Function('require','module','exports',compiled)(id=>id==='@/app/components/SortableTable'?{__esModule:true,default:props=>React.createElement('table',props)}:id.endsWith('.css')?{__esModule:true,default:new Proxy({},{get:(_,key)=>key})}:require(id),mod,mod.exports);
const render=invoice=>renderToStaticMarkup(React.createElement(mod.exports.default,{invoice}));
const sample={nombre_empresa:'Cliente de prueba',codigo_cliente:'123',base_imponible:100,importe_total:121,iva_porcentaje:21,datos_fiscales:{nombre_fiscal:'Cliente fiscal',direccion_facturacion:'Dirección fiscal'},cuenta_documento:{direccion_facturacion:'Dirección actual'},lineas:[{id_linea_factura:'line',concepto:'Servicio <seguro>',cantidad:1,precio_unitario:0,precio_no_desglosado:true,base_imponible:100,iva_porcentaje:21}],ordenes:[{id_orden:'order',fecha_teorica_cobro:'2026-12-15',cobro_total:121},{id_orden:'cancelled',cancelada:true,fecha_teorica_cobro:'2000-01-01'}]};
const html=render(sample);
assert(html.includes('FACTURA PREVIA'));assert(html.includes('Sin número'));assert(html.includes('Cliente fiscal'));assert(html.includes('Dirección fiscal'));assert(!html.includes('Dirección actual'));assert(html.includes('Servicio &lt;seguro&gt;'));assert(html.includes('sin desglose'));assert(html.includes('121,00'));assert(html.includes('15/12/2026'));assert(!html.includes('01/01/2000'));
const issued=render({...sample,verifactu_estado_envio:'factura emitida',numero_factura:'526148',datos_fiscales:{}});
assert(!issued.includes('Dirección actual'));assert(!issued.includes('FACTURA PREVIA'));assert(issued.includes('526148'));
const retained=render({...sample,importe_total:106,lineas:[{...sample.lineas[0],retencion_porcentaje:15}]});
assert(render({...sample,factura_tipo:'abono',numero_factura:'A526001',importe_total:-121}).includes('FACTURA ABONO'));
assert(retained.includes('Retención'));assert(retained.includes('21,00'));assert(retained.includes('106,00'));
const dataFile=path.join(process.env.TEMP,'p3erp-invoice-preview-data.json');
if(fs.existsSync(dataFile)){
  const invoice=JSON.parse(fs.readFileSync(dataFile,'utf8'));
  const actual=render(invoice);assert(actual.includes('3.335,97'));assert(actual.includes('2.757,00'));assert(actual.includes('65239'));
  const image=fs.readFileSync('public/invoices/proporcion3-letterhead.png').toString('base64');
  const preview=actual.replaceAll('/invoices/proporcion3-letterhead.png','data:image/png;base64,'+image);
  fs.writeFileSync(path.join(process.env.TEMP,'p3erp-invoice-preview.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><style>body{margin:0}*{box-sizing:border-box}${fs.readFileSync(base+'.module.css','utf8')}</style>${preview}</html>`);
}
console.log('PASS: document amounts, missing fields, fiscal snapshot, draft status, escaping and active due dates');
