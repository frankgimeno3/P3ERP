const cents=value=>Math.round(Number(value)*100);
const money=value=>Number(String(value).replace(/\./g,'').replace(',','.'));
const lineText=row=>row.items.map(item=>item.text).join(' ').trim();
const moneyPattern='-?\\d[\\d.]*,\\d{2}';
const validDate=value=>{const [day,month,year]=value.split('/').map(Number),date=new Date(Date.UTC(year,month-1,day));if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new Error('Fecha no válida: '+value);return value;};
export function parsePublicidadPdf(document){
  const text=document.pages.map(page=>page.text).join('\n');
  if(!text.trim())throw new Error('Documento escaneado: requiere lectura visual.');
  const header=text.match(/(?:FACTURA|ABONO) FECHA NIF\/CIF C[oó]digo Cliente:\s*(\d+)\s*\n(\d+)\s+(\d{2}\/\d{2}\/\d{4})(?:[ \t]+([^\n]+))?/);
  if(!header)throw new Error('Cabecera no reconocida.');
  validDate(header[3]);
  const totalMatches=[...text.matchAll(new RegExp('Base Imponible I\\.V\\.A\\. Importe I\\.V\\.A\\. TOTAL EUROS\\s*\\n('+moneyPattern+')\\s+('+moneyPattern+')\\s+('+moneyPattern+')\\s+('+moneyPattern+')','g'))];
  if(totalMatches.length!==1)throw new Error('Totales no reconocidos o repetidos.');
  const [,base,iva,impuesto,total]=totalMatches[0].map((value,index)=>index?money(value):value);
  if(cents(base)+cents(impuesto)!==cents(total)||Math.abs(Math.round(base*iva)-cents(impuesto))>1)throw new Error('Impuestos y total no cuadran.');
  const abono=total<0||/ABONO/i.test(document.file);
  const numero=(abono?'A':'')+header[2];
  const first=document.pages[0].lines,headerIndex=first.findIndex(row=>/^(FACTURA|ABONO) FECHA/.test(lineText(row)));
  const address=first.slice(0,headerIndex).filter(row=>row.y<first[headerIndex].y+100).map(row=>row.items.filter(item=>item.x>285).map(item=>item.text).join(' ')).filter(value=>value&&!/^P[áa]g\./.test(value));
  const cpIndex=address.findIndex((value,index)=>index>0&&/^\d{5}\s/.test(value));
  const country=address.at(-1)||'',postal=cpIndex>=0?address[cpIndex].match(/^(\d{5})\s+(.*)$/):null;
  const fiscal={nombre_fiscal:address[0]||'',direccion:address.slice(1,cpIndex>=0?cpIndex:Math.max(2,address.length-2)).join(' '),cp:postal?.[1]||'',poblacion:postal?.[2]||address.at(-3)||'',pais:country,vat_code:header[4]||''};
  const paymentBlock=text.split('FORMA DE PAGO:')[1]||'';
  const paymentText=paymentBlock.split(/\d+ VENCIMIENTOS:/)[0].trim();
  const forma=/TRANSFERENCIA/i.test(paymentText)?'transferencia':/RECIBO/i.test(paymentText)?'recibo':/FACTORING/i.test(paymentText)?'factoring':/INTERCAMBIO/i.test(paymentText)?'intercambio':'';
  const banco=forma==='recibo'?'Sabadell':forma==='transferencia'?/SANTANDER/i.test(paymentText)?'Santander':/SABADELL/i.test(paymentText)?'Sabadell':'':'';
  const iban=paymentText.match(/IBAN\s+([A-Z]{2}\d[\d\s]+?)(?=\s+SWIFT|$)/)?.[1].replace(/\s/g,'')||'';
  const dueBlock=paymentBlock.split(/\d+ VENCIMIENTOS:/)[1]||'';
  const cobros=[...dueBlock.matchAll(new RegExp('(\\d{2}/\\d{2}/\\d{4})\\s+('+moneyPattern+')\\s*€','g'))].map((match,index)=>({numero:index+1,fecha:validDate(match[1]),importe:money(match[2]),forma,banco}));
  const expected=Number(paymentBlock.match(/(\d+) VENCIMIENTOS:/)?.[1]||0);
  if(!abono&&(cobros.length!==expected||cents(cobros.reduce((sum,row)=>sum+row.importe,0))!==cents(total)))throw new Error('Vencimientos incompletos o distintos del total.');
  const lineas=[];
  for(const page of document.pages){
    let inTable=false;
    for(const row of page.lines){
      const value=lineText(row);
      if(/^Concepto Cantidad Precio Importe/.test(value)){inTable=true;continue;}
      if(/^Base Imponible/.test(value))inTable=false;
      if(!inTable||/^CIF\./.test(value))continue;
      const quantity=row.items.filter(item=>item.x>=410&&item.x<445).map(item=>item.text).join('').trim();
      const numeric=row.items.filter(item=>item.x>=440).map(item=>item.text).join(' ').match(new RegExp(moneyPattern,'g'))||[];
      const price=numeric[0]||'',amount=numeric[1]||'';
      const concept=row.items.filter(item=>item.x<410).map(item=>item.text).join(' ').trim();
      if(quantity&&/^-?\d+(?:,\d+)?$/.test(quantity)&&new RegExp('^'+moneyPattern+'$').test(price)&&new RegExp('^'+moneyPattern+'$').test(amount)){
        const item={concepto:concept,descripcion:'',cantidad:money(quantity),precio_unitario:money(price),base_imponible:money(amount),iva_porcentaje:iva};
        if(item.base_imponible<0&&item.precio_unitario>0&&/DISCOUNT|DESCUENTO/i.test(concept))item.precio_unitario=-item.precio_unitario;
        if(Math.abs(cents(item.cantidad*item.precio_unitario)-cents(item.base_imponible))>1)throw new Error('Cantidad y precio no cuadran: '+concept);
        lineas.push(item);
      }else if(concept&&lineas.length)lineas.at(-1).descripcion+=[lineas.at(-1).descripcion?'\n':'',concept].join('');
      else if(concept)throw new Error('Línea de servicio sin cantidad reconocida: '+concept);
    }
  }
  if(cents(lineas.reduce((sum,item)=>sum+item.base_imponible,0))!==cents(base))throw new Error('El desglose no cuadra con la base imponible.');
  let assigned=0;for(const [index,item] of lineas.entries()){
    const tax=index===lineas.length-1?cents(impuesto)-assigned:Math.round(item.base_imponible*iva);
    assigned+=tax;item.importe_total=(cents(item.base_imponible)+tax)/100;
  }
  return {numero,codigo:header[1].replace(/^0+/,''),fecha:header[3],base,iva,impuesto,total,fiscal,forma,banco,iban,paymentText,cobros,lineas,originalNumero:header[2],abono,originalFactura:text.match(/ABONO (?:PARTE|SOBRE) FACTURA\s+(\d+)/)?.[1]||'',file:document.file};
}

export function parsePublicidadReceiptPdf(document){
  return document.pages.flatMap(page=>page.text.split('Recibo Número Localidad De Expedición').slice(1).map(block=>{
    const number=block.match(/^\s*(\d+)-(\d+)/),amount=block.match(new RegExp('Vencimiento\\s+('+moneyPattern+')#'));
    const dates=block.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/);
    if(!number||!amount||!dates)throw new Error('Recibo no reconocido: '+document.file);
    return {numero_factura:number[1],numero_cobro:Number(number[2]),numero_recibo:number[1]+'-'+String(Number(number[2])).padStart(3,'0'),importe:money(amount[1]),fecha_expedicion:validDate(dates[1]),fecha_teorica:validDate(dates[2])};
  }));
}
