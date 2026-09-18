import { getPgPool } from "../../database/pgClient.js";

function numberOrZero(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFacturaCliente(row) {
  return {
    id_factura_cliente: row.id_factura_cliente,
    id_cuenta: row.id_cuenta ?? "",
    cliente: row.nombre_empresa || row.id_cuenta || "",
    base_imponible: numberOrZero(row.base_imponible),
    importe_total: numberOrZero(row.importe_total),
    total_nac_iva: numberOrZero(row.total_nac_iva ?? row.importe_total),
    total_ue: numberOrZero(row.total_ue),
    total_resto: numberOrZero(row.total_resto),
    forma_cobro: row.forma_cobro ?? "",
    fecha_factura: row.fecha_factura ?? "",
    comentarios: row.comentarios ?? "",
  };
}

function normalizeFacturaProveedor(row) {
  return {
    id_factura_proveedor: row.id_factura_proveedor,
    id_proveedor: row.id_proveedor ?? "",
    proveedor: row.nombre_proveedor || row.id_proveedor || "",
    orden_compra_p3: row.orden_compra_p3 ?? "",
    numero_contabilidad: row.numero_contabilidad ?? "",
    codigo_factura: row.codigo_factura || row.id_factura_proveedor || "",
    base_imponible: numberOrZero(row.base_imponible),
    importe_total: numberOrZero(row.importe_total),
    forma_pago: row.forma_pago ?? "",
    estado: row.estado ?? "",
    fecha_factura: row.fecha_factura ?? "",
    comentarios: row.comentarios ?? "",
  };
}

export async function getFacturasClientes() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT f.*, c.nombre_empresa
    FROM administracion_facturas_clientes f
    LEFT JOIN comercial_cuentas c ON c.id_cuenta = f.id_cuenta
    ORDER BY to_date(NULLIF(f.fecha_factura, ''), 'DD/MM/YYYY') DESC NULLS LAST, f.id_factura_cliente ASC
  `);

  return rows.map(normalizeFacturaCliente);
}

export async function getFacturasProveedores() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT f.*, p.nombre_proveedor
    FROM administracion_facturas_proveedores f
    LEFT JOIN administracion_proveedores p ON p.id_proveedor = f.id_proveedor
    ORDER BY to_date(NULLIF(f.fecha_factura, ''), 'DD/MM/YYYY') DESC NULLS LAST, f.id_factura_proveedor ASC
  `);

  return rows.map(normalizeFacturaProveedor);
}

export async function getFacturaProveedorById(idFactura) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      SELECT f.*, p.nombre_proveedor
      FROM administracion_facturas_proveedores f
      LEFT JOIN administracion_proveedores p ON p.id_proveedor = f.id_proveedor
      WHERE f.id_factura_proveedor = $1
      LIMIT 1
    `,
    [idFactura],
  );

  return rows[0] ? normalizeFacturaProveedor(rows[0]) : null;
}

export async function createFacturaProveedor(data = {}) {
  const pool = getPgPool();
  const idFactura = data.id_factura_proveedor || data.orden_compra_p3;
  const baseImponible = nullableNumber(data.base_imponible);
  const importeTotal = nullableNumber(data.importe_total);
  if (baseImponible !== null && importeTotal !== null && baseImponible > importeTotal) {
    throw new Error("Base imponible no puede ser mayor al total");
  }

  const { rows } = await pool.query(
    `
      INSERT INTO administracion_facturas_proveedores (
        id_factura_proveedor,
        id_proveedor,
        orden_compra_p3,
        numero_contabilidad,
        codigo_factura,
        fecha_factura,
        base_imponible,
        importe_total,
        forma_pago,
        estado,
        comentarios
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
    [
      idFactura,
      data.id_proveedor || null,
      data.orden_compra_p3 || idFactura,
      data.numero_contabilidad || "",
      data.codigo_factura || "",
      data.fecha_factura || "",
      baseImponible,
      importeTotal,
      data.forma_pago || "",
      data.estado || "",
      data.comentarios || "",
    ],
  );

  return normalizeFacturaProveedor(rows[0]);
}

