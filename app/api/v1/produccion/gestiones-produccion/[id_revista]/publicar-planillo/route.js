import {publishFlatplan} from '@/server/features/produccion/FlatplanPublication.js';
export const runtime='nodejs';
export async function POST(request,{params}){try{const body=await request.json();return Response.json(await publishFlatplan((await params).id_revista,body.version,body.confirm===true));}catch(error){return Response.json({message:error.message},{status:error.status||500});}}
