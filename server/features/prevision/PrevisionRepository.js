import { randomUUID } from "node:crypto";
import { getPgPool } from "../../database/pgClient.js";

export async function getIngresosAdicionales(tipo = "") {
  const pool = getPgPool();
  const values = [];
  const where = tipo ? "WHERE ia.tipo_ingreso = $1" : "";
  if (tipo) values.push(tipo === "transfers" ? "transferencia" : "recibo");
  const { rows } = await pool.query(`
    SELECT ia.*, c.nombre_empresa
    FROM ingresos_adicionales_db ia
    LEFT JOIN cuentas_db c ON c.id_cuenta = ia.id_cuenta
    ${where}
    ORDER BY to_date(ia.fecha_teorica, 'DD/MM/YYYY') ASC, ia.created_at ASC
  `, values);
  return rows.map((row) => ({
    id_orden: row.id_ingreso_adicional,
    cliente: row.nombre_empresa || row.cliente_manual || "Sin cliente",
    id_cuenta: row.id_cuenta || "",
    id_contrato: "",
    id_factura: row.asociado_factura ? row.numero_factura : "",
    numero_cobro: "",
    etiqueta_cobro: "Ingreso adicional sin contrato",
    fecha_teorica_cobro: row.fecha_teorica,
    fecha_real_cobro: "",
    forma_cobro: row.forma_cobro,
    banco_cobro: row.banco,
    base_imponible: Number(row.base_imponible),
    cobro_total: Number(row.base_imponible),
    tipo_ingreso: row.tipo_ingreso,
    es_adicional: true,
  }));
}

export async function createIngresoAdicional(data = {}) {
  const pool = getPgPool();
  const id = `ing_ad_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const { rows } = await pool.query(`
    INSERT INTO ingresos_adicionales_db
      (id_ingreso_adicional,id_cuenta,cliente_manual,tipo_ingreso,asociado_factura,numero_factura,fecha_teorica,forma_cobro,banco,base_imponible)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `, [id, data.id_cuenta || null, data.cliente_manual || "", data.tipo_ingreso, Boolean(data.asociado_factura),
    data.asociado_factura ? data.numero_factura : "", data.fecha_teorica, data.forma_cobro, data.banco, Number(data.base_imponible)]);
  return rows[0];
}
