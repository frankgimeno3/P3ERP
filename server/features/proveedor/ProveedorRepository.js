import { getPgPool } from "../../database/pgClient.js";

function numberOrZero(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function normalizeProveedor(row) {
  return {
    id_proveedor: row.id_proveedor,
    nombre_proveedor: row.nombre_proveedor ?? "",
    nombre_fiscal_proveedor: row.nombre_fiscal_proveedor ?? "",
    vat_code: row.vat_code ?? "",
    pais_proveedor: row.pais_proveedor ?? "",
    moneda_proveedor: row.moneda_proveedor ?? "",
    numero_pagos: Number(row.numero_pagos ?? 0),
    total_pagos: numberOrZero(row.total_pagos),
    ultimo_pago: row.ultimo_pago ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizePago(row) {
  return {
    id_pago: row.id_pago,
    fecha_pago: row.fecha_pago ?? "",
    bi_pago: numberOrZero(row.bi_pago),
    total_pago: numberOrZero(row.total_pago),
    forma_pago: row.forma_pago ?? "",
    cuenta_pago: row.cuenta_pago ?? "",
    id_proveedor: row.id_proveedor ?? "",
    proveedor: row.nombre_proveedor || row.id_proveedor || "",
    nombre_planificacion: row.nombre_planificacion ?? "",
    descripcion_planificacion: row.descripcion_planificacion ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getProveedores() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT
      p.*,
      COUNT(pg.id_pago) AS numero_pagos,
      COALESCE(SUM(pg.total_pago), 0) AS total_pagos,
      MAX(pg.fecha_pago) AS ultimo_pago
    FROM proveedores_db p
    LEFT JOIN pagos_db pg ON pg.id_proveedor = p.id_proveedor
    GROUP BY p.id_proveedor
    ORDER BY p.nombre_proveedor ASC, p.id_proveedor ASC
  `);

  return rows.map(normalizeProveedor);
}

export async function getPagosProveedores() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT pg.*, p.nombre_proveedor
    FROM pagos_db pg
    LEFT JOIN proveedores_db p ON p.id_proveedor = pg.id_proveedor
    ORDER BY to_date(NULLIF(pg.fecha_pago, ''), 'DD/MM/YYYY') DESC NULLS LAST, pg.id_pago ASC
  `);

  return rows.map(normalizePago);
}
