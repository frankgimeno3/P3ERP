import {getUserEvent} from '@/server/features/userEvents/UserEventsRepository.js';
export const dynamic='force-dynamic';
export async function GET(request,{params}){try{return Response.json(await getUserEvent((await params).id));}catch(e){return Response.json({message:e.status?e.message:'No se pudo consultar el evento.'},{status:e.status||500});}}
