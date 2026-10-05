import fs from 'node:fs';import path from 'node:path';
const folder=path.join(process.env.USERPROFILE,'Downloads/updates/revision-gastos-20261004'),b=JSON.parse(fs.readFileSync(path.join(folder,'before.json'),'utf8'));
const plans=[],confirmed=[],held=[];
for(const m of b.tesoreria_movimientos_bancarios.filter(m=>Number(m.importe)<0&&!m.duplicado_descartado)){
 if(m.id_agente||/NOMINA|NÓMINA|RETRIBUC/i.test(m.concepto))continue;
 const s=m.concepto.toUpperCase(),amount=Math.abs(Number(m.importe));let id=null,proof='';
 if(/SOFTLINE/.test(s)){id='7';proof='Proveedor y recibo mensual Softline';}
 else if(/BITAVIS/.test(s)&&amount<250){id='15';proof='Proveedor y cuota mensual Bitavis';}
 else if(/DAE GABINET/.test(s)&&amount<250){id='4';proof='Proveedor y cuota mensual DAE';}
 else if(/COSVA C COM.PROP. 154/.test(s)){id='20';proof='Comunidad y referencia 154';}
 else if(/COYOTE/.test(s)){id='28';proof='Proveedor y suscripción Coyote';}
 else if(/TELEFONICA/.test(s)){id='29';proof='Proveedor y línea fija 937675730';}
 else if(/VODAFONE/.test(s)){id='31';proof='Proveedor y referencia factura Vodafone';}
 else if(/AIGUES DE BARCELONA/.test(s)){id='30';proof='Proveedor y contrato 026597p';}
 else if(/ENDESA/.test(s)&&s.includes('82010083751')){id='54';proof='Contrato Endesa 82010083751';}
 else if(/ENDESA/.test(s)&&s.includes('82010077716')){id='55';proof='Contrato Endesa 82010077716';}
 else if(/SECURITAS DIRECT/.test(s)){id=s.includes('3259714')?'18':s.includes('3260187')?'16':s.includes('3270476')?'17':null;proof='Referencia del mandato Verisure';}
 else if(/PIXUP/.test(s)){id=amount===414.23?'26':amount===252.26?'27':null;proof='Proveedor e importe específico del servicio PIXUP';}
 else if(/PEDRO BRILLAS/.test(s)&&['5','6'].includes(String(m.id_cargo_recurrente))){id=String(m.id_cargo_recurrente);proof='Alquiler previamente identificado por piso';}
 else if(/SERVICIO INFORMACION SABADELL/.test(s)&&amount===48.4){id='13';proof='Servicio información y factura DV020260000019267';}
 else if(/^COMISIONES\s*\.?$|^IMPUESTO SOBRE COMISION/.test(s)){id='52';proof='Comisiones y su impuesto, separadas del servicio anual de información';}
 else if(/^Liquidacion Del Contrato 0006474 300$/i.test(m.concepto)&&amount===15){id='53';proof='Contrato bancario y comisión mensual de 15 euros';}
 else if(/TGSS.*001 REGIMEN GENERAL/.test(s)){id='47';proof='TGSS, régimen general';}
 else if(/TGSS.*005 R.E.AUTONOMOS/.test(s)&&amount===370.59){id='48';proof='TGSS autónomos y cuota Frank';}
 else if(/IRPF RETENCIONES/.test(s)){id='49';proof='AEAT, concepto explícito IRPF';}
 else if(/IVA DECLARACI/.test(s)){id='50';proof='AEAT, concepto explícito IVA';}
 else if(/LLORET.*I.B.I./.test(s)){id='45';proof='Ajuntament Lloret y tributo IBI explícito';}
 else if(/SERVEIS GRAFICS AMARANT/.test(s)){id='51';proof='Destinatario explícito SERVEIS GRAFICS AMARANT';}
 if(!id){held.push({id:m.id_linea_banco,date:m.fecha_valor,amount,concept:m.concepto,reviewed:m.estado_revision,charge:m.id_cargo_recurrente});continue;}
 const c=b.tesoreria_cargos_recurrentes.find(c=>c.id_cargo_recurrente===id&&c.activo);
 if(!c)throw Error('Missing active charge '+id);
 if((m.id_proveedor&&m.id_proveedor!==c.id_proveedor)||m.id_cuenta){held.push({id:m.id_linea_banco,date:m.fecha_valor,amount,concept:m.concepto,reason:'Conflicting owner'});continue;}
 const p={id:m.id_linea_banco,date:m.fecha_valor,amount,concept:m.concepto,version:m.updated_at,reviewed:m.estado_revision,charge:id,provider:c.id_proveedor,proof,previousCharge:m.id_cargo_recurrente};
 if(m.estado_revision&&String(m.id_cargo_recurrente)===id&&m.id_proveedor===c.id_proveedor)confirmed.push(p);else plans.push(p);
}
fs.writeFileSync(path.join(folder,'expense-plan.json'),JSON.stringify({plans,confirmed,held},null,2));
console.log(JSON.stringify({toApply:plans.length,alreadyCorrect:confirmed.length,held:held.length,groups:Object.fromEntries([...new Set(plans.map(p=>p.charge))].map(c=>[c,plans.filter(p=>p.charge===c).length])),heldGroups:Object.fromEntries([...new Set(held.map(p=>p.concept.replace(/\d+/g,'#')))].map(c=>[c,held.filter(p=>p.concept.replace(/\d+/g,'#')===c).map(p=>({id:p.id,date:p.date,amount:p.amount}))]))}));
