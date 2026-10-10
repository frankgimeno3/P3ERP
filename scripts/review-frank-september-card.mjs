import env from '@next/env';import fs from 'node:fs/promises';import path from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';import {saveTarjeta} from '../server/features/proveedor/TarjetaRepository.js';import {settleCard} from '../server/features/proveedor/CardSettlementRepository.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool(),apply=process.argv.includes('--apply'),directory=path.join(process.env.USERPROFILE,'Downloads','p3erp-cierre-bancos-20261009');
try {
 const raw=JSON.parse(await fs.readFile(path.join(directory,'frank-september-statement-lines.json'),'utf8'));
 const parts=raw.map((text,index)=>{const match=/^(\d{2})(\d{2}) (.+) (\d+,\d{2}) (\d+,\d{2})$/.exec(text);if(!match||match[4]!==match[5]||match[2]!=='09')throw Error('Línea de extracto no reconocida');return {id:`statement:6015:2026-09:${index}`,label:match[3],date:`${match[1]}/09/2026`,amount:Math.round(Number(match[5].replace(',','.'))*100),editable:false,detail:'Extracto de tarjeta 6015 · septiembre; sin clasificación fiscal ni ticket inventado'};});
 if(parts.length!==13||parts.reduce((n,p)=>n+p.amount,0)!==66384)throw Error('El desglose no cuadra');
 const line=(await pool.query("SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco='banc_sab_26_000.000.547'")).rows[0];if(Number(line.importe)!==-663.84||line.fecha_operativa!=='05/10/2026'||line.banco!=='Sabadell')throw Error('El cargo ha cambiado');
 const cards=(await pool.query("SELECT * FROM tesoreria_tarjetas WHERE banco='Sabadell' AND ultimos_digitos='6015'")).rows;if(cards.length>1)throw Error('Tarjeta ambigua');
 console.log(JSON.stringify({apply,amount:663.84,parts:parts.length,alreadyReviewed:line.estado_revision,createCard:!cards.length}));
 if(apply&&!line.estado_revision) {
  await fs.writeFile(path.join(directory,`before-frank-card-${Date.now()}.json`),JSON.stringify({line,cards,parts},null,2),{flag:'wx'});
  const card=cards[0]||await saveTarjeta(null,{ultimos_digitos:'6015',nombre:'FRANK GIMENO RUIZ · MC EMPRESA ORO',banco:'Sabadell',tipo:'p3',estado:'activa',codigo:'SAB-MC-6015',descripcion:'Titular Proporción 3 S.A.; tarjeta empresa identificada en extracto de septiembre 2026.',periodicidad_meses:1,inicio_periodo:'2026-09-01',proximo_cierre:'2026-09-30',proxima_liquidacion:'2026-10-05'});
  if(!cards.length)await pool.query('UPDATE tesoreria_tarjetas SET dia_cierre=31 WHERE id_tarjeta=$1',[card.id_tarjeta]);
  const preview=await settleCard(card.id_tarjeta,{action:'preview',ids:[line.id_linea_banco]});
  const settlement=await settleCard(card.id_tarjeta,{action:'confirm',ids:[line.id_linea_banco],token:preview.token,comentario:'Extracto original FRANK P3 SABADELL - Octubre (Liquidacion septiembre).pdf: 13 operaciones de septiembre suman 663,84 €, tarjeta empresa 6015, liquidación 05/10/2026. La previsión de tickets era cero porque aún no se habían registrado; el importe real está acreditado. Desglose conservado, sin generar suscripciones ni facturas.'});
  const db=await pool.connect();try {
   await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
   await db.query("UPDATE tesoreria_tarjetas_liquidaciones SET detalle=detalle||$2::jsonb WHERE id=$1",[settlement.id,JSON.stringify({statementParts:parts,statementFile:'FRANK P3 SABADELL - Octubre (Liquidacion septiembre).pdf'})]);
   const book=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2026' FOR UPDATE")).rows[0],sheet=book.sheets.find(s=>s.bank==='Sabadell'),row=sheet.payments.find(r=>r.cardPart==='variable'),column=sheet.columns.findIndex(c=>c.month===10&&c.kind==='actual');if(!row)throw Error('Fila de tarjeta no encontrada');
   row.cellDetails={...row.cellDetails,[column]:parts};
   await db.query("UPDATE tesoreria_prevision_juan SET sheets=$1::jsonb,version=version+1,updated_at=now() WHERE id='juan-2026'",[JSON.stringify(book.sheets)]);await db.query('COMMIT');
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  console.log(JSON.stringify({reviewed:true,settlement:await pool.query('SELECT id,id_tarjeta,real FROM tesoreria_tarjetas_liquidaciones WHERE id=$1',[settlement.id]).then(r=>r.rows[0])}));
 }
}finally{await pool.end();}
