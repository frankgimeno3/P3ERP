// One ERP budget source; worksheet JSON holds presentation and archived actuals.
export async function liquidityBudgetsAvailable(db) {
 return Boolean((await db.query("SELECT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=to_regclass('tesoreria_presupuestos_liquidez') AND n.nspname=current_schema()) ready")).rows[0].ready);
}
export async function seedLiquidityBudgets(db,year,sheets) {
 if(!await liquidityBudgetsAvailable(db))return;
 const records=[];
 for(const sheet of sheets)for(const section of ['income','payments'])for(const row of sheet[section])for(const [index,column] of sheet.columns.entries())if(column.kind==='forecast')records.push({anio:year,banco:sheet.bank,seccion:section,concepto_id:row.id,mes:column.month,importe:row.values[index]==null?null:row.values[index]/100,concepto:row.label});
 await db.query(`INSERT INTO tesoreria_presupuestos_liquidez SELECT anio,banco,seccion,concepto_id,mes,importe,concepto,now() FROM jsonb_to_recordset($1::jsonb) AS r(anio integer,banco text,seccion text,concepto_id text,mes integer,importe numeric,concepto text) ON CONFLICT DO NOTHING`,[JSON.stringify(records)]);
}
export async function readLiquidityBudgets(db,year,sheets) {
 if(!await liquidityBudgetsAvailable(db))return;
 const budgets=(await db.query('SELECT * FROM tesoreria_presupuestos_liquidez WHERE anio=$1',[year])).rows;
 const byKey=new Map(budgets.map(b=>[JSON.stringify([b.banco,b.seccion,b.concepto_id,b.mes]),b]));
 for(const sheet of sheets)for(const section of ['income','payments'])for(const row of sheet[section])for(const [index,column] of sheet.columns.entries())if(column.kind==='forecast'&&!sheet.closedMonths?.includes(column.month)){
 const b=byKey.get(JSON.stringify([sheet.bank,section,row.id,column.month]));if(b)row.values[index]=b.importe==null?null:Math.round(Number(b.importe)*100);
 }
}
export async function writeLiquidityBudget(db,{year,bank,section,row,month,value}) {
 if(!await liquidityBudgetsAvailable(db))return;
 await db.query(`INSERT INTO tesoreria_presupuestos_liquidez(anio,banco,seccion,concepto_id,mes,importe,concepto) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(anio,banco,seccion,concepto_id,mes) DO UPDATE SET importe=EXCLUDED.importe,concepto=EXCLUDED.concepto,updated_at=now()`,[year,bank,section,row.id,month,value==null?null:value/100,row.label]);
}
