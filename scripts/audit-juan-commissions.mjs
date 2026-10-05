import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());const p=getPgPool();
try {
 console.log('SANTANDER',JSON.stringify((await p.query("SELECT fecha_operativa,concepto,importe FROM tesoreria_movimientos_bancarios WHERE banco='Santander' AND (importe=-15 OR concepto ~* 'liquid|comisi|manten|gastos') ORDER BY p3_income_date(fecha_operativa)")).rows));
 console.log('SABADELL',JSON.stringify((await p.query("SELECT concepto,count(*)::int n,sum(abs(importe)) total,min(abs(importe)) minimo,max(abs(importe)) maximo FROM tesoreria_movimientos_bancarios WHERE banco='Sabadell' AND (concepto ~* 'comisi|comiss' OR abs(importe)=1300 OR abs(importe)=20 OR abs(importe)=40) GROUP BY concepto ORDER BY total DESC")).rows));
 console.log('VERIFIED',JSON.stringify((await p.query("SELECT nombre_completo_agente,estado_agente FROM agentes_db WHERE email_agente='internationalsales@vidrioperfil.com'")).rows));
 console.log('COSVA',JSON.stringify((await p.query("SELECT to_char(fecha,'YYYY-MM-DD') fecha,importe FROM tesoreria_cargos_vencimientos WHERE id_cargo_recurrente=20 AND fecha BETWEEN '2026-10-01' AND '2026-12-31'")).rows));
 const book=(await p.query("SELECT sheets FROM tesoreria_prevision_juan WHERE id='juan-2026'")).rows[0];
 console.log('VICTOR_SOURCE',JSON.stringify(book.sheets.find(s=>s.bank==='Sabadell').payments.find(r=>r.label==='NOMINA VICTOR JOVEN')));
}finally{await p.end();}
