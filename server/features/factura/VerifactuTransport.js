import https from 'node:https';
import fs from 'node:fs';
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const decode=value=>value.replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&amp;','&');
const tag=(xml,name)=>decode(xml.match(new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([^<]*)</(?:[\\w-]+:)?${name}>`))?.[1]?.trim()||'');
export function parseAeatResponse(xml){
  if(/<!DOCTYPE|<!ENTITY/i.test(xml)||!/<(?:[\w-]+:)?RespuestaRegFactuSistemaFacturacion(?:\s|>)/.test(xml))throw new Error('Respuesta AEAT no válida.');
  const lines=[...xml.matchAll(/<(?:[\w-]+:)?RespuestaLinea(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?RespuestaLinea>/g)];
  if(lines.length!==1)throw new Error('Se esperaba la respuesta de un único registro fiscal.');
  const line=lines[0][1],state=tag(line,'EstadoRegistro'),duplicate=line.match(/<(?:[\w-]+:)?RegistroDuplicado(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?RegistroDuplicado>/)?.[1];
  const existing=duplicate&&tag(duplicate,'EstadoRegistro');
  const final=existing||state;
  const status=final==='Correcto'?'ACCEPTED':final==='AceptadoConErrores'?'ACCEPTED_WITH_ERRORS':final==='Incorrecto'?'REJECTED':null;
  if(!status)throw new Error('Estado de registro AEAT desconocido.');
  return {status,xml,csv:tag(duplicate||xml,'CSV'),errorCode:tag(line,'CodigoErrorRegistro'),errorDescription:tag(line,'DescripcionErrorRegistro'),structured:{state,duplicate:existing||null}};
}
export function buildAeatEnvelope(recordXml){
  if(!/<(?:[\w-]+:)?RegistroAlta(?:\s|>)/.test(recordXml)||/<!DOCTYPE|<!ENTITY/i.test(recordXml))throw new Error('El registro fiscal XML no es válido.');
  const name=tag(recordXml,'NombreRazonEmisor'),nif=tag(recordXml,'NIF');
  if(!name||!nif)throw new Error('Falta el emisor del registro fiscal.');
  const record=recordXml.replace(/^\s*<\?xml[^>]*>\s*/,'');
  return `<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:lr="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd" xmlns:sf="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd"><soap:Header/><soap:Body><lr:RegFactuSistemaFacturacion><lr:Cabecera><sf:ObligadoEmision><sf:NombreRazon>${escape(name)}</sf:NombreRazon><sf:NIF>${escape(nif)}</sf:NIF></sf:ObligadoEmision></lr:Cabecera><lr:RegistroFactura>${record}</lr:RegistroFactura></lr:RegFactuSistemaFacturacion></soap:Body></soap:Envelope>`;
}
export function createAeatTransport(config=process.env){
  if(!config.VERIFACTU_PFX_PATH)throw new Error('Configura VERIFACTU_PFX_PATH para el certificado del emisor.');
  if(!['test','production'].includes(config.VERIFACTU_ENVIRONMENT))throw new Error('Selecciona explícitamente VERIFACTU_ENVIRONMENT=test o production.');
  const host=config.VERIFACTU_ENVIRONMENT==='production'?'www1.agenciatributaria.gob.es':'prewww1.aeat.es';
  const pfx=fs.readFileSync(config.VERIFACTU_PFX_PATH);
  return async recordXml=>{
    const body=buildAeatEnvelope(recordXml);
    const xml=await new Promise((resolve,reject)=>{
      const request=https.request({hostname:host,path:'/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',method:'POST',pfx,passphrase:config.VERIFACTU_PFX_PASSWORD,timeout:60000,headers:{'Content-Type':'text/xml; charset=utf-8',SOAPAction:'""','Content-Length':Buffer.byteLength(body)}},response=>{
        let text='';response.setEncoding('utf8');response.on('data',chunk=>{text+=chunk;if(text.length>2_000_000)request.destroy(new Error('Respuesta AEAT demasiado grande.'));});response.on('end',()=>response.statusCode===200?resolve(text):reject(new Error(`AEAT respondió HTTP ${response.statusCode}.`)));response.on('error',reject);
      });request.on('timeout',()=>request.destroy(new Error('Tiempo de espera AEAT agotado.')));request.on('error',reject);request.end(body);
    });return parseAeatResponse(xml);
  };
}
