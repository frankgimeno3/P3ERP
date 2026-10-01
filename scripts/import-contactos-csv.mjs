import fs from 'node:fs';
import XLSX from 'xlsx';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';

env.loadEnvConfig(process.cwd());
const source = process.argv[2] || 'C:/Users/frank/OneDrive/Escritorio/Contactos.csv';
const csv = fs.readFileSync(source, 'utf8');
const workbook = XLSX.read(csv, { type: 'string', raw: true });
const raw = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const nameKey = value => key(value).replaceAll('_', '');
const clean = value => String(value ?? '').trim();
const optional = value => clean(value) || null;
const flag = value => ['1','true','yes','si','s'].includes(clean(value).toLowerCase());
const rows = raw.map(row => Object.fromEntries(Object.entries(row).map(([header,value]) => [key(header), value])));
const ids = rows.map(row => clean(row.contacto_id));
if (!rows.length || ids.some(id => !id) || ids.length !== new Set(ids).size) throw new Error('CSV vacío, con IDs ausentes o duplicados');
const expected = ['contacto_id','nombre','apellido','nombre_cuenta','de_correo_electronico_principal','fecha_de_creacion'];
for (const field of expected) if (!(field in rows[0])) throw new Error(`Falta columna: ${field}`);

const columns = ['id_contacto','id_cuenta','nombre_contacto','apellidos_contacto','nombre_completo_contacto','nombre_empresa',
  'telefono_contacto','email_contacto','cargo_contacto','otros_datos_interes','saludo','tipo_contacto','movil',
  'medio_contacto','red_social','modificado_por_crm','asignado_a_crm','fuente_crm','no_enviar_email',
  'fecha_creacion_crm','convertido_de_lead','fecha_modificacion_crm','pais_factura','provincia_factura',
  'publicaciones_que_recibe','robinson','origen_precontacto','zona','que_se_envia','origen_base_anexa',
  'vidrio','carpinteria','proteccion_solar','puertas_automatismos','construccion_arquitectura','actividad_empresa'];

