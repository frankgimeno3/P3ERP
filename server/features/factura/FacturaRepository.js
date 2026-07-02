import { getPgPool } from "../../database/pgClient.js";

function numberOrZero(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function normalizeFacturaCliente(row) {
  return {
    id_factura_cliente: row.id_factura_cliente,
    id_cuenta: row.id_cuenta ?? "",
    cliente: row.nombre_empresa || row.id_cuenta || "",
    base_imponible: numberOrZero(row.base_imponible),
    importe_total: numberOrZero(row.importe_total),
    fecha_factura: row.fecha_factura ?? "",
    comentarios: row.comentarios ?? "",
  };
}

function normalizeFacturaProveedor(row) {
  return {
    id_factura_proveedor: row.id_factura_proveedor,
    id_proveedor: row.id_proveedor ?? "",
    proveedor: row.nombre_proveedor || row.id_proveedor || "",
    base_imponible: numberOrZero(row.base_imponible),
    importe_total: numberOrZero(row.importe_total),
    fecha_factura: row.fecha_factura ?? "",
    comentarios: row.comentarios ?? "",
  };
}

export async function getFacturasClientes() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT f.*, c.nombre_empresa
    FROM facturas_clientes_db f
    LEFT JOIN cuentas_db c ON c.id_cuenta = f.id_cuenta
    ORDER BY to_date(NULLIF(f.fecha_factura, ''), 'DD/MM/YYYY') DESC NULLS LAST, f.id_factura_cliente ASC
  `);

  return rows.map(normalizeFacturaCliente);
}

export async function getFacturasProveedores() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT f.*, p.nombre_proveedor
    FROM facturas_proveedores_db f
    LEFT JOIN proveedores_db p ON p.id_proveedor = f.id_proveedor
    ORDER BY to_date(NULLIF(f.fecha_factura, ''), 'DD/MM/YYYY') DESC NULLS LAST, f.id_factura_proveedor ASC
  `);

  return rows.map(normalizeFacturaProveedor);
}
