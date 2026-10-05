import {renewSubscription} from '@/server/features/suscripcion/SubscriptionRenewal.js';
import {requestActor} from '@/server/features/comentario/AccountActivity.js';
export async function POST(request,{params}){try{return Response.json(await renewSubscription((await params).id,await request.json(),requestActor(request)));}catch(error){return Response.json({message:error.message},{status:error.status||500});}}
