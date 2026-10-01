import { NextResponse } from 'next/server';
import { getPgPool } from '@/server/database/pgClient.js';
import { createPresignedDownload } from '@/server/features/mediateca/S3Service.js';

export const runtime = 'nodejs';

export async function GET(_request, { params }) {
  try {
    const { id_material } = await params;
    const result = await getPgPool().query(`SELECT a.mediateca_s3_key FROM produccion_materiales m
      JOIN mediateca_archivos a ON a.mediateca_content_id=m.mediateca_id
      WHERE m.id_material=$1`, [id_material]);
    if (!result.rows[0]?.mediateca_s3_key) return NextResponse.json({ message: 'Archivo no encontrado' }, { status: 404 });
    return NextResponse.json({ url: await createPresignedDownload(result.rows[0].mediateca_s3_key) });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
