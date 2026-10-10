import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const p=getPgPool();
try {
for(const q of [
`SELECT r.revista,p.edicion_publicacion,p.numero_publicacion,string_agg(p.version_publicacion,', ') formatos,count(*) registros FROM servicios_revistas r JOIN servicios_publicaciones p ON p.revista_id=r.id_revista GROUP BY 1,2,3 HAVING count(*)>1 ORDER BY 1,3`,
`SELECT id,id_contenido,empresa,revista,especial_numero FROM produccion_control_redaccion ORDER BY id LIMIT 5`,
`SELECT count(*) total,count(c.id_contenido) linked FROM produccion_control_redaccion e LEFT JOIN produccion_contenidos c USING(id_contenido)`,
`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='comercial_contratos' ORDER BY ordinal_position`
]) console.log(JSON.stringify((await p.query(q)).rows));
}finally{await p.end();}
