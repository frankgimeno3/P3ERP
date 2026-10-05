import { entityImportFields,importEntityExcel } from '@/server/features/importacion/EntityExcelImport.js';
export const runtime='nodejs';
export async function GET(){return Response.json(entityImportFields);}
export async function POST(request){try{return Response.json(await importEntityExcel(await request.json()));}catch(error){return Response.json({message:error.message},{status:error.status||500});}}
