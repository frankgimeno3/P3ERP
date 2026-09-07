import fs from 'node:fs';
import pg from 'pg';
import XLSX from 'xlsx';

for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const index = line.indexOf('=');
  if (index > 0 && !line.startsWith('#')) process.env[line.slice(0, index)] = line.slice(index + 1);
}

const client = new pg.Client({
  host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT), database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD,
  ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' },
});
const read = (file) => {
  const book = XLSX.readFile(file, { raw: false });
  return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: '', raw: false });
};
const text = (value) => String(value ?? '').trim();
const hoja = read('C:/Users/frank/Downloads/Hoja de produccion.xlsx');
const redaccion = read('C:/Users/frank/Downloads/control redaccion.xlsx');

await client.connect();
try {
  await client.query('BEGIN');
  await client.query(fs.readFileSync('database/migrations/20260902_0004_produccion_excel_fields.sql', 'utf8'));
  await client.query("UPDATE contenidos_db SET hoja_prod=false WHERE ano_publicacion='2026'");
  for (const row of hoja) {
    const values = ['IDENTIFICADOR','AGENTE','CODIGO CRM','CLIENTE','CONTRATO','PUBLICACION / Nº WEB','TIPO REVISTA / SERVICIO','CONTENIDO/-','ANUNCIO','ARTICULO','ESTADO','FACTURA','PAGINA','CADUCA (web)','Comentarios'].map((key) => text(row[key]));
    if (!values[0]) continue;
    await client.query(`INSERT INTO contenidos_db (id_contenido,id_agente,codigo_crm_hoja,cliente_hoja,id_contrato,publicacion_num_web,tipo_revista_servicio,especificaciones_contenido,anuncio_hoja,articulo_hoja,estado_contenido,factura_hoja,pagina_hoja,caduca_web,comentarios_hoja,hoja_prod,ano_publicacion)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,'2026')
      ON CONFLICT (id_contenido) DO UPDATE SET id_agente=EXCLUDED.id_agente,codigo_crm_hoja=EXCLUDED.codigo_crm_hoja,cliente_hoja=EXCLUDED.cliente_hoja,id_contrato=EXCLUDED.id_contrato,publicacion_num_web=EXCLUDED.publicacion_num_web,tipo_revista_servicio=EXCLUDED.tipo_revista_servicio,especificaciones_contenido=EXCLUDED.especificaciones_contenido,anuncio_hoja=EXCLUDED.anuncio_hoja,articulo_hoja=EXCLUDED.articulo_hoja,estado_contenido=EXCLUDED.estado_contenido,factura_hoja=EXCLUDED.factura_hoja,pagina_hoja=EXCLUDED.pagina_hoja,caduca_web=EXCLUDED.caduca_web,comentarios_hoja=EXCLUDED.comentarios_hoja,hoja_prod=true,ano_publicacion='2026',updated_at=NOW()`, values);
  }
  await client.query('TRUNCATE TABLE control_redaccion_db RESTART IDENTITY');
  for (const row of redaccion) {
    const values = ['PRIORIDAD','DONDE ESTÁ','EMPRESA','TÍTULO','ESTADO','RESPONSABLE CORRECCION','REVISTA','ESPAÑA PREVISTO Nº','LATAM PREVISTO Nº','ESPECIAL Nº','HUECO PREVISTO','PAGINAS','Estado publicación en vidrioperfil'].map((key) => text(row[key]));
    if (!values.some(Boolean)) continue;
    await client.query(`INSERT INTO control_redaccion_db (prioridad,donde_esta,empresa,titulo,estado,responsable_correccion,revista,espana_previsto_numero,latam_previsto_numero,especial_numero,hueco_previsto,paginas,estado_publicacion_vidrioperfil) VALUES (${values.map((_,i)=>`$${i+1}`).join(',')})`, values);
  }
  await client.query('COMMIT');
  console.log(`Importados ${hoja.length} registros de producción y ${redaccion.length} de control de redacción.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally { await client.end(); }
