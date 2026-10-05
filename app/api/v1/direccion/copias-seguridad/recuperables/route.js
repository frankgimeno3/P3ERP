import {listRecoverableBackups,startRecoverableBackup} from '@/server/features/copiasSeguridad/RecoverableBackup.js';
export const runtime='nodejs';
export async function GET(){try{return Response.json(await listRecoverableBackups());}catch{return Response.json({message:'No se pudo consultar las copias recuperables.'},{status:500});}}
export async function POST(request){try{return Response.json(await startRecoverableBackup((await request.json()).name),{status:202});}catch(error){return Response.json({message:error.message},{status:error.status||500});}}
