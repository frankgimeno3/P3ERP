import Joi from 'joi';
import { getPgPool } from '../../database/pgClient.js';
import { createOrFindSupplier, findSupplier, ProveedorError, realDate, supplierTransaction, validateData } from './SupplierAdminRepository.js';

export async function getTickets(idProveedor = '', ambito = '') {
  if (ambito && !['P3','GM'].includes(ambito)) throw new ProveedorError('Ámbito de tickets no válido.');
  const providerId = idProveedor ? (await findSupplier(idProveedor)).id_proveedor : '';
  const { rows } = await getPgPool().query(`SELECT t.id_ticket,t.fecha_ticket,t.id_proveedor,t.nombre_personalizado_proveedor,
    t.base_imponible,t.importe_total,t.forma_pago,t.documento_src,t.ambito,t.id_tarjeta,t.tarjeta_ultimos_digitos,t.tarjeta_banco,t.tarjeta_nombre,t.tarjeta_tipo,t.archivo_nombre,
    COALESCE(NULLIF(p.nombre_proveedor,''),t.nombre_personalizado_proveedor,'') AS proveedor
    FROM administracion_tickets t LEFT JOIN administracion_proveedores p ON p.id_proveedor=t.id_proveedor
    WHERE ($1='' OR t.id_proveedor=$1) AND ($2='' OR t.ambito=$2)
    ORDER BY to_date(NULLIF(t.fecha_ticket,''),'DD/MM/YYYY') DESC NULLS LAST,t.id_ticket DESC`, [providerId,ambito]);
  return rows.map(row => ({ ...row, pago: row.forma_pago === 'tarjeta' ? `Tarjeta · ${row.tarjeta_nombre} · ${row.tarjeta_banco} · ${row.tarjeta_ultimos_digitos} · ${row.tarjeta_tipo === 'p3' ? 'P3' : 'Personal'}` : row.forma_pago }));
}

async function ticketFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size < 1 || file.size > 15 * 1024 * 1024) throw new ProveedorError('Adjunta un PDF o imagen de hasta 15 MB.');
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = bytes.subarray(0,5).toString() === '%PDF-' ? 'application/pdf' : bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg' : '';
  if (!type) throw new ProveedorError('El archivo debe ser un PDF, JPG o PNG válido.');
  return { bytes,type,name:String(file.name || 'ticket').slice(0,255) };
}
export async function createTicket(body, file) {
  const data = validateData(Joi.object({
    fecha_ticket:realDate(), ambito:Joi.string().valid('P3','GM').default('P3'),
    id_proveedor:Joi.string().max(200).allow('',null).default(null), nuevo_proveedor:Joi.object().optional(),
    base_imponible:Joi.number().precision(2).min(0).allow(null).default(null),importe_total:Joi.number().precision(2).greater(0).max(9999999999.99).required(),
    forma_pago:Joi.string().valid('efectivo','tarjeta').required(),id_tarjeta:Joi.string().max(200).allow('',null).default(null),
    tarjeta_ultimos_digitos:Joi.string().allow('').default(''),tarjeta_banco:Joi.string().trim().max(100).allow('').default(''),
  }),body);
  if (data.ambito === 'P3' && (data.base_imponible === null || data.base_imponible > data.importe_total)) throw new ProveedorError('La base imponible es obligatoria y no puede superar el total.');
  if (!data.id_proveedor && !data.nuevo_proveedor) throw new ProveedorError('Selecciona un proveedor o completa sus datos para registrarlo.');
  const document = await ticketFile(file);
  return supplierTransaction(async db => {
    const provider = data.id_proveedor ? await findSupplier(data.id_proveedor,db) : await createOrFindSupplier(db,data.nuevo_proveedor);
    await db.query('SELECT id_proveedor FROM administracion_proveedores WHERE id_proveedor=$1 FOR KEY SHARE',[provider.id_proveedor]);
    let card = null;
    if (data.forma_pago === 'tarjeta') {
      if (!/^\d{4}$/.test(data.tarjeta_ultimos_digitos) || !data.tarjeta_banco) throw new ProveedorError('Indica los cuatro últimos dígitos y el banco de la tarjeta.');
      const { rows } = await db.query("SELECT * FROM tesoreria_tarjetas WHERE estado='activa' AND ultimos_digitos=$1 AND lower(btrim(banco))=lower(btrim($2)) AND ($3::text IS NULL OR id_tarjeta=$3) FOR SHARE",[data.tarjeta_ultimos_digitos,data.tarjeta_banco,data.id_tarjeta || null]);
      if (rows.length !== 1) throw new ProveedorError(rows.length > 1 ? 'Selecciona la tarjeta concreta del listado.' : 'No hay una tarjeta activa con esos datos. Regístrala desde Tarjetas.');
      card = rows[0];
    }
    const result = await db.query(`INSERT INTO administracion_tickets(fecha_ticket,id_proveedor,nombre_personalizado_proveedor,base_imponible,importe_total,forma_pago,documento_src,ambito,id_tarjeta,tarjeta_ultimos_digitos,tarjeta_banco,tarjeta_nombre,tarjeta_tipo,archivo_nombre,archivo_tipo,archivo_contenido)
      VALUES ($1,$2,'',$3,$4,$5,'',$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id_ticket`,
      [data.fecha_ticket.split('-').reverse().join('/'),provider.id_proveedor,data.ambito === 'GM' ? null : data.base_imponible,data.importe_total,data.forma_pago,data.ambito,card?.id_tarjeta || null,card?.ultimos_digitos || '',card?.banco || '',card?.nombre || '',card?.tipo || '',document.name,document.type,document.bytes]);
    const id = result.rows[0].id_ticket;
    await db.query('UPDATE administracion_tickets SET documento_src=$1 WHERE id_ticket=$2',[`/api/v1/admin/tickets/${id}/archivo`,id]);
    return { id_ticket:id,id_proveedor:provider.id_proveedor,ambito:data.ambito };
  });
}
export async function getTicketFile(id) {
  if (!/^\d+$/.test(String(id))) throw new ProveedorError('Ticket no encontrado.',404);
  const { rows } = await getPgPool().query('SELECT archivo_nombre,archivo_tipo,archivo_contenido FROM administracion_tickets WHERE id_ticket=$1',[id]);
  if (!rows[0]?.archivo_contenido) throw new ProveedorError('Archivo no encontrado.',404);
  return new Response(rows[0].archivo_contenido,{headers:{'Content-Type':rows[0].archivo_tipo,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(rows[0].archivo_nombre).replaceAll("'",'%27')}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':'sandbox'}});
}