export async function createFacturaProveedorCompleta(data = {}) {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const total = nullableNumber(data.importe_total);
    const pagos = Array.isArray(data.pagos) ? data.pagos : [];
    const suma = pagos.reduce((sum, pago) => sum + Number(pago.importe || 0), 0);
    if (!data.id_proveedor || !data.numero_factura_proveedor || !data.fecha_factura || !data.documento_src || total === null) throw new Error("Completa los datos de la factura");
    if (!pagos.length || pagos.some(p => !p.forma || !p.fecha || p.importe === "")) throw new Error("Completa todos los pagos");
    if (Math.abs(suma - total) > 0.005) throw new Error("Los pagos deben cuadrar exactamente con el total");
    const idFactura = `FP-${Date.now()}`;
    const { rows } = await client.query(`
      INSERT INTO administracion_facturas_proveedores (id_factura_proveedor,id_proveedor,numero_factura_proveedor,codigo_factura,fecha_factura,base_imponible,importe_total,forma_pago,estado,comentarios,documento_src)
      VALUES ($1,$2,$3,$3,$4,$5,$6,$7,'registrada',$8,$9) RETURNING *
    `,[idFactura,data.id_proveedor,data.numero_factura_proveedor,data.fecha_factura,nullableNumber(data.base_imponible),total,pagos.map(p=>p.forma).join(", "),data.comentarios||"",data.documento_src]);
    for (let index=0; index<pagos.length; index++) {
      const pago=pagos[index];
      await client.query(`INSERT INTO tesoreria_pagos_previstos (id_pago,id_factura_proveedor,id_proveedor,fecha_pago,total_pago,forma_pago,comentarios,nombre_planificacion,descripcion_planificacion)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[`${idFactura}-P${index+1}`,idFactura,data.id_proveedor,pago.fecha,Number(pago.importe),pago.forma,data.comentarios||"",`Pago ${index+1} · ${data.numero_factura_proveedor}`,data.comentarios||""]);
    }
    await client.query("COMMIT");
    return normalizeFacturaProveedor(rows[0]);
  } catch(error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function updateFacturaProveedor(idFactura, data = {}) {
  const pool = getPgPool();
  const baseImponible = nullableNumber(data.base_imponible);
  const importeTotal = nullableNumber(data.importe_total);
  if (baseImponible !== null && importeTotal !== null && baseImponible > importeTotal) {
    throw new Error("Base imponible no puede ser mayor al total");
  }
  const { rows } = await pool.query(
    `
      UPDATE administracion_facturas_proveedores
      SET id_proveedor = $1,
          orden_compra_p3 = $2,
          numero_contabilidad = $3,
          codigo_factura = $4,
          fecha_factura = $5,
          base_imponible = $6,
          importe_total = $7,
          forma_pago = $8,
          estado = $9,
          comentarios = $10,
          updated_at = NOW()
      WHERE id_factura_proveedor = $11
      RETURNING *
    `,
    [
      data.id_proveedor || null,
      data.orden_compra_p3 || idFactura,
      data.numero_contabilidad || "",
      data.codigo_factura || "",
      data.fecha_factura || "",
      baseImponible,
      importeTotal,
      data.forma_pago || "",
      data.estado || "",
      data.comentarios || "",
      idFactura,
    ],
  );

  return rows[0] ? normalizeFacturaProveedor(rows[0]) : null;
}

export async function deleteFacturaProveedor(idFactura) {
  const pool = getPgPool();
  const { rowCount } = await pool.query(
    `DELETE FROM administracion_facturas_proveedores WHERE id_factura_proveedor = $1`,
    [idFactura],
  );

  return rowCount > 0;
}