const pool = getPgPool();
const db = await pool.connect();
try {
  const accounts = (await db.query('SELECT id_cuenta,nombre_empresa FROM comercial_cuentas')).rows;
  if ((await db.query('SELECT 1 FROM comercial_contactos WHERE id_contacto=ANY($1::text[]) LIMIT 1',[ids])).rowCount) {
    throw new Error('Este CSV ya comparte IDs con la RDS; se cancela para conservar referencias existentes');
  }
  const byExact = new Map(), byNormalized = new Map();
  for (const account of accounts) {
    const exact = clean(account.nombre_empresa).toLowerCase();
    const normalized = nameKey(account.nombre_empresa);
    for (const [map,k] of [[byExact,exact],[byNormalized,normalized]]) {
      if (!map.has(k)) map.set(k,[]);
      map.get(k).push(account.id_cuenta);
    }
  }
  const stats = { rows:rows.length, matched:0, ambiguous:0, unmatched:0 };
  const values = rows.map(row => {
    const accountName = clean(row.nombre_cuenta).replace(/^Accounts::::/i,'').trim();
    const exact = byExact.get(accountName.toLowerCase()) || [];
    const matches = exact.length === 1 ? exact : (byNormalized.get(nameKey(accountName)) || []);
    const accountId = matches.length === 1 ? matches[0] : null;
    stats[accountId ? 'matched' : matches.length > 1 ? 'ambiguous' : 'unmatched']++;
    const first = clean(row.nombre), last = clean(row.apellido);
    const full = first && last && nameKey(first) === nameKey(last) ? first : [first,last].filter(Boolean).join(' ');
    return [clean(row.contacto_id),accountId,first,last,full,optional(accountName),optional(row.telefono_empresa),
      optional(row.de_correo_electronico_principal),optional(row.cargo),optional(row.descripcion),optional(row.saludo),
      optional(row.tipo_de_contacto),optional(row.movil),optional(row.medio_de_contacto),optional(row.red_social),
      optional(row.modificado_por),optional(row.asignado_a),optional(row.fuente),flag(row.no_enviar_email),
      optional(row.fecha_de_creacion),flag(row.se_convierte_de_plomo),optional(row.fecha_de_modificacion),
      optional(row.pais_factura),optional(row.provincia_factura),optional(row.publicaciones_que_recibe),
      optional(row.robinson),optional(row.origen_de_pre_contacto),optional(row.zona),optional(row.que_se_envia),
      optional(row.origen_base_anexa),optional(row.vidrio),optional(row.carpinteria),optional(row.proteccion_solar),
      optional(row.puertas_y_automatismos),optional(row.construccion_y_arquitectura),optional(row.actividad_empresa)];
  });
  await db.query('BEGIN');
  await db.query(fs.readFileSync('database/migrations/20260918_0004_contactos_csv_columns.sql','utf8'));
  await db.query('CREATE TEMP TABLE contactos_importados (LIKE comercial_contactos INCLUDING DEFAULTS) ON COMMIT DROP');
  for (let start=0;start<values.length;start+=100) {
    const batch=values.slice(start,start+100);
    const params=batch.flat();
    const placeholders=batch.map((_,i)=>`(${columns.map((__,j)=>`$${i*columns.length+j+1}`).join(',')})`).join(',');
    await db.query(`INSERT INTO contactos_importados (${columns.join(',')}) VALUES ${placeholders}`,params);
  }
  const staged = await db.query('SELECT count(*)::int n,count(DISTINCT id_contacto)::int unique_ids FROM contactos_importados');
  if (staged.rows[0].n !== rows.length || staged.rows[0].unique_ids !== rows.length) throw new Error('La tabla temporal no contiene todos los contactos');
  const old = (await db.query('SELECT id_contacto FROM comercial_contactos FOR UPDATE')).rows.map(row=>row.id_contacto);
  if (old.length) {
    for (const [table,column] of [['comercial_contratos','id_contacto_contrato'],['comercial_propuestas_db','id_contacto_propuesta'],['tesoreria_ordenes','id_contacto_cobro'],['comentarios_registro_eventos','id_contacto'],['contactos_registro_eventos','id_contacto']])
      await db.query(`UPDATE ${table} SET ${column}=NULL${table==='comercial_contratos'?',cargo_contacto_contrato=NULL':table==='comercial_propuestas_db'?',cargo_contacto_propuesta=NULL':''} WHERE ${column}=ANY($1::text[])`,[old]);
    await db.query("UPDATE comercial_cuentas SET datos_comerciales=datos_comerciales-'contacto_principal' WHERE datos_comerciales->>'contacto_principal'=ANY($1::text[])",[old]);
    await db.query(`UPDATE comercial_cuentas c SET array_contactos_cuenta=COALESCE((SELECT jsonb_agg(item) FROM jsonb_array_elements(c.array_contactos_cuenta) item WHERE NOT (item->>'id_contacto'=ANY($1::text[]))),'[]'::jsonb)
      WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(c.array_contactos_cuenta) item WHERE item->>'id_contacto'=ANY($1::text[]))`,[old]);
    await db.query('DELETE FROM comercial_contactos');
  }
  await db.query(`INSERT INTO comercial_contactos (${columns.join(',')}) SELECT ${columns.join(',')} FROM contactos_importados`);
  await db.query(`UPDATE comercial_cuentas c SET datos_comerciales=c.datos_comerciales-'contacto_principal',updated_at=now()
    WHERE c.datos_comerciales ? 'contacto_principal' AND NOT EXISTS
    (SELECT 1 FROM comercial_contactos x WHERE x.id_contacto=c.datos_comerciales->>'contacto_principal' AND x.id_cuenta=c.id_cuenta)`);
  await db.query(`WITH candidates AS (SELECT id_cuenta,min(id_contacto) id_contacto FROM comercial_contactos
    WHERE id_cuenta IS NOT NULL AND upper(coalesce(tipo_contacto,'')) LIKE '%PRINCIPAL%'
    GROUP BY id_cuenta HAVING count(*)=1)
    UPDATE comercial_cuentas c SET datos_comerciales=jsonb_set(COALESCE(c.datos_comerciales,'{}'::jsonb),'{contacto_principal}',to_jsonb(x.id_contacto)),updated_at=now()
    FROM candidates x WHERE c.id_cuenta=x.id_cuenta`);
  const final = await db.query('SELECT count(*)::int n FROM comercial_contactos');
  if (final.rows[0].n !== rows.length) throw new Error('La carga final no contiene todos los contactos');
  await db.query('COMMIT');
  console.log(JSON.stringify({ ...stats,removedOld:old.length,inserted:final.rows[0].n }));
} catch (error) { await db.query('ROLLBACK'); throw error; }
finally { db.release(); await pool.end(); }
