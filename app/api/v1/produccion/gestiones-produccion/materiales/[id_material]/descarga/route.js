import { NextResponse } from 'next/server';
import { getPgPool } from '@/server/database/pgClient.js';
import { createPresignedDownload,assertObjectExistsInS3 } from '@/server/features/mediateca/S3Service.js';

export const runtime = 'nodejs';

export async function GET(_request, { params }) {
  try {
    const { id_material } = await params;
    const result = await getPgPool().query(`SELECT a.mediateca_s3_key FROM produccion_materiales m
      JOIN mediateca_archivos a ON a.mediateca_content_id::text=m.mediateca_id
      WHERE m.id_material=$1 AND m.eliminado_at IS NULL`, [id_material]);
    if (!result.rows[0]?.mediateca_s3_key) return NextResponse.json({ message: 'Archivo no encontrado' }, { status: 404 });
    return NextResponse.json({ url: await createPresignedDownload(result.rows[0].mediateca_s3_key) });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function POST(request,context){
 try{
 const {id_material}=await context.params;
 const row=(await getPgPool().query('SELECT m.*,a.mediateca_s3_key FROM produccion_materiales m JOIN mediateca_archivos a ON a.mediateca_content_id::text=m.mediateca_id WHERE m.id_material=$1 AND m.eliminado_at IS NULL',[id_material])).rows[0];
 if(!row?.mediateca_s3_key)return NextResponse.json({message:'Archivo no encontrado'},{status:404});
 await assertObjectExistsInS3(row.mediateca_s3_key);const url=await createPresignedDownload(row.mediateca_s3_key);
 await getPgPool().query('UPDATE produccion_materiales SET descargado_produccion=true,updated_at=clock_timestamp() WHERE id_material=$1 AND NOT descargado_produccion',[id_material]);
 return NextResponse.json({url});
 }catch(error){return NextResponse.json({message:error.message},{status:400});}
}
