import { NextResponse } from 'next/server';
import { readBulkExcel } from '../../../../../../server/features/orden/BulkExcel.js';
import { bulkImport } from '../../../../../../server/features/orden/BulkImportRepository.js';
import { requestActor } from '../../../../../../server/features/comentario/AccountActivity.js';
export const runtime='nodejs';
export async function POST(request) {
  try {
    const form=await request.formData(),file=form.get('file'),type=String(form.get('type')),action=form.get('action');
    if(!['preview','commit'].includes(action))throw Object.assign(new Error('Acción no válida.'),{status:400});
    if(!file || typeof file.arrayBuffer!=='function' || !/\.(xlsx|xls)$/i.test(file.name) || !file.size || file.size>10*1024*1024)throw Object.assign(new Error('Selecciona un Excel .xlsx o .xls de hasta 10 MB.'),{status:400});
    let rows,choices;
    try{rows=readBulkExcel(Buffer.from(await file.arrayBuffer()),type);choices=JSON.parse(String(form.get('choices') || '{}'));if(!choices || typeof choices!=='object' || Array.isArray(choices))throw new Error('Decisiones no válidas.');if(form.get('quantity')==='one'&&rows.length!==1)throw new Error('Has elegido un registro: el archivo debe contener exactamente una fila.');}catch(error){throw Object.assign(error,{status:400});}
    return NextResponse.json(await bulkImport({type,rows,policy:String(form.get('policy')),choices,token:String(form.get('token') || ''),commit:action==='commit',actorId:requestActor(request)}));
  } catch(error) {return NextResponse.json({message:error.status ? error.message : 'No se ha guardado ningún registro. Revisa las incidencias y vuelve a validar.'},{status:error.status || 500});}
}
