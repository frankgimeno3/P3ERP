import { NextResponse } from 'next/server';
import { readAdministrativeExcel } from '../../../../../../server/features/orden/AdministrativeExcel.js';
import { importAdministrativeOrders } from '../../../../../../server/features/orden/AdministrativeImportRepository.js';
import { requestActor } from '../../../../../../server/features/comentario/AccountActivity.js';
export const runtime='nodejs';
export async function POST(request){
  let action,parsed;
  try{
    const form=await request.formData(),file=form.get('file');action=form.get('action');
    if(!['inspect','preview','import'].includes(action))throw new Error('Acción no válida.');
    if(!file || typeof file.arrayBuffer!=='function' || !/\.(xlsx|xls)$/i.test(file.name) || !file.size || file.size>10*1024*1024)throw new Error('Selecciona un Excel .xlsx o .xls de hasta 10 MB.');
    const mapping=action==='inspect'?undefined:JSON.parse(String(form.get('mapping') || '{}'));
    parsed=readAdministrativeExcel(Buffer.from(await file.arrayBuffer()),mapping);
  }catch(error){return NextResponse.json({message:error.message},{status:400});}
  if(action==='inspect')return NextResponse.json(parsed);
  if(action==='preview')return NextResponse.json({...parsed,rows:parsed.rows.slice(0,20)});
  try{return NextResponse.json(await importAdministrativeOrders(parsed.rows,requestActor(request)));}
  catch(error){console.error('Administrative Excel import failed:',error);return NextResponse.json({message:error.status===409?error.message:'No se ha guardado ninguna orden. Revisa el archivo y vuelve a intentarlo.'},{status:error.status || 500});}
}
