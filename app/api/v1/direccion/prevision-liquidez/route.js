import { NextResponse } from "next/server";
import { getPgPool } from "../../../../../server/database/pgClient.js";
export const runtime="nodejs";
export async function GET(request){
 try{
  const until=new URL(request.url).searchParams.get("fecha");
  const {rows}=await getPgPool().query(`
   WITH bancos AS (SELECT unnest(ARRAY['Sabadell','Santander']) banco),
   saldos AS (
    SELECT DISTINCT ON (banco) banco, COALESCE(saldo,0) saldo
    FROM lineas_bancos ORDER BY banco, id_linea_banco DESC
   ), ingresos AS (
    SELECT COALESCE(banco_cobro,'Sabadell') banco, SUM(COALESCE(cobro_total,0)) importe FROM ordenes_db
    WHERE NOT COALESCE(cobrada,false) AND to_date(NULLIF(fecha_teorica_cobro,''),'DD/MM/YYYY') BETWEEN CURRENT_DATE AND to_date($1,'DD/MM/YYYY') GROUP BY 1
   ), gastos AS (
    SELECT COALESCE(cuenta_pago,'Sabadell') banco, SUM(COALESCE(total_pago,0)) importe FROM pagos_db
    WHERE to_date(NULLIF(fecha_pago,''),'DD/MM/YYYY') BETWEEN CURRENT_DATE AND to_date($1,'DD/MM/YYYY') GROUP BY 1
   )
   SELECT b.banco, COALESCE(s.saldo,0)+COALESCE(i.importe,0)-COALESCE(g.importe,0) total FROM bancos b LEFT JOIN saldos s USING(banco) LEFT JOIN ingresos i USING(banco) LEFT JOIN gastos g USING(banco)
  `,[until]);
  return NextResponse.json(Object.fromEntries(rows.map(r=>[r.banco,Number(r.total)])));
 }catch(error){return NextResponse.json({message:"Error al calcular la previsión",detail:error.message},{status:500})}
}
