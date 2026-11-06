import { NextResponse } from 'next/server';
import { getPgPool } from '@/server/database/pgClient.js';
import { getMagazineManagement } from '@/server/features/produccion/GestionesProduccionRepository.js';
import { completeContentIntake } from '@/server/features/produccion/ContentIntakeRepository.js';
import { contentTypes, contentPending, materialType } from '@/app/lib/productionManagement.js';
export const runtime = 'nodejs';
export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams, tipo = params.get('tipo'), revista = params.get('revista');
    let rows;
    if (revista) rows = (await getMagazineManagement(revista))?.contenidos.filter(row => row.tipo === materialType(tipo)) || [];
    else rows = (await getPgPool().query(`SELECT c.*,cu.nombre_empresa,s.nombre_servicio_es AS nombre_servicio FROM produccion_contenidos c LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=c.id_cuenta LEFT JOIN servicios_db s ON s.id_servicio=c.servicio ORDER BY c.created_at DESC,c.id_contenido`)).rows;
    return NextResponse.json(rows.filter(row => contentPending(row) && contentTypes(row).includes(tipo)).map(row => ({ id_contenido: row.id_contenido, nombre_contenido: row.nombre_contenido || row.especificaciones_contenido || row.id_contenido, nombre_cuenta: row.nombre_empresa || row.cliente_hoja || 'Sin empresa', nombre_servicio: row.nombre_servicio || row.tipo_revista_servicio || row.servicio || '', id_contrato: row.id_contrato || '', estado: row.estado_contenido || 'Pendiente de publicar', deadline_contenido: row.deadline_contenido || '' })));
  } catch (error) { return NextResponse.json({ message: error.message || 'No se pudieron cargar los contenidos.' }, { status: 500 }); }
}
export async function POST(request) {
  try { return NextResponse.json(await completeContentIntake(await request.json()), { status: 201 }); }
  catch (error) { return NextResponse.json({ message: error.message || 'No se pudo registrar la subida.' }, { status: error.status || 400 }); }
}
