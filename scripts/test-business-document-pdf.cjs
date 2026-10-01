/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function compile(file,dependencies={}){
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 const mod={exports:{}};new Function('require','module','exports',code)(id=>dependencies[id]||require(id),mod,mod.exports);return mod.exports;
}
const pdf=compile('app/lib/businessDocumentPdf.ts');
const contract=compile('app/lib/contractDocumentModel.ts',{'./businessDocumentPdf':pdf});
(async()=>{
 const source={id_contrato:'C26.TEST',nombre_empresa:'Cliente',propuesta_snapshot:{idioma_propuesta:'en'},importe_total_bi_contrato:100,importe_contrato_con_iva:121,lineas_contrato:[{producto:'Advertisement',producto_documento_es:'Anuncio',unidades:1,precio_unitario:100}],ordenes:[]};
 assert.equal(contract.contractDocumentModel(source).title,'Advertising services contract');
 const gm=contract.contractDocumentModel(source,true);assert.equal(gm.title,'Contrato de servicios publicitarios');assert.equal(gm.body[0][0],'Anuncio');
 const exchange=contract.contractDocumentModel({...source,es_intercambio:true,importe_intercambio:121,importe_contrato_con_iva:0,condiciones_intercambio:'Servicios a cambio'},true);assert(exchange.notes.includes('Servicios a cambio'));assert(exchange.totals.some(row=>row[0]==='Valor ofrecido en intercambio'));assert.equal(exchange.payments.length,0);
 const document=await pdf.buildDocumentPdf(gm);assert.equal(document.getNumberOfPages(),1);assert(document.output().startsWith('%PDF'));
 const many=await pdf.buildDocumentPdf({...gm,body:Array.from({length:130},(_,i)=>['Servicio '+i,'Detalle extenso del servicio', '1','100 EUR','100 EUR'])});assert(many.getNumberOfPages()>2);
 const sample=pdf.invoiceDocumentModel({base_imponible:100,importe_total:121,lineas:[{concepto:'Global',precio_no_desglosado:true,base_imponible:100,iva_porcentaje:21}],ordenes:[{cancelada:true,cobro_total:121}]});assert.equal(sample.body[0][2],'—');assert.equal(sample.payments.length,0);
 const input=path.join(process.env.TEMP||process.env.TMPDIR||'/tmp','p3erp-document-test-data.json');
 if(fs.existsSync(input)){
  const data=JSON.parse(fs.readFileSync(input,'utf8'));const logo='data:image/png;base64,'+fs.readFileSync('public/invoices/proporcion3-letterhead.png').toString('base64');
  for(const [name,model] of [['invoice',pdf.invoiceDocumentModel(data.invoice)],['contract-original',contract.contractDocumentModel(data.contract)],['contract-gm',contract.contractDocumentModel(data.contract,true)]]){
   const actual=await pdf.buildDocumentPdf(model,logo);fs.writeFileSync(path.join(path.dirname(input),'p3erp-'+name+'.pdf'),Buffer.from(actual.output('arraybuffer')));console.log(name+': '+actual.getNumberOfPages()+' page(s)');
  }
 }
 console.log('PASS: Spanish GM, original language, unitemized prices, cancelled orders, PDF generation and multiple pages');
})().catch(error=>{console.error(error);process.exitCode=1;});
