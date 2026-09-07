import { NextResponse } from 'next/server';
import { getPgPool } from '../../../../../../server/database/pgClient.js';

export const runtime = 'nodejs';
const duplicateQuery = `
  WITH grupos AS (
    SELECT fecha_operativa, importe
    FROM lineas_bancos
    GROUP BY fecha_operativa, importe
    HAVING COUNT(*) > 1 AND NOT BOOL_AND(duplicado_descartado)
  )
  SELECT json_agg(row_to_json(lb) ORDER BY lb.id_linea_banco) AS lineas
  FROM grupos g
  JOIN lineas_bancos lb USING (fecha_operativa, importe)
  GROUP BY g.fecha_operativa, g.importe
  ORDER BY g.fecha_operativa DESC, g.importe
`;
export async function GET() { const { rows } = await getPgPool().query(duplicateQuery); return NextResponse.json(rows.map(row => row.lineas)); }
export async function POST(request) { try { const body = await request.json(); const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []; if (ids.length < 2) return NextResponse.json({ message: 'Indica las líneas del grupo' }, { status: 400 }); const { rows } = await getPgPool().query(`UPDATE lineas_bancos SET duplicado_descartado=TRUE,updated_at=NOW() WHERE id_linea_banco=ANY($1::text[]) RETURNING id_linea_banco`, [ids]); return NextResponse.json({ confirmadas: rows.map(row => row.id_linea_banco) }); } catch (error) { return NextResponse.json({ message: error.message || 'No se pudo confirmar el grupo' }, { status: 500 }); } }
export async function DELETE(request) {
  try {
    const body = await request.json();
    if (body.id) { const { rows } = await getPgPool().query(`DELETE FROM lineas_bancos WHERE id_linea_banco=$1 RETURNING id_linea_banco`, [body.id]); return NextResponse.json({ eliminadas: rows.map(r => r.id_linea_banco) }); }
    if (body.onePerGroup) {
      const { rows } = await getPgPool().query(`DELETE FROM lineas_bancos lb USING (SELECT fecha_operativa,importe,(array_agg(id_linea_banco ORDER BY id_linea_banco DESC))[1] id FROM lineas_bancos GROUP BY fecha_operativa,importe HAVING COUNT(*)>1 AND NOT BOOL_AND(duplicado_descartado)) d WHERE lb.id_linea_banco=d.id RETURNING lb.id_linea_banco`);
      return NextResponse.json({ eliminadas: rows.map(r => r.id_linea_banco) });
    }
    return NextResponse.json({ message: 'Indica qué duplicado eliminar' }, { status: 400 });
  } catch (error) { return NextResponse.json({ message: error.message || 'No se pudieron eliminar duplicados' }, { status: 500 }); }
}
