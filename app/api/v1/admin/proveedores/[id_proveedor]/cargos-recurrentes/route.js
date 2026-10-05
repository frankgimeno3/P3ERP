import { getPgPool } from '@/server/database/pgClient.js';
import { withRuleIds } from '@/server/features/banco/BankReviewAnalysis.js';
import { createRecurringCharge } from '@/server/features/prevision/RecurringChargeRepository.js';
import { findSupplier, adminError } from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime = 'nodejs';
export async function GET(request, { params }) {
  try {
    const supplier = await findSupplier((await params).id_proveedor);
    const { rows } = await getPgPool().query(`SELECT cr.*,p.nombre_proveedor, COALESCE((SELECT jsonb_agg(to_jsonb(v)||jsonb_build_object('fecha',to_char(v.fecha,'YYYY-MM-DD')) ORDER BY v.fecha) FROM tesoreria_cargos_vencimientos v WHERE v.id_cargo_recurrente=cr.id_cargo_recurrente),'[]'::jsonb) vencimientos FROM tesoreria_cargos_recurrentes cr JOIN administracion_proveedores p USING(id_proveedor) WHERE cr.id_proveedor=$1 AND cr.tipo_cargo='proveedor' AND cr.activo=TRUE ORDER BY cr.created_at DESC`, [supplier.id_proveedor]);
    return Response.json(rows.map(withRuleIds));
  } catch (error) { return adminError(error); }
}
export async function POST(request, { params }) {
  try {
    const supplier = await findSupplier((await params).id_proveedor);
    const body = await request.json();
    if (body.tipo_cargo !== 'proveedor' || body.id_agente || body.id_tarjeta) return Response.json({ message: 'Solo se admiten cargos de este proveedor.' }, { status: 400 });
    return Response.json(await createRecurringCharge({ ...body, tipo_cargo: 'proveedor', id_proveedor: supplier.id_proveedor, id_agente: null }), { status: 201 });
  } catch (error) { return adminError(error); }
}
