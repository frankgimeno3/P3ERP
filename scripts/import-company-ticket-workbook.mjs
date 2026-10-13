import fs from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import env from '@next/env';
env.loadEnvConfig(process.cwd());
const {getPgPool}=await import('../server/database/pgClient.js');
const {parseTicketWorkbook,readTicketArchives,normalizeTicketSupplier}=await import('../server/features/proveedor/TicketSpreadsheet.js');
const {ensureTicketFolder,storeTicketDocument,validateTicketDocument,ticketMediaIdentifier}=await import('../server/features/proveedor/TicketMedia.js');
const {isDocumentStorageConfigured}=await import('../server/features/mediateca/S3Service.js');
const dir='C:/Users/frank/Downloads',reportDir=dir+'/p3erp-tickets-20261013',db=getPgPool();
try{
 const filename='Control Tickets P3.xlsx',tickets=parseTicketWorkbook(await fs.readFile(dir+'/'+filename));
 const archiveNames=['TICKETS P3 VISA (TODAS LAS TARJETAS)-20261013T090832Z-1-001.zip','TICKETS P3 EFECTIVO-20261013T090830Z-1-001.zip'];
 const files=readTicketArchives(await Promise.all(archiveNames.map(async name=>({name,bytes:await fs.readFile(dir+'/'+name)}))));
 for(const [code,file] of files){if(!tickets.some(t=>t.codigo_ticket===code))throw Error('Archivo sin fila en el Excel: '+code);validateTicketDocument(file);}
 const cards=(await db.query("SELECT * FROM tesoreria_tarjetas WHERE tipo='p3' AND estado='activa'")).rows;
 const providers=(await db.query('SELECT id_proveedor,nombre_proveedor FROM administracion_proveedores')).rows;
 const hasImportColumns=(await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='administracion_tickets' AND column_name='codigo_ticket'")).rowCount;
 const existing=(await db.query(hasImportColumns?'SELECT id_ticket,codigo_ticket,datos_importacion,documento_src FROM administracion_tickets':'SELECT id_ticket,documento_src FROM administracion_tickets')).rows;
 for(const ticket of tickets){
  ticket.datos_importacion.source_name=filename;
  if(ticket.forma_pago==='tarjeta'){const matches=cards.filter(c=>c.ultimos_digitos===ticket.digits&&c.banco===ticket.bank);if(matches.length!==1)throw Error('Tarjeta ambigua o inexistente en '+ticket.codigo_ticket);ticket.card=matches[0];}
  const matches=providers.filter(p=>normalizeTicketSupplier(p.nombre_proveedor)===normalizeTicketSupplier(ticket.proveedor));ticket.id_proveedor=matches.length===1?matches[0].id_proveedor:null;
  const previous=existing.find(t=>t.codigo_ticket===ticket.codigo_ticket);
  if(previous&&!isDeepStrictEqual(previous.datos_importacion?.original,ticket.datos_importacion.original))throw Error('El código existente tiene datos diferentes: '+ticket.codigo_ticket);
  if(previous?.datos_importacion?.archivo_sha256&&files.has(ticket.codigo_ticket)&&previous.datos_importacion.archivo_sha256!==files.get(ticket.codigo_ticket).sha256)throw Error('El justificante existente tiene contenido diferente: '+ticket.codigo_ticket);
  ticket.existing=previous;
 }
 const summary={tickets:tickets.length,tarjeta:tickets.filter(t=>t.forma_pago==='tarjeta').length,efectivo:tickets.filter(t=>t.forma_pago==='efectivo').length,documents:files.size,missingDocuments:tickets.filter(t=>!files.has(t.codigo_ticket)).map(t=>t.codigo_ticket),pendingCurrency:tickets.filter(t=>t.importe_total===null).map(t=>({code:t.codigo_ticket,currency:t.datos_importacion.moneda,original:t.datos_importacion.importe_original})),existing:tickets.filter(t=>t.existing).length,knownEur:tickets.reduce((sum,t)=>sum+Math.round(Number(t.importe_total||0)*100),0)/100};
 await fs.mkdir(reportDir,{recursive:true});await fs.writeFile(reportDir+'/plan.json',JSON.stringify({summary,tickets:tickets.map(t=>({...t,card:t.card?{id_tarjeta:t.card.id_tarjeta,nombre:t.card.nombre}:null}))},null,2));
 console.log(JSON.stringify(summary,null,2));if(!process.argv.includes('--apply'))process.exitCode=0;
 else{
  await fs.writeFile(reportDir+'/before-'+Date.now()+'.json',JSON.stringify(existing,null,2));
  await db.query(await fs.readFile('database/migrations/20261013_0002_accounting_module_ticket_import.sql','utf8'));
  const folders=new Map(),uploads=new Map();
  for(const ticket of tickets.filter(t=>!t.existing&&files.has(t.codigo_ticket))){const key=ticket.forma_pago+':'+ticket.fecha.slice(0,4)+':'+ticket.bank+':'+ticket.digits;if(!folders.has(key))folders.set(key,await ensureTicketFolder(ticket));ticket.folderId=folders.get(key);}
  const uploadTickets=isDocumentStorageConfigured()?tickets.filter(t=>!t.existing&&files.has(t.codigo_ticket)):[];
  for(let i=0;i<uploadTickets.length;i+=4){const result=await Promise.allSettled(uploadTickets.slice(i,i+4).map(async ticket=>{const media=await storeTicketDocument(files.get(ticket.codigo_ticket),ticket.folderId,ticket.codigo_ticket);uploads.set(ticket.codigo_ticket,{id:media.id,url:media.url,name:media.name,type:media.type,sha256:media.sha256});}));for(const item of result)if(item.status==='rejected')throw item.reason;console.log('Justificantes guardados: '+Math.min(i+4,uploadTickets.length)+'/'+uploadTickets.length);}
  const client=await db.connect();let inserted=0;
  try{
   await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='5s'");await client.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
   for(const ticket of tickets){if(ticket.existing)continue;let media=uploads.get(ticket.codigo_ticket);const card=ticket.card;
    let ticketId=null,documentBytes=null;
    if(!isDocumentStorageConfigured()&&files.has(ticket.codigo_ticket)){
     const document=validateTicketDocument(files.get(ticket.codigo_ticket));
     ticketId=(await client.query("SELECT nextval(pg_get_serial_sequence('administracion_tickets','id_ticket')) id")).rows[0].id;
     const url=`/api/v1/admin/tickets/${ticketId}/archivo`,id=ticketMediaIdentifier(ticket.codigo_ticket,document.sha256);
     await client.query(`INSERT INTO mediateca_archivos(mediateca_content_id,mediateca_folder_id,mediateca_content_name,mediateca_s3_key,mediateca_content_src,mediateca_content_mime_type,mediateca_content_type) VALUES($1,$2,$3,NULL,$4,$5,$6)`,[id,ticket.folderId,document.name,url,document.type,document.type==='application/pdf'?'pdf':'image']);
     media={id,url,name:document.name,type:document.type,sha256:document.sha256};documentBytes=document.bytes;
    }
    const data={...ticket.datos_importacion,archivo_sha256:media?.sha256||null,zip_name:files.get(ticket.codigo_ticket)?.zip||null};
    const row=(await client.query(`INSERT INTO administracion_tickets(codigo_ticket,fecha_ticket,id_proveedor,nombre_personalizado_proveedor,base_imponible,importe_total,forma_pago,documento_src,ambito,id_tarjeta,tarjeta_ultimos_digitos,tarjeta_banco,tarjeta_nombre,tarjeta_tipo,archivo_nombre,archivo_tipo,estado_revision,clasificacion,comentarios,feria,datos_importacion,id_archivo_mediateca,id_ticket,archivo_contenido)
      VALUES($1,$2,$3,$4,NULL,$5,$6,$7,'P3',$8,$9,$10,$11,$12,$13,$14,'pendiente','asociable',$15,$16,$17::jsonb,$18,COALESCE($19::bigint,nextval(pg_get_serial_sequence('administracion_tickets','id_ticket'))),$20) ON CONFLICT(codigo_ticket) WHERE codigo_ticket IS NOT NULL DO NOTHING RETURNING id_ticket`,[ticket.codigo_ticket,ticket.fecha.split('-').reverse().join('/'),ticket.id_proveedor,ticket.proveedor,ticket.importe_total,ticket.forma_pago,media?.url||'',card?.id_tarjeta||null,card?.ultimos_digitos||'',card?.banco||'',card?.nombre||'',card?.tipo||'',media?.name||'',media?.type||'',ticket.comentarios,ticket.feria,JSON.stringify(data),media?.id||null,ticketId,documentBytes])).rows[0];if(row)inserted++;
   }
   if(!isDocumentStorageConfigured()){
    const groups=new Map();for(const [code,file] of files){if(!groups.has(file.sha256))groups.set(file.sha256,[]);groups.get(file.sha256).push(code);}
    for(const codes of [...groups.values()].filter(codes=>codes.length>1)){
     const records=(await client.query('SELECT id_ticket,codigo_ticket,archivo_contenido IS NOT NULL AS has_document FROM administracion_tickets WHERE codigo_ticket=ANY($1::text[])',[codes])).rows;
     const primary=records.find(row=>row.has_document&&row.codigo_ticket.startsWith('V.'))||records.find(row=>row.has_document);
     if(!primary)throw Error('No se encontró el original del justificante compartido.');
     for(const row of records){
      const extra={justificante_compartido_codigos:codes,...(row.id_ticket!==primary.id_ticket?{documento_ticket_id:primary.id_ticket,documento_codigo:primary.codigo_ticket}:{})};
      await client.query('UPDATE administracion_tickets SET archivo_contenido=CASE WHEN id_ticket=$2 THEN archivo_contenido ELSE NULL END,datos_importacion=datos_importacion||$3::jsonb WHERE id_ticket=$1',[row.id_ticket,primary.id_ticket,JSON.stringify(extra)]);
     }
    }
   }
   await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  const verify=(await db.query('SELECT codigo_ticket,forma_pago,importe_total,base_imponible,estado_revision,id_tarjeta,id_archivo_mediateca FROM administracion_tickets WHERE codigo_ticket=ANY($1::text[]) ORDER BY codigo_ticket',[tickets.map(t=>t.codigo_ticket)])).rows;
  if(verify.length!==tickets.length)throw Error('No coinciden los tickets importados con el Excel.');
  await fs.writeFile(reportDir+'/result.json',JSON.stringify({inserted,summary,tickets:verify},null,2));console.log(JSON.stringify({inserted,verified:verify.length,report:reportDir+'/result.json'}));
 }
}finally{await db.end();}
