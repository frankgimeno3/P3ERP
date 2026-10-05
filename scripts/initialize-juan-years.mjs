import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {ensureJuanYears} from '../server/features/prevision/JuanAnnual.js';
env.loadEnvConfig(process.cwd());const p=getPgPool();
try{console.log(JSON.stringify({years:await ensureJuanYears(p),directionAccounts:(await p.query("SELECT nombre_completo_agente,rol_agente FROM agentes_db WHERE rol_agente IN('direccion','dirección')")).rows}));}finally{await p.end();}
