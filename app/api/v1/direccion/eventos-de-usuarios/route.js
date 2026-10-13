import {getUserEvents} from '@/server/features/userEvents/UserEventsRepository.js';
export const dynamic='force-dynamic';
export async function GET(request){try{return Response.json(await getUserEvents(new URL(request.url).searchParams));}catch(e){return Response.json({message:e.status?e.message:'No se pudieron consultar los eventos.'},{status:e.status||500});}}
