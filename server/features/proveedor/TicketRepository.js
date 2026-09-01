import { getPgPool } from "../../database/pgClient.js";

export async function getTickets(idProveedor = "") {
  const values = idProveedor ? [idProveedor] : [];
  const { rows } = await getPgPool().query(`
    SELECT t.*, p.nombre_proveedor
    FROM tickets_db t
    LEFT JOIN proveedores_db p ON p.id_proveedor = t.id_proveedor
    ${idProveedor ? "WHERE t.id_proveedor = $1" : ""}
    ORDER BY to_date(NULLIF(t.fecha_ticket,''),'DD/MM/YYYY') DESC NULLS LAST, t.id_ticket DESC
  `, values);
  return rows.map(row => ({...row, proveedor: row.nombre_proveedor || row.nombre_personalizado_proveedor}));
}

export async function createTicket(data) {
  const { rows } = await getPgPool().query(`
    INSERT INTO tickets_db (fecha_ticket,id_proveedor,nombre_personalizado_proveedor,base_imponible,importe_total,forma_pago,documento_src)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
  `, [data.fecha_ticket, data.id_proveedor || null, data.id_proveedor ? "" : data.nombre_personalizado_proveedor, data.base_imponible, data.importe_total, data.forma_pago, data.documento_src]);
  return rows[0];
}
