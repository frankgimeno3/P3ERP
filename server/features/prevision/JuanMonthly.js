import {getPgPool} from '../../database/pgClient.js';
import {getJuanWorkbook} from './JuanRepository.js';
import {juanYear} from './JuanAnnual.js';
export function monthlyJuanReview(book) {
 return book.sheets.flatMap(sheet=>[...new Set(sheet.columns.filter(c=>c.kind==='forecast').map(c=>c.month))].map(month=>{
  const cells=book.planned.filter(c=>c.bank===sheet.bank&&c.month===month);
  const orders=book.orders.filter(o=>o.banco_cobro===sheet.bank&&Number((o.fecha_teorica_cobro||'').includes('/')?o.fecha_teorica_cobro.split('/')[1]:o.fecha_teorica_cobro.slice(5,7))===month);
  const income=cells.filter(c=>c.section==='income').reduce((sum,c)=>sum+c.amount,0);
  const incomePending=cells.filter(c=>c.section==='income').reduce((sum,c)=>sum+c.pending,0);
  const ordersAmount=orders.reduce((sum,o)=>sum+Math.round(Number(o.pending_amount)*100),0);
  return {bank:sheet.bank,month,income,incomePending,orders:ordersAmount,incomeDifference:incomePending-ordersAmount,payments:cells.filter(c=>c.section==='payments').reduce((sum,c)=>sum+c.amount,0),unlinked:cells.filter(c=>!book.links.some(l=>l.cell_key===c.key&&l.target_id)).length,closed:(sheet.closedMonths||[]).includes(month)};
 }));
}
export async function closeJuanMonth(body,pool=getPgPool(),now=new Date()) {
 const year=juanYear(body.year),month=Number(body.month),id=`juan-${year}`;
 if(!Number.isInteger(month)||month<1||month>12)throw Error('Mes no válido.');
 const end=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10),today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(now);
 if(end>today)throw Error('Solo puede cerrarse un mes terminado.');
 const db=await pool.connect();
 try {
  await db.query('BEGIN');
  await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
  const stored=(await db.query('SELECT * FROM tesoreria_prevision_juan WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(stored.version!==body.version)throw Error('La hoja ha cambiado. Actualiza antes de cerrar.');
  const book=await getJuanWorkbook({query:db.query.bind(db)},year);
  const sheet=stored.sheets.find(s=>s.bank===body.bank),effective=book.sheets.find(s=>s.bank===body.bank);
  if(!sheet)throw Error('Banco no válido.');
  const forecast=sheet.columns.findIndex(c=>c.month===month&&c.kind==='forecast'),actual=sheet.columns.findIndex(c=>c.month===month&&c.kind==='actual');
  if(forecast<0||actual<0)throw Error('Este mes solo contiene el histórico importado; conserva su comprobación.');
  sheet.closedMonths=sheet.closedMonths||[];
  if(body.action==='reopen-month') {
   for(const section of ['income','payments'])for(const row of sheet[section])if(row.closingBudget?.[month]!==undefined){row.values[forecast]=row.priorForecast?.[month]??row.closingBudget[month];row.values[actual]=row.priorActual?.[month]??null;}
   sheet.closedMonths=sheet.closedMonths.filter(m=>m!==month);
  }else {
   if(sheet.closedMonths.includes(month))throw Error('El mes ya está cerrado.');
   const uncovered=book.bankMovements.filter(m=>m.banco===sheet.bank&&!m.duplicado_descartado&&Number((m.fecha_operativa||m.fecha_valor).split('/')[1])===month&&(!m.estado_revision||Math.round(Math.abs(Number(m.importe))*100)>book.applications.filter(a=>a.id_linea_banco===m.id_linea_banco&&a.estado_revision).reduce((sum,a)=>sum+Math.round(Number(a.importe)*100),0))).length;
   if(uncovered)throw Error(`${uncovered} movimientos del mes siguen sin revisar o sin asociar por completo a la previsión del ERP. Resuélvelos antes del cierre.`);
   if(!(await db.query("SELECT 1 FROM tesoreria_movimientos_bancarios WHERE banco=$1 AND COALESCE(p3_income_date(fecha_operativa),p3_income_date(fecha_valor)) BETWEEN $2::date AND $3::date LIMIT 1",[sheet.bank,`${year}-${String(month).padStart(2,'0')}-01`,end])).rowCount)throw Error('No hay extracto del mes. No se cierra un mes sin movimientos disponibles.');
   for(const section of ['income','payments'])for(const row of sheet[section]) {
    if(row.opening)continue;
    const budget=effective[section].find(r=>r.id===row.id).values[forecast];
    const paid=book.applications.filter(a=>a.cell_key===`${sheet.bank}:${row.id}:${month}`&&a.estado_revision&&!a.duplicado_descartado).reduce((sum,a)=>sum+Math.round(Number(a.importe)*100),0);
    if(paid>(budget??0))throw Error(`El realizado supera el presupuesto de ${row.label}: revisa su importe.`);
    row.closingBudget={...row.closingBudget,[month]:budget};row.priorActual={...row.priorActual,[month]:row.values[actual]};row.priorForecast={...row.priorForecast,[month]:row.values[forecast]};
    row.values[actual]=paid||row.values[actual];row.values[forecast]=budget===null?null:budget-paid;
   }
   sheet.closedMonths.push(month);
  }
  await db.query('UPDATE tesoreria_prevision_juan SET sheets=$2::jsonb,version=version+1,updated_at=now() WHERE id=$1',[id,JSON.stringify(stored.sheets)]);
  await db.query('COMMIT');
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 return getJuanWorkbook(pool,year);
}
